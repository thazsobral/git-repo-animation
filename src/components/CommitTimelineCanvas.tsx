import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Crosshair } from 'lucide-react';
import { GitCommit, TimelineViewMode, VisualTheme } from '../types';
import { THEMES } from '../utils/themes';
import { GitGraphBounds } from '../utils/gitLayout';

interface CommitTimelineCanvasProps {
  commits: GitCommit[];
  bounds: GitGraphBounds;
  currentIndex: number; // progress: 0 to commits.length - 1 (supports fractional)
  viewMode: TimelineViewMode;
  theme: VisualTheme;
  selectedCommit: GitCommit | null;
  onSelectCommit: (commit: GitCommit | null) => void;
  onHoverCommit?: (commit: GitCommit | null, screenPos?: { x: number; y: number }) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  interactive?: boolean;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

export const CommitTimelineCanvas: React.FC<CommitTimelineCanvasProps> = ({
  commits,
  bounds,
  currentIndex,
  viewMode,
  theme,
  selectedCommit,
  onSelectCommit,
  onHoverCommit,
  canvasRef: externalCanvasRef,
  interactive = true,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const cameraRef = useRef<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
    targetX: 0,
    targetY: 0,
    targetZoom: 1,
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isUserInteractingRef = useRef(false);
  const isInitialCameraSetRef = useRef(false);
  const [hasUserPan, setHasUserPan] = useState(false);
  const [hoveredCommitState, setHoveredCommitState] = useState<GitCommit | null>(null);

  // Keep latest props in refs for continuous, stutter-free 60fps render loop
  const commitsRef = useRef(commits);
  commitsRef.current = commits;

  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  const selectedCommitRef = useRef(selectedCommit);
  selectedCommitRef.current = selectedCommit;

  const hoveredCommitRef = useRef(hoveredCommitState);
  hoveredCommitRef.current = hoveredCommitState;

  // Memoized sha-to-commit map to avoid recreation 60 times a second
  const shaMap = useMemo(() => {
    const map = new Map<string, GitCommit>();
    commits.forEach((c) => map.set(c.sha, c));
    return map;
  }, [commits]);
  const shaMapRef = useRef(shaMap);
  shaMapRef.current = shaMap;

  // Reset camera auto-centering when repository or viewMode changes
  useEffect(() => {
    isInitialCameraSetRef.current = false;
    isUserInteractingRef.current = false;
    setHasUserPan(false);
  }, [commits]);

  useEffect(() => {
    isUserInteractingRef.current = false;
    setHasUserPan(false);
  }, [viewMode]);

  // Recenter button action
  const handleRecenter = useCallback(() => {
    isUserInteractingRef.current = false;
    setHasUserPan(false);
  }, []);

  // Stardust background particles
  const starsRef = useRef<Array<{ x: number; y: number; size: number; alpha: number; speed: number }>>([]);

  // Initialize stars once
  useEffect(() => {
    const stars: Array<{ x: number; y: number; size: number; alpha: number; speed: number }> = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * 3000 - 500,
        y: Math.random() * 2000 - 500,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.02 + 0.005,
      });
    }
    starsRef.current = stars;
  }, []);

  // Main Canvas Render Loop (Persistent & Stutter-free)
  useEffect(() => {
    let animationFrameId: number;
    let pulseAngle = 0;
    let lastFrameTime = performance.now();

    const render = (now: number) => {
      pulseAngle += 0.04;
      const dt = Math.min(0.08, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;

      const currentCanvas = externalCanvasRef?.current || internalCanvasRef.current;
      if (!currentCanvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = currentCanvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = currentCanvas.clientWidth;
      const displayHeight = currentCanvas.clientHeight;

      if (displayWidth === 0 || displayHeight === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Handle retina resizing
      if (currentCanvas.width !== displayWidth * dpr || currentCanvas.height !== displayHeight * dpr) {
        currentCanvas.width = displayWidth * dpr;
        currentCanvas.height = displayHeight * dpr;
      }

      const cam = cameraRef.current;
      const currentCommits = commitsRef.current;
      const currentBounds = boundsRef.current;
      const currentIdx = currentIndexRef.current;
      const currentMode = viewModeRef.current;
      const currentTheme = themeRef.current;
      const currentSelected = selectedCommitRef.current;
      const currentHovered = hoveredCommitRef.current;
      const currentShaMap = shaMapRef.current;

      // Dynamically calculate camera target when not manually dragging or panning
      if (!isDraggingRef.current && !isUserInteractingRef.current && currentCommits.length > 0) {
        if (currentMode === 'follow') {
          // 1. Fluid continuous interpolation between commits based on float currentIdx
          const clampedIdx = Math.max(0, Math.min(currentCommits.length - 1, currentIdx));
          const baseIdx = Math.floor(clampedIdx);
          const nextIdx = Math.min(currentCommits.length - 1, baseIdx + 1);
          const fract = clampedIdx - baseIdx;

          const c0 = currentCommits[baseIdx];
          const c1 = currentCommits[nextIdx];

          // Continuous horizontal focus without stepped stutter
          const continuousX = c0 ? c0.x + (c1.x - c0.x) * fract : 0;

          // Stable vertical framing: anchored to the tree's vertical midline
          // with gentle organic follow (prevents roller-coaster bouncing between branch lanes)
          const treeCenterY = (currentBounds.minY + currentBounds.maxY) / 2;
          const targetWorldY = treeCenterY * 0.78 + (c0 ? c0.y : treeCenterY) * 0.22;

          // Comfortable, readable zoom that shows parallel branches and merge conduits
          const targetZoom = 1.15;

          // Place the active commit at 38% of display width for generous forward runway
          cam.targetX = displayWidth * 0.38 - continuousX * targetZoom;
          cam.targetY = displayHeight * 0.48 - targetWorldY * targetZoom;
          cam.targetZoom = targetZoom;
        } else {
          // 2. Cenário Total (Overview / Multiverse) Framing
          const paddingX = Math.max(50, displayWidth * 0.08);
          const paddingY = Math.max(50, displayHeight * 0.12);

          const graphWidth = Math.max(200, currentBounds.maxX - currentBounds.minX + 80);
          const graphHeight = Math.max(160, currentBounds.maxY - currentBounds.minY + 60);

          const availableW = Math.max(100, displayWidth - paddingX * 2);
          const availableH = Math.max(100, displayHeight - paddingY * 2);

          const fitZoomX = availableW / graphWidth;
          const fitZoomY = availableH / graphHeight;
          const fitAllZoom = Math.min(fitZoomX, fitZoomY);

          let targetZoom = fitAllZoom;
          let targetCenterX = (currentBounds.minX + currentBounds.maxX) / 2;
          const targetCenterY = (currentBounds.minY + currentBounds.maxY) / 2;

          // If repo has many commits (ultra-wide ribbon), avoid squashing tree into a 10px unreadable sliver.
          // Maintain a balanced widescreen panoramic zoom and glide smoothly with timeline progress.
          if (fitZoomX < 0.22 && currentCommits.length > 120) {
            targetZoom = Math.max(fitZoomX, Math.min(0.48, fitZoomY * 0.85));
            const clampedIdx = Math.max(0, Math.min(currentCommits.length - 1, currentIdx));
            const progressRatio = clampedIdx / Math.max(1, currentCommits.length - 1);
            targetCenterX = currentBounds.minX + (currentBounds.maxX - currentBounds.minX) * progressRatio;
          }

          cam.targetX = displayWidth / 2 - targetCenterX * targetZoom;
          cam.targetY = displayHeight / 2 - targetCenterY * targetZoom;
          cam.targetZoom = Math.max(0.005, targetZoom);
        }

        // Snap instantly on first frame or repo load so there's no jarring fly-in from (0,0)
        if (!isInitialCameraSetRef.current) {
          cam.x = cam.targetX;
          cam.y = cam.targetY;
          cam.zoom = cam.targetZoom;
          isInitialCameraSetRef.current = true;
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Smooth frame-rate independent camera physics (critical damping)
      const smoothSpeed = currentMode === 'follow' ? 9.5 : 7.0;
      const smoothFactor = 1 - Math.exp(-smoothSpeed * dt);
      cam.x += (cam.targetX - cam.x) * smoothFactor;
      cam.y += (cam.targetY - cam.y) * smoothFactor;

      // Logarithmic zoom interpolation for optical perfection
      const logCamZoom = Math.log(Math.max(0.0001, cam.zoom));
      const logTargetZoom = Math.log(Math.max(0.0001, cam.targetZoom));
      cam.zoom = Math.exp(logCamZoom + (logTargetZoom - logCamZoom) * smoothFactor);

      const themeConfig = THEMES[currentTheme];

      // 1. Draw Background
      ctx.fillStyle = themeConfig.bg;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Cosmic / Starfield atmosphere
      if (themeConfig.starfield) {
        // Deep nebula radial glows
        const grad1 = ctx.createRadialGradient(
          displayWidth * 0.25,
          displayHeight * 0.3,
          20,
          displayWidth * 0.25,
          displayHeight * 0.3,
          displayWidth * 0.6
        );
        grad1.addColorStop(0, 'rgba(79, 70, 229, 0.12)');
        grad1.addColorStop(1, 'rgba(5, 7, 20, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        const grad2 = ctx.createRadialGradient(
          displayWidth * 0.8,
          displayHeight * 0.7,
          30,
          displayWidth * 0.8,
          displayHeight * 0.7,
          displayWidth * 0.5
        );
        grad2.addColorStop(0, 'rgba(236, 72, 153, 0.1)');
        grad2.addColorStop(1, 'rgba(5, 7, 20, 0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Twinkling stars
        ctx.save();
        starsRef.current.forEach((star) => {
          const dynamicAlpha = star.alpha * (0.6 + 0.4 * Math.sin(pulseAngle * 1.5 + star.x));
          ctx.fillStyle = `rgba(255, 255, 255, ${dynamicAlpha})`;
          ctx.beginPath();
          ctx.arc(star.x * 0.5 + cam.x * 0.1, star.y * 0.5 + cam.y * 0.1, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 2. Camera Transform Matrix
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // Background grid lines in world-space
      drawWorldGrid(ctx, cam, displayWidth, displayHeight, themeConfig.gridColor);

      const visibleCommitsCount = Math.min(currentCommits.length, currentIdx + 1);
      const integerCount = Math.floor(visibleCommitsCount);
      const partialFraction = visibleCommitsCount - integerCount;

      // Viewport bounds in world space for culling in follow mode
      const isFollow = currentMode === 'follow';
      const viewMinX = -cam.x / cam.zoom - 200;
      const viewMaxX = (displayWidth - cam.x) / cam.zoom + 200;

      // 3. Draw Connections (Branches & Merges)
      for (let i = 0; i < integerCount && i < currentCommits.length; i++) {
        const child = currentCommits[i];
        if (!child.parents || child.parents.length === 0) continue;

        child.parents.forEach((pSha, pIndex) => {
          const parent = currentShaMap.get(pSha);
          if (!parent) return;

          if (isFollow) {
            const minX = Math.min(child.x, parent.x);
            const maxX = Math.max(child.x, parent.x);
            if (maxX < viewMinX || minX > viewMaxX) return;
          }

          const isSecondaryMergeLine = pIndex > 0;
          drawGitConnection(ctx, parent, child, isSecondaryMergeLine, themeConfig, pulseAngle, cam.zoom);
        });
      }

      // Draw active connection in progress if interpolating to next commit
      if (integerCount < currentCommits.length && partialFraction > 0) {
        const nextChild = currentCommits[integerCount];
        nextChild.parents.forEach((pSha, pIndex) => {
          const parent = currentShaMap.get(pSha);
          if (!parent) return;
          const isSecondaryMergeLine = pIndex > 0;
          drawPartialConnection(
            ctx,
            parent,
            nextChild,
            partialFraction,
            isSecondaryMergeLine,
            themeConfig
          );
        });
      }

      // 4. Draw Commit Nodes
      for (let i = 0; i < integerCount && i < currentCommits.length; i++) {
        const commit = currentCommits[i];
        if (isFollow && (commit.x < viewMinX || commit.x > viewMaxX)) continue;

        const isLatest = i === integerCount - 1 && partialFraction === 0;
        const isSelected = currentSelected?.sha === commit.sha;
        const isHovered = currentHovered?.sha === commit.sha;

        drawCommitNode(ctx, commit, isLatest, isSelected, isHovered, themeConfig, pulseAngle, cam.zoom);
      }

      // Draw partial spawning commit node
      if (integerCount < currentCommits.length && partialFraction > 0) {
        const spawningCommit = currentCommits[integerCount];
        drawSpawningCommitNode(ctx, spawningCommit, partialFraction, themeConfig);
      }

      ctx.restore(); // Restore world camera transform

      // 5. Draw View Mode HUD / Telemetry Overlays
      const activeIdxClamped = Math.max(0, Math.min(currentCommits.length - 1, Math.floor(currentIdx)));
      const activeCommit = currentCommits[activeIdxClamped];
      if (activeCommit) {
        if (currentMode === 'follow') {
          drawFollowCameraHUD(ctx, activeCommit, displayWidth, displayHeight, themeConfig);
        } else {
          drawOverviewHUD(ctx, activeCommit, displayWidth, displayHeight, themeConfig);
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [externalCanvasRef]);

  // Helper: Get dynamic commit color based on the current visual theme
  const getCommitThemeColor = (commit: GitCommit, themeConfig: any): string => {
    if (commit.lane === 0) {
      return themeConfig.mainLaneColor || '#38bdf8';
    }
    const branchColors = themeConfig.branchColors;
    if (branchColors && branchColors.length > 0) {
      return branchColors[(commit.lane - 1) % branchColors.length];
    }
    return commit.color || themeConfig.mainLaneColor || '#38bdf8';
  };

  // Helper: Draw Git Connection Lines with Bezier Curves and energetic pulses
  const drawGitConnection = (
    ctx: CanvasRenderingContext2D,
    from: GitCommit,
    to: GitCommit,
    isMergeLine: boolean,
    theme: any,
    pulseAngle: number,
    camZoom: number = 1
  ) => {
    ctx.save();
    const isSameLane = from.lane === to.lane;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);

    if (isSameLane) {
      ctx.lineTo(to.x, to.y);
    } else {
      // Smooth S-Curve between lanes
      const dx = to.x - from.x;
      const cp1x = from.x + dx * 0.55;
      const cp1y = from.y;
      const cp2x = from.x + dx * 0.45;
      const cp2y = to.y;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
    }

    // Ensure line is always at least 1.5 to 2.5 screen pixels wide even when zoomed far out
    const minScreenLineWidth = isMergeLine ? 2.5 : 1.5;
    ctx.lineWidth = Math.max(minScreenLineWidth / Math.max(0.0001, camZoom), isMergeLine ? 3.5 : 2.5);

    if (isMergeLine) {
      ctx.strokeStyle = theme.mergeGlow;
      if (camZoom > 0.25) {
        ctx.shadowColor = theme.mergeGlow;
        ctx.shadowBlur = 10;
      }
      ctx.stroke();

      if (camZoom > 0.15) {
        const pulseT = ((pulseAngle * 0.8 + from.x * 0.01) % 1 + 1) % 1;
        const pulsePos = getBezierPoint(from, to, pulseT);
        ctx.beginPath();
        ctx.arc(pulsePos.x, pulsePos.y, Math.max(3, 2.5 / camZoom), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    } else {
      const lineColor = getCommitThemeColor(from, theme);
      ctx.strokeStyle = lineColor;
      if (camZoom > 0.25) {
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 4;
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawPartialConnection = (
    ctx: CanvasRenderingContext2D,
    from: GitCommit,
    to: GitCommit,
    fraction: number,
    isMergeLine: boolean,
    theme: any
  ) => {
    ctx.save();
    const currentX = from.x + (to.x - from.x) * fraction;
    const currentY = from.y + (to.y - from.y) * fraction;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(currentX, currentY);
    ctx.lineWidth = isMergeLine ? 3 : 2;
    ctx.strokeStyle = isMergeLine ? theme.mergeGlow : getCommitThemeColor(from, theme);
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  };

  // Helper: Commit Node Drawing
  const drawCommitNode = (
    ctx: CanvasRenderingContext2D,
    commit: GitCommit,
    isLatest: boolean,
    isSelected: boolean,
    isHovered: boolean,
    theme: any,
    pulseAngle: number,
    camZoom: number = 1
  ) => {
    ctx.save();

    const nodeColor = getCommitThemeColor(commit, theme);

    // Ensure node radius is always at least 2.5 to 5.0 screen pixels regardless of zoom
    const minScreenRadius = isLatest || isSelected || isHovered ? 4.5 : 2.5;
    const maxScreenRadius = isLatest || isSelected || isHovered ? 14 : 7;
    const effectiveRadius = Math.min(
      maxScreenRadius / Math.max(0.0001, camZoom),
      Math.max(commit.radius, minScreenRadius / Math.max(0.0001, camZoom))
    );

    // Outer Glow / Halo
    if (isLatest || isSelected || isHovered || (commit.isMerge && camZoom > 0.2)) {
      const glowRadius = effectiveRadius + (commit.isMerge ? 6 : 4) + Math.sin(pulseAngle * 3) * 2;
      ctx.beginPath();
      ctx.arc(commit.x, commit.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? '#ffffff'
        : commit.isMerge
        ? theme.mergeGlow
        : nodeColor;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Merge Node: Concentric Rings / Starburst Diamond
    if (commit.isMerge && camZoom > 0.25) {
      ctx.beginPath();
      ctx.arc(commit.x, commit.y, effectiveRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, 1.5 / camZoom);
      ctx.shadowColor = theme.mergeGlow;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    // Main Node Circle
    ctx.beginPath();
    ctx.arc(commit.x, commit.y, effectiveRadius, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    if (camZoom > 0.25) {
      ctx.shadowColor = nodeColor;
      ctx.shadowBlur = isLatest || isSelected ? 15 : 6;
    }
    ctx.fill();

    // Inner Core (drawn when node is large enough on screen)
    if (effectiveRadius * camZoom >= 3.5) {
      ctx.beginPath();
      ctx.arc(commit.x, commit.y, Math.max(1.5, effectiveRadius * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
      ctx.fill();
    }

    // Branch tag or Hash label under node (rendered when legible or active/hovered)
    const canRenderText = camZoom * 11 >= 8.5 || isSelected || isHovered || isLatest;
    if (canRenderText) {
      const worldFontSize = Math.max(10, Math.min(16, 11 / Math.max(0.0001, camZoom)));
      ctx.fillStyle = isSelected ? '#ffffff' : isLatest ? theme.mainLaneColor : theme.textMuted;
      ctx.font = `600 ${worldFontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(commit.shortSha, commit.x, commit.y + effectiveRadius + worldFontSize + 4);
    }

    ctx.restore();
  };

  const drawSpawningCommitNode = (
    ctx: CanvasRenderingContext2D,
    commit: GitCommit,
    progress: number,
    theme: any
  ) => {
    ctx.save();
    const nodeColor = getCommitThemeColor(commit, theme);
    const currentRadius = commit.radius * progress;
    // Spawning shockwave ring
    ctx.beginPath();
    ctx.arc(commit.x, commit.y, commit.radius * (1 + (1 - progress) * 2), 0, Math.PI * 2);
    ctx.strokeStyle = nodeColor;
    ctx.lineWidth = 2 * (1 - progress);
    ctx.globalAlpha = 1 - progress;
    ctx.stroke();

    // Center expanding circle
    ctx.globalAlpha = progress;
    ctx.beginPath();
    ctx.arc(commit.x, commit.y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    ctx.restore();
  };

  // Overview Mode Floating HUD Pill
  const drawOverviewHUD = (
    ctx: CanvasRenderingContext2D,
    commit: GitCommit,
    w: number,
    h: number,
    theme: any
  ) => {
    ctx.save();
    const pillWidth = Math.min(460, w - 32);
    const pillHeight = 36;
    const pillX = (w - pillWidth) / 2;
    const pillY = h - pillHeight - 16;

    // Glassmorphic pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = commit.isMerge ? theme.mergeGlow : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;

    roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 18);
    ctx.fill();
    ctx.stroke();

    // Pulse dot
    ctx.fillStyle = commit.color;
    ctx.beginPath();
    ctx.arc(pillX + 18, pillY + pillHeight / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Sha
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(commit.shortSha, pillX + 30, pillY + pillHeight / 2);

    // Separator dot
    ctx.fillStyle = '#64748b';
    ctx.fillText('•', pillX + 88, pillY + pillHeight / 2);

    // Message snippet
    const msgX = pillX + 100;
    const maxW = pillWidth - 114;
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const cleanMsg = commit.message.split('\n')[0].trim();
    const truncatedMsg = truncateTextToWidth(ctx, cleanMsg, maxW);
    ctx.fillText(truncatedMsg, msgX, pillY + pillHeight / 2);

    ctx.restore();
  };

  // Follow Mode Floating HUD Overlay
  const drawFollowCameraHUD = (
    ctx: CanvasRenderingContext2D,
    commit: GitCommit,
    w: number,
    h: number,
    theme: any
  ) => {
    ctx.save();
    // Bottom-center cinematic commit telemetry card
    const cardWidth = Math.min(540, w - 40);
    const cardHeight = 84;
    const cardX = (w - cardWidth) / 2;
    const cardY = h - cardHeight - 24;

    // Card background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = commit.isMerge ? theme.mergeGlow : theme.mainLaneColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 18;

    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 14);
    ctx.fill();
    ctx.stroke();

    // Author badge & avatar indicator
    const badgeColor = getCommitThemeColor(commit, theme);
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.arc(cardX + 34, cardY + 34, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((commit.author.name[0] || 'G').toUpperCase(), cardX + 34, cardY + 34);

    // Merge chip dimensions & placement
    const isCompact = cardWidth < 460;
    const mergeChipWidth = isCompact ? 84 : 110;
    const chipX = cardX + cardWidth - mergeChipWidth - 14;

    // Available width for commit message (strictly bounded so it never overflows or collides with the chip)
    const msgStartX = cardX + 62;
    const maxMsgWidth = Math.max(
      60,
      commit.isMerge ? chipX - 12 - msgStartX : cardX + cardWidth - 18 - msgStartX
    );

    // Commit Message strictly truncated with ellipsis to fit inside the box
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    const truncatedMsg = truncateTextToWidth(ctx, commit.message, maxMsgWidth);

    ctx.save();
    // Bounding clip box prevents any accidental glyph pixel from overflowing
    ctx.beginPath();
    ctx.rect(msgStartX, cardY + 12, maxMsgWidth + 2, 22);
    ctx.clip();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncatedMsg, msgStartX, cardY + 26);
    ctx.restore();

    // Metadata details (author, date) - also strictly truncated to fit
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    const dateStr = new Date(commit.author.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const maxMetaWidth = Math.max(60, cardWidth - 80);
    const metaString = `${commit.author.name} • ${dateStr}`;
    const truncatedMeta = truncateTextToWidth(ctx, metaString, maxMetaWidth);

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(truncatedMeta, cardX + 62, cardY + 47);

    // Hash pill + stats pill
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    roundRect(ctx, cardX + 62, cardY + 56, 70, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(commit.shortSha, cardX + 70, cardY + 69);

    // Additions / Deletions stats
    if (commit.stats) {
      const statX = cardX + 140;
      ctx.fillStyle = '#4ade80'; // additions green
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`+${commit.stats.additions}`, statX, cardY + 69);

      ctx.fillStyle = '#f87171'; // deletions red
      ctx.fillText(`-${commit.stats.deletions}`, statX + 45, cardY + 69);
    }

    // Merge indicator chip if merge
    if (commit.isMerge) {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
      roundRect(ctx, chipX, cardY + 15, mergeChipWidth, 22, 6);
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
  };

  // Helper for background grid
  const drawWorldGrid = (
    ctx: CanvasRenderingContext2D,
    cam: Camera,
    w: number,
    h: number,
    color: string
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Adapt grid size based on zoom so zoomed-out graphs don't generate thousands of lines
    const baseGrid = 120;
    const gridSize = cam.zoom < 0.25 ? Math.max(baseGrid, Math.round(50 / cam.zoom)) : baseGrid;

    const startX = Math.floor((-cam.x / cam.zoom - 300) / gridSize) * gridSize;
    const endX = Math.ceil(((w - cam.x) / cam.zoom + 300) / gridSize) * gridSize;
    const startY = Math.floor((-cam.y / cam.zoom - 300) / gridSize) * gridSize;
    const endY = Math.ceil(((h - cam.y) / cam.zoom + 300) / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Interactive Mouse & Touch Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const currentCanvas = externalCanvasRef?.current || internalCanvasRef.current;
    if (!currentCanvas || !interactive) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      isUserInteractingRef.current = true;
      setHasUserPan(true);

      cameraRef.current.targetX += dx;
      cameraRef.current.targetY += dy;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      return;
    }

    // Hit test for hovered commit
    const rect = currentCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cam = cameraRef.current;
    const worldX = (mouseX - cam.x) / cam.zoom;
    const worldY = (mouseY - cam.y) / cam.zoom;

    const currentCommits = commitsRef.current;
    const currentIdx = currentIndexRef.current;
    const maxVisibleIndex = Math.min(currentCommits.length - 1, Math.floor(currentIdx));
    let foundCommit: GitCommit | null = null;

    const hitPadding = Math.max(8, 6 / Math.max(0.0001, cam.zoom));
    for (let i = 0; i <= maxVisibleIndex; i++) {
      const commit = currentCommits[i];
      const effectiveRadius = Math.max(commit.radius, 3 / Math.max(0.0001, cam.zoom));
      const dist = Math.hypot(commit.x - worldX, commit.y - worldY);
      if (dist <= effectiveRadius + hitPadding) {
        foundCommit = commit;
        break;
      }
    }

    setHoveredCommitState(foundCommit);
    if (onHoverCommit) {
      onHoverCommit(foundCommit, foundCommit ? { x: e.clientX, y: e.clientY } : undefined);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || commits.length === 0) return;
    if (hoveredCommitState) {
      onSelectCommit(hoveredCommitState);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    e.preventDefault();

    isUserInteractingRef.current = true;
    setHasUserPan(true);

    const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(2.5, Math.max(0.0001, cameraRef.current.targetZoom * zoomDelta));

    const currentCanvas = externalCanvasRef?.current || internalCanvasRef.current;
    if (!currentCanvas) return;
    const rect = currentCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse cursor
    const cam = cameraRef.current;
    cam.targetX = mouseX - (mouseX - cam.targetX) * (newZoom / cam.targetZoom);
    cam.targetY = mouseY - (mouseY - cam.targetY) * (newZoom / cam.targetZoom);
    cam.targetZoom = newZoom;
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={externalCanvasRef || internalCanvasRef}
        className={`w-full h-full block ${interactive ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Recenter Camera Floating Button */}
      {hasUserPan && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 z-20 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-mono font-medium shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer animate-in fade-in"
          title="Recolocar a câmera para acompanhar a animação automaticamente"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Centralizar Câmera</span>
        </button>
      )}
    </div>
  );
};

// Utilities for canvas drawing
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getBezierPoint(from: GitCommit, to: GitCommit, t: number): { x: number; y: number } {
  const isSameLane = from.lane === to.lane;
  if (isSameLane) {
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
  }

  const dx = to.x - from.x;
  const p0 = { x: from.x, y: from.y };
  const p1 = { x: from.x + dx * 0.55, y: from.y };
  const p2 = { x: from.x + dx * 0.45, y: to.y };
  const p3 = { x: to.x, y: to.y };

  const oneMinusT = 1 - t;
  const x =
    Math.pow(oneMinusT, 3) * p0.x +
    3 * Math.pow(oneMinusT, 2) * t * p1.x +
    3 * oneMinusT * Math.pow(t, 2) * p2.x +
    Math.pow(t, 3) * p3.x;

  const y =
    Math.pow(oneMinusT, 3) * p0.y +
    3 * Math.pow(oneMinusT, 2) * t * p1.y +
    3 * oneMinusT * Math.pow(t, 2) * p2.y +
    Math.pow(t, 3) * p3.y;

  return { x, y };
}
