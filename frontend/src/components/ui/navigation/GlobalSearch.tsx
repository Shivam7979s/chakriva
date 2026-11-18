import React from 'react';
import { Search } from 'lucide-react';

export interface GlobalSearchProps {
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className = '' }) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  const handleClick = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-between gap-2 h-8 px-3 rounded-lg border border-white/[0.08] bg-[#0E131F]/90 text-white/50 hover:text-white hover:border-white/[0.18] text-xs transition-all select-none group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d2ff] w-36 sm:w-56 md:w-64 lg:w-72 ${className}`}
      title="Search roadmaps, problems, sheets, and concepts (Cmd+K / Ctrl+K)"
      aria-label="Open global search command palette"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Search className="w-3.5 h-3.5 text-white/40 group-hover:text-[#00d2ff] transition-colors shrink-0" />
        <span className="hidden sm:inline font-sans text-xs text-white/40 group-hover:text-white/60 truncate">
          Search problems...
        </span>
        <span className="inline sm:hidden font-sans text-xs text-white/40">Search...</span>
      </div>
      <kbd className="px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] font-mono text-[10px] text-white/40 group-hover:text-white/80 shrink-0">
        {isMac ? '⌘K' : 'Ctrl + K'}
      </kbd>
    </button>
  );
};

export default GlobalSearch;
