import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Github,
  Search,
  Key,
  Star,
  GitFork,
  Info,
  ExternalLink,
  RefreshCw,
  X,
  Sparkles,
  Square,
} from 'lucide-react';
import { RepoMetadata } from '../types';
import { FetchProgress } from '../services/github';

const REPO_SUGGESTIONS = [
  { url: 'facebook/react', label: 'facebook/react', name: 'React' },
  { url: 'vuejs/core', label: 'vuejs/core', name: 'Vue' },
  { url: 'tailwindlabs/tailwindcss', label: 'tailwindlabs/tailwindcss', name: 'Tailwind' },
];

interface NavbarProps {
  currentRepo: RepoMetadata;
  isLoading: boolean;
  loadingProgress?: FetchProgress | null;
  onSearchRepo: (url: string) => void;
  onStopLoading?: () => void;
  token: string;
  onSaveToken: (token: string) => void;
  onOpenInfo: () => void;
  isTokenModalOpen?: boolean;
  onToggleTokenModal?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRepo,
  isLoading,
  loadingProgress,
  onSearchRepo,
  onStopLoading,
  token,
  onSaveToken,
  onOpenInfo,
  isTokenModalOpen,
  onToggleTokenModal,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [internalTokenModal, setInternalTokenModal] = useState(false);
  const [tempToken, setTempToken] = useState(token);

  const showTokenModal = isTokenModalOpen !== undefined ? isTokenModalOpen : internalTokenModal;
  const setShowTokenModal = (open: boolean) => {
    if (onToggleTokenModal) {
      onToggleTokenModal(open);
    } else {
      setInternalTokenModal(open);
    }
  };

  useEffect(() => {
    setTempToken(token);
  }, [token, showTokenModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onSearchRepo(inputUrl.trim());
    }
  };

  return (
    <header
      id="app-navbar"
      className="bg-slate-900 border-b border-slate-800 text-slate-100 z-30 sticky top-0"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4">
        {/* Brand & Logo + Mobile Header Row */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent font-mono">
                  git-repo-animation
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  TIMELINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:block leading-tight">
                Acompanhe a evolução dos commits do repositório de forma animada.
              </p>
            </div>
          </div>

          {/* Mobile Right Controls: Token + Info */}
          <div className="flex items-center gap-1.5 md:hidden">
            {currentRepo && (
              <a
                href={`https://github.com/${currentRepo.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 bg-slate-800/90 text-cyan-300 rounded-lg text-xs font-mono border border-slate-700 max-w-[120px] truncate"
                title={currentRepo.fullName}
              >
                <Github className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentRepo.name}</span>
              </a>
            )}
            <button
              id="btn-github-token-mobile"
              onClick={() => setShowTokenModal(true)}
              className={`p-1.5 rounded-lg border text-xs transition-all ${
                token
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={token ? 'GitHub Token Ativo' : 'Configurar GitHub Token'}
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              id="btn-info-about-mobile"
              onClick={onOpenInfo}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Sobre a ferramenta"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Repository Search Bar Container */}
        <div className="w-full md:flex-1 md:max-w-2xl lg:max-w-3xl flex flex-col gap-1.5">
          <form onSubmit={handleSubmit} className="w-full relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              <Github className="w-4 h-4 text-cyan-400/80" />
            </div>
            <input
              id="repo-search-input"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Digite o repositório GitHub (ex: facebook/react ou https://github.com/usuario/repo)..."
              className="w-full pl-10 pr-28 sm:pr-32 py-2 bg-slate-950/90 border border-slate-700/80 rounded-xl text-xs sm:text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 shadow-inner transition-all"
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="absolute right-24 sm:right-28 p-1 text-slate-400 hover:text-white rounded-md transition-colors"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="absolute right-1.5 flex items-center">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onStopLoading}
                  id="btn-stop-repo-loading-navbar"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40 font-bold rounded-lg text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                  title="Parar carregamento dos commits"
                >
                  <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
                  <span className="font-mono">
                    Parar {loadingProgress?.loadedCommits ? `(${loadingProgress.loadedCommits})` : ''}
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  id="btn-fetch-repo"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="font-sans">Carregar</span>
                </button>
              )}
            </div>
          </form>

          {/* 3 Sugestões de Repositório */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 px-0.5 overflow-x-auto">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Sugestões:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              {REPO_SUGGESTIONS.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  id={`btn-suggestion-${item.name.toLowerCase()}`}
                  onClick={() => {
                    setInputUrl(item.url);
                    onSearchRepo(item.url);
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-slate-800/80 hover:bg-cyan-500/15 hover:text-cyan-300 border border-slate-700/70 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 transition-all flex items-center gap-1 active:scale-95 shadow-sm group"
                  title={`Carregar ${item.url}`}
                >
                  <span className="text-slate-500 group-hover:text-cyan-400 font-sans">/</span>
                  <span className="font-medium text-slate-200 group-hover:text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Info & Token Trigger (Desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Active Repo Stats */}
          {currentRepo && (
            <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5">
              <a
                href={`https://github.com/${currentRepo.fullName}`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 font-medium hover:underline flex items-center gap-1 max-w-[140px] lg:max-w-[200px] truncate"
                title="Abrir no GitHub"
              >
                <span className="truncate">{currentRepo.fullName}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <span className="text-slate-700">|</span>
              <span className="flex items-center gap-1 text-amber-300 shrink-0">
                <Star className="w-3 h-3 fill-amber-300" />
                {currentRepo.stars.toLocaleString()}
              </span>
            </div>
          )}

          {/* GitHub Token Trigger */}
          <button
            id="btn-github-token"
            onClick={() => setShowTokenModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
              token
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Configurar GitHub Token (Opcional, para aumentar limite da API)"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="font-medium">{token ? 'Token Ativo' : 'API Token'}</span>
          </button>

          <button
            id="btn-info-about"
            onClick={onOpenInfo}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Como usar o git-repo-animation"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GitHub Personal Access Token Modal */}
      {showTokenModal && (
        <div
          id="token-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTokenModal(false);
          }}
          className="fixed inset-0 w-screen h-screen bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            id="token-modal-dialog"
            className="relative my-auto mx-auto bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150 text-left"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chave de API / Token do GitHub</h3>
                  <p className="text-xs text-slate-400">Carregue todos os commits (até 5.000 req/hora)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTokenModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Para repositórios com muitos commits, o limite gratuito sem autenticação do GitHub (60 requisições/hora)
              pode ser atingido rapidamente. Ao informar sua chave de API / Personal Access Token, a ferramenta consegue
              percorrer e carregar <strong>todos os commits</strong> do repositório sem interrupções. O token é armazenado
              com total segurança apenas no seu próprio navegador.
            </p>

            {/* Shortcut to generate GitHub Token */}
            <div className="mb-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Precisa gerar sua chave?</span>
                <span className="text-[11px] text-slate-400">Gere em 1 clique um token no GitHub</span>
              </div>
              <a
                id="btn-create-github-token-shortcut"
                href="https://github.com/settings/tokens/new?description=git-repo-animation&scopes=public_repo"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Gerar Token</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="mb-1 text-[11px] font-medium text-slate-400">
              Cole sua chave de API / token do GitHub:
            </div>
            <input
              id="input-github-token"
              type="password"
              value={tempToken}
              onChange={(e) => setTempToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempToken('');
                  onSaveToken('');
                  setShowTokenModal(false);
                }}
                className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors mr-auto"
              >
                Limpar Token
              </button>
              <button
                type="button"
                onClick={() => setShowTokenModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveToken(tempToken.trim());
                  setShowTokenModal(false);
                }}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
              >
                Salvar Token
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
