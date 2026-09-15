import React from 'react';
import { X, GitBranch, GitMerge, Eye, Compass, Film, Zap, Layers, Sparkles } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="info-modal-backdrop"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        id="info-modal-dialog"
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white font-mono">Como funciona o git-repo-animation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex gap-3">
            <GitBranch className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Nós e Crescimento do Código</strong>
              Cada commit é um ponto na linha do tempo cósmica. O raio da esfera cresce proporcionalmente
              à quantidade de adições e remoções de linhas de código daquele commit.
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex gap-3">
            <GitMerge className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Ramificações e Merges Multiverso</strong>
              Linhas paralelas representam branches em desenvolvimento simultâneo. Quando ocorre um merge,
              arcos energéticos conectam os universos paralelos de volta à linha principal.
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex gap-3">
            <Eye className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Modos de Visualização</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                <li><b className="text-slate-200">Acompanhar Commits:</b> A câmera viaja com foco em cada commit, mostrando autor, mensagem e estatísticas em tempo real.</li>
                <li><b className="text-slate-200">Cenário Total:</b> Visão panorâmica orbital que engloba toda a árvore genealógica de ramificações do projeto.</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex gap-3">
            <Film className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Exportação para MP4 e GIF</strong>
              Exporte vídeos fluidos a 30/60 FPS ou GIFs leves prontos para colocar no README do seu GitHub ou compartilhar em redes sociais.
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl text-[11px] text-slate-400">
            <span className="font-semibold text-slate-200">Atalhos do Teclado:</span> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">Espaço</code> reproduz/pausa, <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">←</code> volta commit, <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300">→</code> avança commit. Você também pode clicar e arrastar no canvas para mover a câmera e usar a roda do mouse para dar zoom!
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
