import { GitCommit, TimelineViewMode, VisualTheme } from '../types';
import { THEMES } from './themes';
import { GitGraphBounds } from './gitLayout';
import { renderCanvasToGif } from './gifExport';

export interface ExportConfig {
  format: 'gif' | 'mp4';
  width: number;
  height: number;
  fps: number;
  viewMode: TimelineViewMode;
  theme: VisualTheme;
  commits: GitCommit[];
  bounds: GitGraphBounds;
  repoName: string;
}

// Helper to strictly truncate text with ellipsis within pixel width
function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (!text || maxWidth <= 0) return '';
  const firstLine = text.split('\n')[0].trim();
  if (ctx.measureText(firstLine).width <= maxWidth) {
    return firstLine;
  }
  const ellipsis = '...';
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  if (ellipsisWidth >= maxWidth) {
    return ellipsis;
  }
  const targetWidth = maxWidth - ellipsisWidth;
  let low = 0;
  let high = firstLine.length;
  let bestFit = '';

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sub = firstLine.substring(0, mid);
    if (ctx.measureText(sub).width <= targetWidth) {
      bestFit = sub;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestFit.trimEnd() + ellipsis;
}

/**
 * Offscreen rendering of an individual frame into an HTML5 Canvas.
 */
export function renderTimelineFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  commits: GitCommit[],
  bounds: GitGraphBounds,
  progressIndex: number,
  viewMode: TimelineViewMode,
  themeKey: VisualTheme,
  frameTimeSec: number
) {
  const theme = THEMES[themeKey];

  // 1. Draw Background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  // Background glow / nebula
  if (theme.starfield) {
    const grad1 = ctx.createRadialGradient(
      width * 0.3,
      height * 0.3,
      10,
      width * 0.3,
      height * 0.3,
      width * 0.6
    );
    grad1.addColorStop(0, 'rgba(79, 70, 229, 0.16)');
    grad1.addColorStop(1, 'rgba(5, 7, 20, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width, height);

    const grad2 = ctx.createRadialGradient(
      width * 0.75,
      height * 0.7,
      10,
      width * 0.75,
      height * 0.7,
      width * 0.5
    );
    grad2.addColorStop(0, 'rgba(236, 72, 153, 0.14)');
    grad2.addColorStop(1, 'rgba(5, 7, 20, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);
  }

  // Calculate camera for frame
  let camX = 0;
  let camY = 0;
  let camZoom = 1;

  const activeIndex = Math.max(0, Math.min(commits.length - 1, Math.floor(progressIndex)));
  const activeCommit = commits[activeIndex];

  if (viewMode === 'follow') {
    const clampedIdx = Math.max(0, Math.min(commits.length - 1, progressIndex));
    const baseIdx = Math.floor(clampedIdx);
    const nextIdx = Math.min(commits.length - 1, baseIdx + 1);
    const fract = clampedIdx - baseIdx;

    const c0 = commits[baseIdx];
    const c1 = commits[nextIdx];
    const continuousX = c0 ? c0.x + (c1.x - c0.x) * fract : 0;

    const treeCenterY = (bounds.minY + bounds.maxY) / 2;
    const targetWorldY = treeCenterY * 0.78 + (c0 ? c0.y : treeCenterY) * 0.22;

    camZoom = 1.15;
    camX = width * 0.38 - continuousX * camZoom;
    camY = height * 0.48 - targetWorldY * camZoom;
  } else {
    // Overview mode: Dynamically fit entire timeline within export frame
    const paddingX = Math.max(50, width * 0.08);
    const paddingY = Math.max(50, height * 0.12);

    const graphWidth = Math.max(200, bounds.maxX - bounds.minX + 80);
    const graphHeight = Math.max(160, bounds.maxY - bounds.minY + 60);

    const availableW = Math.max(100, width - paddingX * 2);
    const availableH = Math.max(100, height - paddingY * 2);

    const fitZoomX = availableW / graphWidth;
    const fitZoomY = availableH / graphHeight;
    const fitAllZoom = Math.min(fitZoomX, fitZoomY);

    camZoom = fitAllZoom;
    let targetCenterX = (bounds.minX + bounds.maxX) / 2;
    const targetCenterY = (bounds.minY + bounds.maxY) / 2;

    if (fitZoomX < 0.22 && commits.length > 120) {
      camZoom = Math.max(fitZoomX, Math.min(0.48, fitZoomY * 0.85));
      const clampedIdx = Math.max(0, Math.min(commits.length - 1, progressIndex));
      const progressRatio = clampedIdx / Math.max(1, commits.length - 1);
      targetCenterX = bounds.minX + (bounds.maxX - bounds.minX) * progressRatio;
    }

    camX = width / 2 - targetCenterX * camZoom;
    camY = height / 2 - targetCenterY * camZoom;
  }

  // Draw World Transform
  ctx.save();
  ctx.translate(camX, camY);
  ctx.scale(camZoom, camZoom);

  // Draw Grid
  ctx.save();
  ctx.strokeStyle = theme.gridColor;
  ctx.lineWidth = 1;
  const gridSize = camZoom < 0.25 ? Math.max(120, Math.round(50 / camZoom)) : 120;
  for (let x = bounds.minX - 300; x <= bounds.maxX + 300; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, bounds.minY - 300);
    ctx.lineTo(x, bounds.maxY + 300);
    ctx.stroke();
  }
  for (let y = bounds.minY - 300; y <= bounds.maxY + 300; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(bounds.minX - 300, y);
    ctx.lineTo(bounds.maxX + 300, y);
    ctx.stroke();
  }
  ctx.restore();

  const shaMap = new Map<string, GitCommit>();
  commits.forEach((c) => shaMap.set(c.sha, c));

  const integerCount = Math.floor(progressIndex);

  // Draw Branch & Merge Lines
  for (let i = 0; i <= integerCount && i < commits.length; i++) {
    const child = commits[i];
    if (!child.parents || child.parents.length === 0) continue;

    child.parents.forEach((pSha, pIdx) => {
      const parent = shaMap.get(pSha);
      if (!parent) return;

      const isMergeLine = pIdx > 0;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);

      if (parent.lane === child.lane) {
        ctx.lineTo(child.x, child.y);
      } else {
        const dx = child.x - parent.x;
        ctx.bezierCurveTo(
          parent.x + dx * 0.55,
          parent.y,
          parent.x + dx * 0.45,
          child.y,
          child.x,
          child.y
        );
      }

      const minScreenLineWidth = isMergeLine ? 2.5 : 1.5;
      ctx.lineWidth = Math.max(minScreenLineWidth / Math.max(0.0001, camZoom), isMergeLine ? 3.5 : 2.5);

      if (isMergeLine) {
        ctx.strokeStyle = theme.mergeGlow;
        if (camZoom > 0.25) {
          ctx.shadowColor = theme.mergeGlow;
          ctx.shadowBlur = 10;
        }
      } else {
        ctx.strokeStyle = parent.color;
        if (camZoom > 0.25) {
          ctx.shadowColor = parent.color;
          ctx.shadowBlur = 4;
        }
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  // Draw Nodes
  for (let i = 0; i <= integerCount && i < commits.length; i++) {
    const commit = commits[i];
    const isLatest = i === integerCount;

    const minScreenRadius = isLatest ? 4.5 : 2.5;
    const effectiveRadius = Math.max(commit.radius, minScreenRadius / Math.max(0.0001, camZoom));

    ctx.save();
    // Halo
    if (isLatest || (commit.isMerge && camZoom > 0.2)) {
      ctx.beginPath();
      ctx.arc(commit.x, commit.y, effectiveRadius + (commit.isMerge ? 6 : 4), 0, Math.PI * 2);
      ctx.fillStyle = commit.isMerge ? theme.mergeGlow : commit.color;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Merge outer ring
    if (commit.isMerge && camZoom > 0.25) {
      ctx.beginPath();
      ctx.arc(commit.x, commit.y, effectiveRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, 1.5 / camZoom);
      ctx.shadowColor = theme.mergeGlow;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    // Core circle
    ctx.beginPath();
    ctx.arc(commit.x, commit.y, effectiveRadius, 0, Math.PI * 2);
    ctx.fillStyle = commit.color;
    if (camZoom > 0.25) {
      ctx.shadowColor = commit.color;
      ctx.shadowBlur = isLatest ? 14 : 5;
    }
    ctx.fill();

    // Center dot
    if (effectiveRadius * camZoom >= 3.5) {
      ctx.beginPath();
      ctx.arc(commit.x, commit.y, Math.max(1.5, effectiveRadius * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Hash text
    if (camZoom >= 0.35 || isLatest) {
      ctx.fillStyle = theme.textMuted;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(commit.shortSha, commit.x, commit.y + effectiveRadius + 15);
    }

    ctx.restore();
  }

  ctx.restore(); // Restore world camera

  // Draw Overlay HUD in Follow Mode
  if (viewMode === 'follow' && activeCommit) {
    ctx.save();
    const cardW = Math.min(540, width - 40);
    const cardH = 80;
    const cardX = (width - cardW) / 2;
    const cardY = height - cardH - 24;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = activeCommit.isMerge ? theme.mergeGlow : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;

    // Background card
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    // Author circle
    ctx.fillStyle = activeCommit.color;
    ctx.beginPath();
    ctx.arc(cardX + 32, cardY + 34, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText((activeCommit.author.name[0] || 'G').toUpperCase(), cardX + 32, cardY + 39);

    // Message & Metadata boundary calculations
    const isCompact = cardW < 460;
    const mergeChipWidth = isCompact ? 84 : 110;
    const chipX = cardX + cardW - mergeChipWidth - 14;

    const msgStartX = cardX + 58;
    const maxMsgWidth = Math.max(
      50,
      activeCommit.isMerge ? chipX - 12 - msgStartX : cardX + cardW - 18 - msgStartX
    );

    // Message strictly truncated with ellipsis
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    const msg = truncateTextToWidth(ctx, activeCommit.message, maxMsgWidth);

    ctx.save();
    ctx.beginPath();
    ctx.rect(msgStartX, cardY + 12, maxMsgWidth + 2, 22);
    ctx.clip();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, msgStartX, cardY + 26);
    ctx.restore();

    // Meta details strictly truncated
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    const dateStr = new Date(activeCommit.author.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const maxMetaWidth = Math.max(50, cardW - 80);
    const metaStr = truncateTextToWidth(ctx, `${activeCommit.author.name} • ${dateStr}`, maxMetaWidth);

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(metaStr, cardX + 58, cardY + 47);

    // Hash + stats
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`SHA: ${activeCommit.shortSha}`, cardX + 58, cardY + 66);

    if (activeCommit.stats) {
      ctx.fillStyle = '#4ade80';
      ctx.fillText(`+${activeCommit.stats.additions}`, cardX + 160, cardY + 66);
      ctx.fillStyle = '#f87171';
      ctx.fillText(`-${activeCommit.stats.deletions}`, cardX + 210, cardY + 66);
    }

    if (activeCommit.isMerge) {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
      ctx.beginPath();
      ctx.roundRect(chipX, cardY + 15, mergeChipWidth, 22, 6);
      ctx.fill();
      ctx.strokeStyle = theme.mergeGlow;
      ctx.stroke();

      ctx.fillStyle = '#f472b6';
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chipLabel = isCompact ? '🔀 MERGE' : '🔀 MULTIVERSE MERGE';
      ctx.fillText(chipLabel, chipX + mergeChipWidth / 2, cardY + 26);
    }

    ctx.restore();
  }

  // Watermark Brand in bottom corner
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('GitMultiverse Timeline', width - 20, 24);
  ctx.restore();
}

/**
 * Exports animation as an optimized GIF using gifenc.
 */
export async function exportAsGif(
  config: ExportConfig,
  onProgress: (percent: number, current: number, total: number) => void
): Promise<Blob> {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = config.width;
  offscreenCanvas.height = config.height;
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create offscreen canvas context');

  // Calculate total frames: e.g. 50-80 frames to keep GIF snappy and lightweight
  const totalFrames = Math.min(90, Math.max(30, Math.round(config.commits.length * 1.8)));
  const totalCommits = config.commits.length;

  return renderCanvasToGif(
    offscreenCanvas,
    totalFrames,
    (frameIndex) => {
      const progressFraction = frameIndex / (totalFrames - 1);
      const commitProgress = progressFraction * (totalCommits - 1);
      renderTimelineFrameToCanvas(
        ctx,
        config.width,
        config.height,
        config.commits,
        config.bounds,
        commitProgress,
        config.viewMode,
        config.theme,
        frameIndex / config.fps
      );
    },
    config.fps,
    onProgress
  );
}

/**
 * Exports animation as an MP4/WebM video using MediaRecorder and offscreen canvas.
 */
export async function exportAsVideo(
  config: ExportConfig,
  onProgress: (percent: number, current: number, total: number) => void
): Promise<{ blob: Blob; mimeType: string }> {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = config.width;
  offscreenCanvas.height = config.height;
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create offscreen canvas context');

  // Detect supported video mime types: prefer mp4 if browser supports it, otherwise webm
  let mimeType = 'video/mp4';
  if (!MediaRecorder.isTypeSupported('video/mp4')) {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else {
      mimeType = 'video/webm';
    }
  }

  const stream = offscreenCanvas.captureStream(config.fps);
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4000000, // 4 Mbps high quality
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve({ blob: finalBlob, mimeType });
    };

    mediaRecorder.onerror = (err) => {
      reject(err);
    };

    mediaRecorder.start();

    // Render frame sequence
    const durationSeconds = Math.max(4, Math.min(15, config.commits.length * 0.35));
    const totalFrames = Math.round(durationSeconds * config.fps);
    let currentFrame = 0;

    const frameInterval = 1000 / config.fps;

    const renderNextFrame = () => {
      if (currentFrame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const progressFraction = currentFrame / (totalFrames - 1);
      const commitProgress = progressFraction * (config.commits.length - 1);

      renderTimelineFrameToCanvas(
        ctx,
        config.width,
        config.height,
        config.commits,
        config.bounds,
        commitProgress,
        config.viewMode,
        config.theme,
        currentFrame / config.fps
      );

      currentFrame++;
      const percent = Math.round((currentFrame / totalFrames) * 100);
      onProgress(percent, currentFrame, totalFrames);

      setTimeout(renderNextFrame, frameInterval / 2); // fast render pipeline
    };

    renderNextFrame();
  });
}
