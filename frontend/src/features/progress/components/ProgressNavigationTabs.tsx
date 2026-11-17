import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type ProgressTabId = 'analytics' | 'revision' | 'diagnostic' | 'leaderboard';

export interface ProgressNavigationTabsProps {
  activeTab: ProgressTabId;
}

const TABS: { id: ProgressTabId; label: string; href: string }[] = [
  { id: 'analytics', label: 'Overview & Analytics', href: '/app/progress' },
  { id: 'revision', label: 'Spaced Revision Queue', href: '/app/revision' },
  { id: 'diagnostic', label: 'Diagnostic Quiz', href: '/app/diagnostic' },
  { id: 'leaderboard', label: 'Campus Leaderboard', href: '/leaderboard' },
];

export const ProgressNavigationTabs: React.FC<ProgressNavigationTabsProps> = ({ activeTab }) => {
  return (
    <div className="flex items-center gap-2 border-b border-[#181F30] pb-2 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-medium transition-colors shrink-0',
              isActive
                ? 'bg-[#152443] text-[#93C5FD] border border-[#243B6B]'
                : 'text-[#7C8BA6] hover:text-white hover:bg-[#131A2B] border border-transparent'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};

