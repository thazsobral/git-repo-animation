import React from 'react';
import {
  X,
  ExternalLink,
  GitCommit as GitCommitIcon,
  GitMerge,
  Calendar,
  User,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { GitCommit, RepoMetadata } from '../types';

interface CommitInspectorProps {
  commit: GitCommit | null;
  repo: RepoMetadata;
  onClose: () => void;
  onSelectCommitSha: (sha: string) => void;
}

export const CommitInspector: React.FC<CommitInspectorProps> = ({
  commit,
  repo,
  onClose,
  onSelectCommitSha,
}) => {
  if (!commit) return null;

  const dateFormatted = new Date(commit.author.date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const githubCommitUrl = repo.isMock
    ? '#'
    : `https://github.com/${repo.fullName}/commit/${commit.sha}`;

  return (
    <div
      id="commit-inspector-card"
      className="absolute top-3 right-3 left-3 sm:left-auto sm:right-4 z-20 sm:w-96 max-h-[calc(100%-1.5rem)] overflow-y-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-slate-100 animate-in fade-in slide-in-from-right-4 duration-200 select-text"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: commit.color }}
          >
            {commit.isMerge ? (
              <GitMerge className="w-4 h-4" />
            ) : (
              <GitCommitIcon className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
              <span>{commit.shortSha}</span>
              {commit.isMerge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30">
                  Merge
                </span>
              )}
              {commit.lane === 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                  Principal
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                  Ramificação #{commit.lane}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message */}
      <div className="py-3">
        <p className="text-xs font-semibold text-slate-100 leading-relaxed break-words">
          {commit.message}
        </p>
      </div>

      {/* Author & Date Details */}
      <div className="flex flex-col gap-2 py-2 text-xs text-slate-300 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 font-mono">
        <div className="flex items-center gap-2">
          {commit.author.avatarUrl ? (
            <img
              src={commit.author.avatarUrl}
              alt={commit.author.name}
              className="w-5 h-5 rounded-full object-cover border border-slate-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
          <span className="font-semibold text-slate-200 truncate">{commit.author.name}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{dateFormatted}</span>
        </div>

        {/* Impact stats */}
        {commit.stats && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
            <span className="text-slate-400">Impacto no Código:</span>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-emerald-400">+{commit.stats.additions}</span>
              <span className="text-rose-400">-{commit.stats.deletions}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ancestor / Parent commits */}
      {commit.parents && commit.parents.length > 0 && (
        <div className="pt-3">
          <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
            {commit.parents.length > 1 ? 'Pais do Merge:' : 'Commit Anterior (Pai):'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {commit.parents.map((pSha) => (
              <button
                key={pSha}
                onClick={() => onSelectCommitSha(pSha)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg text-[11px] font-mono transition-colors"
                title={`Ir para commit ${pSha.substring(0, 7)}`}
              >
                <span>{pSha.substring(0, 7)}</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GitHub Link */}
      {!repo.isMock && (
        <div className="pt-3 mt-2 border-t border-slate-800 flex justify-end">
          <a
            href={githubCommitUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
          >
            <span>Ver detalhes no GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
