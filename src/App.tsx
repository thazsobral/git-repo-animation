import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CommitTimelineCanvas } from './components/CommitTimelineCanvas';
import { ControlBar } from './components/ControlBar';
import { CommitInspector } from './components/CommitInspector';
import { ExportModal } from './components/ExportModal';
import { InfoModal } from './components/InfoModal';
import { Footer } from './components/Footer';
import {
  GitCommit,
  RepoMetadata,
  TimelineViewMode,
  VisualTheme,
} from './types';
import { THEMES } from './utils/themes';
import { layoutGitCommits, GitGraphBounds } from './utils/gitLayout';
import {
  fetchRepositoryData,
  parseGitHubUrl,
  getSyntheticMultiverseRepo,
  FetchProgress,
} from './services/github';
import { AlertCircle, Sparkles, RefreshCw, Layers, GitCommit as GitCommitIcon, Key, Square } from 'lucide-react';

export default function App() {
  // Repository state
  const [repoMetadata, setRepoMetadata] = useState<RepoMetadata>(() => {
    return getSyntheticMultiverseRepo().metadata;
  });
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [bounds, setBounds] = useState<GitGraphBounds>({
    minX: 0,
    maxX: 800,
    minY: 0,
    maxY: 400,
    width: 800,
    height: 400,
  });

  // Animation playback state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [viewMode, setViewMode] = useState<TimelineViewMode>('follow');
  const [theme, setTheme] = useState<VisualTheme>('cosmic');

  // Interactive selection state
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [pendingRepoUrl, setPendingRepoUrl] = useState<string | null>(null);

  // Network & tokens
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<FetchProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string>(() => {
    return (
      localStorage.getItem('git_repo_animation_gh_token') ||
      localStorage.getItem('gitmultiverse_gh_token') ||
      ''
    );
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stop loading commits handler
  const handleStopLoading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Load initial demo repo on mount
  useEffect(() => {
    const { metadata, commits: rawCommits } = getSyntheticMultiverseRepo();
    setRepoMetadata(metadata);
    const layout = layoutGitCommits(rawCommits, THEMES['cosmic']);
    setCommits(layout.commits);
    setBounds(layout.bounds);
    setCurrentIndex(0);
    setIsPlaying(true);
  }, []);

  // Save token changes to localStorage and auto-retry if rate limit occurred
  const handleSaveToken = (newToken: string) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('git_repo_animation_gh_token', newToken);
      setErrorMessage(null);
      if (pendingRepoUrl) {
        const repoToRetry = pendingRepoUrl;
        setTimeout(() => {
          handleSearchRepo(repoToRetry, newToken);
        }, 150);
      }
    } else {
      localStorage.removeItem('git_repo_animation_gh_token');
      localStorage.removeItem('gitmultiverse_gh_token');
    }
  };

  // Update commit colors immediately when theme changes
  useEffect(() => {
    if (commits.length === 0) return;
    const themeColors = THEMES[theme];
    setCommits((prevCommits) =>
      prevCommits.map((c) => ({
        ...c,
        color:
          c.lane === 0
            ? themeColors.mainLaneColor
            : themeColors.branchColors[(c.lane - 1) % themeColors.branchColors.length],
      }))
    );
  }, [theme]);

  // Main Animation Tick Hook
  useEffect(() => {
    let animationFrameId: number;

    const tick = (currentTime: number) => {
      const delta = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (isPlaying && commits.length > 0) {
        // Adapt advanceRate dynamically so repositories with hundreds of commits animate smoothly
        // without taking hours, while smaller histories remain easily readable
        const baseRate = commits.length > 200 ? Math.max(2.5, commits.length / 50) : 1.5;
        const advanceRate = baseRate * speed;
        setCurrentIndex((prev) => {
          const next = prev + advanceRate * delta;
          if (next >= commits.length - 1) {
            // Loop back to start after small pause
            return 0;
          }
          return next;
        });
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, speed, commits.length]);

  // Load custom repository without 1000 limit - fetches all commits
  const handleSearchRepo = async (inputUrl: string, tokenOverride?: string) => {
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingProgress(null);
    setPendingRepoUrl(inputUrl);

    const parsed = parseGitHubUrl(inputUrl);
    if (!parsed) {
      setIsLoading(false);
      setErrorMessage(
        'Formato inválido. Digite no formato "owner/repo" ou cole a URL completa do GitHub (ex: facebook/react).'
      );
      return;
    }

    const activeToken = tokenOverride !== undefined ? tokenOverride : token;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await fetchRepositoryData(
        parsed.owner,
        parsed.repo,
        activeToken,
        (progress) => {
          setLoadingProgress(progress);
        },
        controller.signal
      );
      setRepoMetadata(data.metadata);

      const layout = layoutGitCommits(data.commits, THEMES[theme]);
      setCommits(layout.commits);
      setBounds(layout.bounds);

      setCurrentIndex(0);
      setSelectedCommit(null);
      setIsPlaying(true);
      setPendingRepoUrl(null);

      if (data.stoppedEarly) {
        setErrorMessage(
          `Carregamento interrompido. Exibindo os ${data.commits.length} commits obtidos até o momento.`
        );
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        // User aborted loading before commits were received
        return;
      }

      const isRateLimit =
        err?.isRateLimit ||
        err?.name === 'GitHubRateLimitError' ||
        err?.message?.includes('Rate Limit') ||
        err?.message?.includes('limite de requisições') ||
        err?.message?.includes('API do GitHub atingido');

      if (isRateLimit) {
        setIsTokenModalOpen(true);
        setErrorMessage(
          err.message ||
            'Limite de requisições do GitHub atingido ao tentar carregar todos os commits. Insira sua chave de API / Personal Access Token para continuar.'
        );
      } else {
        setErrorMessage(
          err.message || 'Não foi possível carregar o histórico de commits do repositório.'
        );
      }
    } finally {
      setIsLoading(false);
      setLoadingProgress(null);
      abortControllerRef.current = null;
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(commits.length - 1, Math.floor(prev) + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, Math.floor(prev) - 1));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'follow' ? 'overview' : 'follow'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commits.length]);

  const activeCommit = commits[Math.max(0, Math.min(commits.length - 1, Math.floor(currentIndex)))];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Top Navigation */}
      <Navbar
        currentRepo={repoMetadata}
        isLoading={isLoading}
        loadingProgress={loadingProgress}
        onSearchRepo={handleSearchRepo}
        onStopLoading={handleStopLoading}
        token={token}
        onSaveToken={handleSaveToken}
        onOpenInfo={() => setIsInfoModalOpen(true)}
        isTokenModalOpen={isTokenModalOpen}
        onToggleTokenModal={setIsTokenModalOpen}
        theme={theme}
        onChangeTheme={setTheme}
      />

      {/* Progress banner during full commit pagination */}
      {isLoading && loadingProgress && (
        <div
          id="loading-progress-banner"
          className="bg-cyan-950/80 border-b border-cyan-800/60 px-4 py-2 text-cyan-200 text-xs flex items-center justify-between gap-3 z-30 animate-in slide-in-from-top-1 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2.5 max-w-4xl">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            <span className="font-mono font-medium">{loadingProgress.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-700/50 text-cyan-300 font-mono">
              Página {loadingProgress.currentPage}
            </span>
            <button
              id="btn-stop-loading-commits"
              type="button"
              onClick={handleStopLoading}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/35 active:bg-rose-500/50 text-rose-300 hover:text-rose-100 border border-rose-500/40 rounded-md font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Parar carregamento e exibir commits obtidos"
            >
              <Square className="w-3 h-3 fill-current text-rose-400" />
              <span>Parar carregamento</span>
            </button>
          </div>
        </div>
      )}

      {/* Error banner notification if any */}
      {errorMessage && (
        <div
          id="error-notification-banner"
          className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-rose-300 text-xs flex flex-wrap items-center justify-between gap-3 z-30 animate-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2 max-w-3xl">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              id="btn-open-token-from-error"
              onClick={() => setIsTokenModalOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Inserir Chave de API / Token</span>
            </button>
            <button
              onClick={() => handleSearchRepo('demo/multiverse-sample')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Demo Cósmica</span>
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Viewport Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
        <CommitTimelineCanvas
          canvasRef={canvasRef}
          commits={commits}
          bounds={bounds}
          currentIndex={currentIndex}
          viewMode={viewMode}
          theme={theme}
          selectedCommit={selectedCommit}
          onSelectCommit={(c) => {
            setSelectedCommit(c);
            if (c) {
              const idx = commits.findIndex((item) => item.sha === c.sha);
              if (idx !== -1) {
                setCurrentIndex(idx);
                setIsPlaying(false);
              }
            }
          }}
        />

        {/* Selected Commit Detail Inspector */}
        <CommitInspector
          commit={selectedCommit}
          repo={repoMetadata}
          onClose={() => setSelectedCommit(null)}
          onSelectCommitSha={(sha) => {
            const found = commits.find((c) => c.sha === sha);
            if (found) {
              setSelectedCommit(found);
              const idx = commits.findIndex((c) => c.sha === sha);
              if (idx !== -1) {
                setCurrentIndex(idx);
                setIsPlaying(false);
              }
            }
          }}
        />

        {/* Mode & Legend Indicator in top-left */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none select-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono flex items-center gap-2 shadow-lg">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: THEMES[theme].mainLaneColor }}
            />
            <span className="font-semibold text-white">
              {viewMode === 'follow' ? 'Modo: Acompanhando Commits' : 'Modo: Cenário Total (Multiverso)'}
            </span>
          </div>

          <div className="hidden sm:flex bg-slate-900/70 backdrop-blur-md border border-slate-800/60 rounded-xl px-3 py-1.5 text-[11px] text-slate-400 gap-3 shadow-sm">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: THEMES[theme].mainLaneColor }}
              />
              Linha Principal
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: THEMES[theme].branchColors[0] || '#a855f7' }}
              />
              Branches
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: THEMES[theme].mergeGlow }}
              />
              Conexões de Merge
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Timeline Controls */}
      <ControlBar
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        currentIndex={currentIndex}
        totalCommits={commits.length}
        onSeek={(idx) => {
          setCurrentIndex(idx);
          setIsPlaying(false);
        }}
        speed={speed}
        onChangeSpeed={setSpeed}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        theme={theme}
        onChangeTheme={setTheme}
        currentCommit={activeCommit}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Persistent App Footer */}
      <Footer />

      {/* Export MP4/GIF Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        commits={commits}
        bounds={bounds}
        currentViewMode={viewMode}
        currentTheme={theme}
        repo={repoMetadata}
      />

      {/* Info / Guide Modal */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
