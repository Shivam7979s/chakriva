import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Search, Compass, BookOpen, Code2, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Practice' | 'Settings';
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Listen for Cmd+K / Ctrl+K and custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleToggle = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-command-palette', handleToggle);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-command-palette', handleToggle);
    };
  }, [isOpen]);

  const items: CommandItem[] = [
    {
      id: 'nav-home',
      title: 'Go to Home (Daily Cockpit)',
      category: 'Navigation',
      icon: <Compass className="w-4 h-4 text-blue-400" />,
      onSelect: () => {
        navigate('/app/home');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-roadmap',
      title: 'Go to Roadmap (Adaptive Curriculum)',
      category: 'Navigation',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        navigate('/app/roadmap');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-learn',
      title: 'Go to Learn (Masterclasses & Invariants)',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      onSelect: () => {
        navigate('/app/learn');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-practice',
      title: 'Browse Practice Problems',
      category: 'Practice',
      icon: <Code2 className="w-4 h-4 text-cyan-400" />,
      onSelect: () => {
        navigate('/app/practice');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-sheets',
      title: 'Go to Curated Sheets',
      category: 'Practice',
      icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
      onSelect: () => {
        navigate('/app/sheets');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-chakriva',
      title: 'Open Chakriva AI Cockpit',
      category: 'Navigation',
      icon: <Compass className="w-4 h-4 text-purple-400" />,
      onSelect: () => {
        navigate('/app/chakriva');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-codespace',
      title: 'Open CodeSpace Scratchpads',
      category: 'Practice',
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        navigate('/app/codespace');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-contests',
      title: 'View Engineering Contests',
      category: 'Navigation',
      icon: <Compass className="w-4 h-4 text-yellow-400" />,
      onSelect: () => {
        navigate('/app/contests');
        setIsOpen(false);
      },
    },
    {
      id: 'nav-progress',
      title: 'View Learner Progress & Telemetry',
      category: 'Navigation',
      icon: <Compass className="w-4 h-4 text-rose-400" />,
      onSelect: () => {
        navigate('/app/progress');
        setIsOpen(false);
      },
    },
    {
      id: 'act-theme',
      title: `Toggle Theme (Current: ${theme})`,
      category: 'Settings',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />,
      onSelect: () => {
        toggleTheme();
        setIsOpen(false);
      },
    },
  ];

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle arrow keys
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-modal flex items-start justify-center pt-24 p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Surface */}
      <div className="relative w-full max-w-xl rounded border border-border bg-surface-elevated shadow-elevation-3 overflow-hidden z-10 flex flex-col animate-in fade-in zoom-in-95 duration-fast">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-border bg-surface">
          <Search className="w-4 h-4 text-text-muted shrink-0 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search... (Esc to close)"
            className="w-full h-12 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono border border-border rounded bg-surface-subtle text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-text-muted">
              No matching commands found.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={item.onSelect}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded text-[13px] transition-colors text-left',
                  selectedIndex === idx
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-primary hover:bg-surface-subtle'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.title}</span>
                </div>
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-mono">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border bg-surface text-[11px] text-text-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 border border-border rounded bg-surface-subtle mr-1">↑↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 border border-border rounded bg-surface-subtle mr-1">↵</kbd>
              Select
            </span>
          </div>
          <span>Chakriva Command Hub</span>
        </div>
      </div>
    </div>
  );
};
