import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward,
  Eye,
  Compass,
  Palette,
  Sparkles,
  Download,
} from 'lucide-react';
import { TimelineViewMode, VisualTheme, GitCommit } from '../types';
import { THEMES } from '../utils/themes';

interface ControlBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentIndex: number;
  totalCommits: number;
  onSeek: (index: number) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  viewMode: TimelineViewMode;
  onChangeViewMode: (mode: TimelineViewMode) => void;
  theme: VisualTheme;
  onChangeTheme: (theme: VisualTheme) => void;
  currentCommit?: GitCommit;
  onOpenExport: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentIndex,
  totalCommits,
  onSeek,
  speed,
  onChangeSpeed,
  viewMode,
  onChangeViewMode,
  theme,
  onChangeTheme,
  currentCommit,
  onOpenExport,
}) => {
  const speeds = [0.25, 0.5, 1, 2, 4];
  const progressPercent = totalCommits > 1 ? (currentIndex / (totalCommits - 1)) * 100 : 0;

  const currentCommitDate = currentCommit
    ? new Date(currentCommit.author.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div
      id="timeline-control-bar"
      className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 py-3 text-slate-100 select-none shadow-2xl transition-all"
    >
      {/* Top Scrubber Row */}
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-semibold">
              Commit {Math.min(totalCommits, Math.floor(currentIndex) + 1)} de {totalCommits}
            </span>
            {currentCommit && (
              <span className="hidden sm:inline text-slate-500">• {currentCommit.shortSha}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentCommitDate && (
              <span className="text-slate-300 font-medium">{currentCommitDate}</span>
            )}
            <span className="text-slate-500 font-semibold">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Range Slider Scrubber */}
        <div className="relative flex items-center group">
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            id="commit-scrubber-slider"
            type="range"
            min={0}
            max={Math.max(0, totalCommits - 1)}
            step={0.05}
            value={currentIndex}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
            title="Arraste para avançar ou retroceder no tempo"
          />
        </div>

        {/* Main Controls Bottom Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pt-1">
          {/* Playback Transport Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              id="btn-restart-timeline"
              onClick={() => onSeek(0)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Voltar ao início"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="btn-prev-commit"
              onClick={() => onSeek(Math.max(0, Math.floor(currentIndex) - 1))}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Commit anterior"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              id="btn-toggle-play"
              onClick={onTogglePlay}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir animação (Espaço)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              id="btn-next-commit"
              onClick={() => onSeek(Math.min(totalCommits - 1, Math.floor(currentIndex) + 1))}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Próximo commit"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center ml-0.5 sm:ml-1 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
              {speeds.map((s) => (
                <button
                  key={s}
                  id={`speed-btn-${s}`}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 sm:px-2 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                    speed === s
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher: "Acompanhar Commits" vs "Cenário Total" & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="flex bg-slate-800/90 rounded-xl p-0.5 sm:p-1 border border-slate-700/80">
              <button
                id="mode-follow-commits"
                onClick={() => onChangeViewMode('follow')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'follow'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Câmera dinâmica acompanha cada commit à medida que é criado"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Acompanhar</span>
                <span className="hidden md:inline">Commits</span>
              </button>

              <button
                id="mode-overview-multiverse"
                onClick={() => onChangeViewMode('overview')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'overview'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title="Visão ampla de todas as ramificações e merges da árvore cósmica"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Cenário Total</span>
              </button>
            </div>

            {/* Theme Selector */}
            <div className="relative group">
              <button
                id="btn-theme-menu"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition-all"
                title="Mudar Tema Visual"
              >
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">{THEMES[theme].name}</span>
              </button>

              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-xl w-48 z-50">
                {(Object.keys(THEMES) as VisualTheme[]).map((thmKey) => (
                  <button
                    key={thmKey}
                    onClick={() => onChangeTheme(thmKey)}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                      theme === thmKey
                        ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{THEMES[thmKey].name}</span>
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: THEMES[thmKey].mainLaneColor }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Export Action Button */}
            <button
              id="btn-open-export-modal"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              title="Exportar animação em MP4 ou GIF otimizado"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Exportar</span>
              <span className="hidden sm:inline">GIF/MP4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
