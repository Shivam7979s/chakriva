import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { TerminalSquare, FolderCode, BookOpenText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CodeSpaceSectionTab = 'studio' | 'vault' | 'notes';

interface CodeSpaceNavTabsProps {
  activeTab: CodeSpaceSectionTab;
  compact?: boolean;
  className?: string;
}

const TABS: {
  id: CodeSpaceSectionTab;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'studio', label: 'Studio IDE', href: '/ide', icon: TerminalSquare },
  { id: 'vault', label: 'Snippet Vault', href: '/app/codespace', icon: FolderCode },
  { id: 'notes', label: 'NoteSpace', href: '/app/notespace', icon: BookOpenText },
];

export const CodeSpaceNavTabs: React.FC<CodeSpaceNavTabsProps> = ({
  activeTab,
  compact = false,
  className,
}) => {
  return (
    <nav
      aria-label="CodeSpace Workspace Switcher"
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-[#0B0E16] border border-[#181F30] p-1 shrink-0',
        className
      )}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors whitespace-nowrap',
              compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
              isActive ? 'text-[#F8FAFF]' : 'text-[#7C8BA6] hover:text-[#D5E1F7]'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="codespaceWorkspacePill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-[#152443] border border-[#3B82F6]/35"
              />
            )}
            <Icon
              className={cn(
                'relative z-10',
                compact ? 'w-3 h-3' : 'w-3.5 h-3.5',
                isActive ? 'text-[#60A5FA]' : 'text-[#5B6882]'
              )}
            />
            <span className="relative z-10">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

