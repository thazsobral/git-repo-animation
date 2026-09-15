import React, { useState } from 'react';
import {
  X,
  Film,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Sliders,
  Eye,
  Compass,
} from 'lucide-react';
import { GitCommit, TimelineViewMode, VisualTheme, ExportProgress, RepoMetadata } from '../types';
import { GitGraphBounds } from '../utils/gitLayout';
import { exportAsGif, exportAsVideo } from '../utils/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  commits: GitCommit[];
  bounds: GitGraphBounds;
  currentViewMode: TimelineViewMode;
  currentTheme: VisualTheme;
  repo: RepoMetadata;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  commits,
  bounds,
  currentViewMode,
  currentTheme,
  repo,
}) => {
  if (!isOpen) return null;

  const [format, setFormat] = useState<'gif' | 'mp4'>('mp4');
  const [viewMode, setViewMode] = useState<TimelineViewMode>(currentViewMode);
  const [resolution, setResolution] = useState<'720p' | '1080p' | 'square'>('720p');
  const [fps, setFps] = useState<number>(format === 'gif' ? 18 : 30);

  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
    currentFrame: 0,
    totalFrames: 0,
  });

  const getResolutionDimensions = () => {
    switch (resolution) {
      case '1080p':
        return { width: 1920, height: 1080 };
      case 'square':
        return { width: 1080, height: 1080 };
      case '720p':
      default:
        return { width: 1280, height: 720 };
    }
  };

  const handleStartExport = async () => {
    const { width, height } = getResolutionDimensions();
    const cleanRepoName = repo.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanRepoName}-timeline-${viewMode}.${format === 'gif' ? 'gif' : 'mp4'}`;

    setProgress({
      status: 'rendering',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
    });

    try {
      if (format === 'gif') {
        const gifFps = Math.min(20, fps);
        const gifBlob = await exportAsGif(
          {
            format: 'gif',
            width: Math.round(width * 0.75), // slightly scaled for faster GIF encoding & small file size
            height: Math.round(height * 0.75),
            fps: gifFps,
            viewMode,
            theme: currentTheme,
            commits,
            bounds,
            repoName: repo.name,
          },
          (percent, current, total) => {
            setProgress({
              status: percent >= 100 ? 'encoding' : 'rendering',
              progress: percent,
              currentFrame: current,
              totalFrames: total,
            });
          }
        );

        const url = URL.createObjectURL(gifBlob);
        const sizeMb = (gifBlob.size / (1024 * 1024)).toFixed(2) + ' MB';

        setProgress({
          status: 'completed',
          progress: 100,
          currentFrame: 0,
          totalFrames: 0,
          downloadUrl: url,
          fileBlob: gifBlob,
          fileName: filename,
          fileSizeText: sizeMb,
        });
      } else {
        // MP4 / Video
        const { blob, mimeType } = await exportAsVideo(
          {
            format: 'mp4',
            width,
            height,
            fps,
            viewMode,
            theme: currentTheme,
            commits,
            bounds,
            repoName: repo.name,
          },
          (percent, current, total) => {
            setProgress({
              status: percent >= 100 ? 'encoding' : 'rendering',
              progress: percent,
              currentFrame: current,
              totalFrames: total,
            });
          }
        );

        const url = URL.createObjectURL(blob);
        const sizeMb = (blob.size / (1024 * 1024)).toFixed(2) + ' MB';
        const isTrueMp4 = mimeType.includes('mp4');
        const finalName = isTrueMp4 ? filename : filename.replace(/\.mp4$/, '.webm');

        setProgress({
          status: 'completed',
          progress: 100,
          currentFrame: 0,
          totalFrames: 0,
          downloadUrl: url,
          fileBlob: blob,
          fileName: finalName,
          fileSizeText: sizeMb,
        });
      }
    } catch (err: any) {
      console.error('Erro na exportação:', err);
      setProgress({
        status: 'error',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        errorMessage: err?.message || 'Falha ao codificar animação.',
      });
    }
  };

  const handleDownload = () => {
    if (!progress.downloadUrl || !progress.fileName) return;
    const a = document.createElement('a');
    a.href = progress.downloadUrl;
    a.download = progress.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        id="export-modal-dialog"
        className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100 flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                <Film className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Exportar Animação</h2>
              <p className="text-xs text-slate-400">
                Gere um arquivo de vídeo MP4 ou GIF de alta qualidade do repositório
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={progress.status === 'rendering' || progress.status === 'encoding'}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Options (when idle or error) */}
        {progress.status === 'idle' || progress.status === 'error' ? (
          <div className="flex flex-col gap-4">
            {/* Format Selector: MP4 vs GIF */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Formato de Exportação
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormat('mp4');
                    setFps(30);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    format === 'mp4'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Film className={`w-5 h-5 ${format === 'mp4' ? 'text-emerald-400' : ''}`} />
                  <div>
                    <div className="font-bold text-xs text-white">Vídeo MP4 / WebM</div>
                    <div className="text-[11px] text-slate-400">60 FPS fluido, cores vivas e menor peso</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormat('gif');
                    setFps(18);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    format === 'gif'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <ImageIcon className={`w-5 h-5 ${format === 'gif' ? 'text-emerald-400' : ''}`} />
                  <div>
                    <div className="font-bold text-xs text-white">GIF Animado</div>
                    <div className="text-[11px] text-slate-400">Ideal para GitHub README e docs</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Animation Perspective Mode */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Perspectiva da Animação
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('follow')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    viewMode === 'follow'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-xs text-slate-200">Acompanhar Commits</div>
                    <div className="text-[10px] text-slate-400">Foco dinâmico e telemetria de código</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('overview')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    viewMode === 'overview'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-xs text-slate-200">Cenário Total (Multiverso)</div>
                    <div className="text-[10px] text-slate-400">Visão cósmica de todas ramificações</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Resolução
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="720p">720p HD (1280 × 720) - Rápido</option>
                  <option value="1080p">1080p Full HD (1920 × 1080)</option>
                  <option value="square">Quadrado (1080 × 1080) - Social</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Taxa de Quadros (FPS)
                </label>
                <select
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  {format === 'gif' ? (
                    <>
                      <option value={15}>15 FPS (Arquivo Leve)</option>
                      <option value={20}>20 FPS (Equilibrado)</option>
                    </>
                  ) : (
                    <>
                      <option value={30}>30 FPS (Padrão Fluido)</option>
                      <option value={60}>60 FPS (Ultra Suave)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {progress.status === 'error' && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{progress.errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-export"
                onClick={handleStartExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Gerar {format.toUpperCase()}</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Rendering / Encoding State */}
        {progress.status === 'rendering' || progress.status === 'encoding' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">
                {progress.status === 'encoding'
                  ? `Finalizando codificação do ${format.toUpperCase()}...`
                  : `Renderizando animação (${progress.progress}%)...`}
              </h3>
              <p className="text-xs text-slate-400">
                Processando quadros do multiverso diretamente na GPU do seu navegador.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
                style={{ width: `${progress.progress}%` }}
              />
            </div>

            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {progress.currentFrame} / {progress.totalFrames} frames processados
            </span>
          </div>
        ) : null}

        {/* Completed State */}
        {progress.status === 'completed' && progress.downloadUrl ? (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold text-white">Animação pronta para download!</span>
                <div className="text-[11px] text-emerald-300/80">
                  Tamanho estimado: <span className="font-mono font-bold">{progress.fileSizeText}</span>
                </div>
              </div>
            </div>

            {/* Media Preview Box */}
            <div className="w-full max-h-64 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center relative">
              {format === 'gif' ? (
                <img
                  src={progress.downloadUrl}
                  alt="Exported Git GIF"
                  className="max-h-64 object-contain"
                />
              ) : (
                <video
                  src={progress.downloadUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-64 w-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setProgress({
                    status: 'idle',
                    progress: 0,
                    currentFrame: 0,
                    totalFrames: 0,
                  })
                }
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Configurar Outro
              </button>

              <button
                type="button"
                id="btn-download-file"
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Baixar {progress.fileName}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
