import React from 'react';
import { Heart, ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="app-footer"
      className="shrink-0 w-full bg-slate-950/95 border-t border-slate-800/80 px-4 py-2.5 sm:py-2 text-xs text-slate-400 select-none z-20 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 text-center sm:text-left">
        {/* Author Credit */}
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <span className="text-slate-400">Desenvolvido por</span>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 hover:brightness-110 transition-all font-mono">
            ThazSobral
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline font-mono text-slate-400">{currentYear}</span>
        </div>

        {/* Rights & Copyright */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-sans">
          <span className="sm:hidden font-mono text-slate-400">{currentYear}</span>
          <span className="sm:hidden text-slate-700">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Todos os direitos reservados.</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
