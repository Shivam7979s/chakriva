import React from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Target, Crown, Cpu, Award, Flame, Lock } from 'lucide-react';

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  criteria: string;
  unlocked: boolean;
  earnedDate?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface BadgeShowcaseProps {
  className?: string;
  solvedCount?: number;
  maxStreak?: number;
  score?: number;
  hasCollege?: boolean;
}

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({
  className,
  solvedCount = 0,
  maxStreak = 0,
  score = 0,
  hasCollege = false,
}) => {
  const badges: MilestoneBadge[] = [
    {
      id: 'badge-first-ac',
      title: 'First AC',
      description: 'Solved first algorithmic challenge on Chakriva.',
      criteria: 'Requires solving >= 1 problem',
      unlocked: solvedCount >= 1,
      earnedDate: solvedCount >= 1 ? 'Unlocked' : undefined,
      icon: <Award className="w-5 h-5" />,
      color: '#00B8A3',
      bgColor: 'rgba(0, 184, 163, 0.12)',
      borderColor: 'rgba(0, 184, 163, 0.3)',
    },
    {
      id: 'badge-7-day-streak',
      title: '7-Day Streak',
      description: 'Maintained 7 consecutive active days of algorithmic practice.',
      criteria: 'Requires max streak >= 7 days',
      unlocked: maxStreak >= 7,
      earnedDate: maxStreak >= 7 ? 'Unlocked' : undefined,
      icon: <Flame className="w-5 h-5" />,
      color: '#FFC01E',
      bgColor: 'rgba(255, 192, 30, 0.12)',
      borderColor: 'rgba(255, 192, 30, 0.3)',
    },
    {
      id: 'badge-problem-solver',
      title: 'Problem Solver',
      description: 'Solved 10+ verified problems across the curriculum.',
      criteria: 'Requires solving >= 10 problems',
      unlocked: solvedCount >= 10,
      earnedDate: solvedCount >= 10 ? 'Unlocked' : undefined,
      icon: <Target className="w-5 h-5" />,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    {
      id: 'badge-algorithmic-knight',
      title: 'Algorithmic Knight',
      description: 'Solved 25+ problems with verified runtime benchmarks.',
      criteria: 'Requires solving >= 25 problems',
      unlocked: solvedCount >= 25,
      earnedDate: solvedCount >= 25 ? 'Unlocked' : undefined,
      icon: <Cpu className="w-5 h-5" />,
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.12)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    {
      id: 'badge-30-day-streak',
      title: '30-Day Streak',
      description: 'Demonstrated exceptional algorithmic consistency over 30 days.',
      criteria: 'Requires max streak >= 30 days',
      unlocked: maxStreak >= 30,
      earnedDate: maxStreak >= 30 ? 'Unlocked' : undefined,
      icon: <Flame className="w-5 h-5" />,
      color: '#F97316',
      bgColor: 'rgba(249, 115, 22, 0.12)',
      borderColor: 'rgba(249, 115, 22, 0.3)',
    },
    {
      id: 'badge-campus-contender',
      title: 'Campus Contender',
      description: 'Affiliated with university cohort and active in campus rankings.',
      criteria: 'Requires college affiliation & (>= 1 solved or score > 0)',
      unlocked: hasCollege && (solvedCount >= 1 || score > 0),
      earnedDate: hasCollege && (solvedCount >= 1 || score > 0) ? 'Unlocked' : undefined,
      icon: <Crown className="w-5 h-5" />,
      color: '#EC4899',
      bgColor: 'rgba(236, 72, 153, 0.12)',
      borderColor: 'rgba(236, 72, 153, 0.3)',
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div
      className={cn(
        'p-5 rounded-lg border border-white/[0.08] bg-surface space-y-4 shadow-elevation-1',
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <h4 className="text-base font-semibold font-sans text-white tracking-[-0.015em]">
            Milestone Badges & Honors
          </h4>
        </div>
        <span className="text-xs font-mono text-text-secondary bg-[#181C28] px-2.5 py-1 rounded border border-white/[0.08]">
          {unlockedCount} / {badges.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={cn(
              'p-3 rounded-lg border transition-all duration-200 flex flex-col items-center text-center group cursor-pointer relative',
              badge.unlocked
                ? 'border-white/[0.06] bg-[#181C28]/80 hover:bg-[#181C28]'
                : 'border-white/[0.03] bg-[#181C28]/30 opacity-40 grayscale hover:opacity-75 hover:grayscale-0'
            )}
            title={
              badge.unlocked
                ? `${badge.title} — ${badge.description} (${badge.earnedDate})`
                : `Locked: ${badge.title} — ${badge.criteria}`
            }
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110 shadow-sm relative"
              style={{
                backgroundColor: badge.bgColor,
                borderColor: badge.borderColor,
                borderWidth: '1px',
                color: badge.color,
              }}
            >
              {badge.icon}
              {!badge.unlocked && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#12151E] border border-white/20 flex items-center justify-center text-text-muted">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
            <span className="text-xs font-mono font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
              {badge.title}
            </span>
            <span
              className={cn(
                'text-[10px] font-mono mt-0.5',
                badge.unlocked ? 'text-[#00B8A3] font-medium' : 'text-text-muted'
              )}
            >
              {badge.unlocked ? badge.earnedDate : 'Locked'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
