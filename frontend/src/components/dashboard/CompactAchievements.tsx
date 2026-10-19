import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompactAchievementsProps {
  solvedCount?: number;
  maxStreak?: number;
  score?: number;
  hasCollege?: boolean;
  className?: string;
}

interface MilestoneSpec {
  id: string;
  title: string;
  tag: string;
  description: string;
  unlocked: boolean;
  color: string;
  requirement: string;
  progressPercent: number;
}

export const CompactAchievements: React.FC<CompactAchievementsProps> = ({
  solvedCount = 0,
  maxStreak = 0,
  score: _score = 0,
  className,
}) => {
  const milestones: MilestoneSpec[] = useMemo(() => {
    return [
      {
        id: 'first-ac',
        title: 'First AC',
        tag: '1 AC',
        description: 'Solved first algorithmic challenge',
        unlocked: solvedCount >= 1,
        color: '#00B8A3',
        requirement: 'Solve 1 verified problem',
        progressPercent: Math.min(100, Math.round((solvedCount / 1) * 100)),
      },
      {
        id: 'streak-7',
        title: '7-Day Streak',
        tag: '7 DAYS',
        description: '7-day consecutive active streak',
        unlocked: maxStreak >= 7,
        color: '#FFC01E',
        requirement: `${maxStreak}/7 active days`,
        progressPercent: Math.min(100, Math.round((maxStreak / 7) * 100)),
      },
      {
        id: 'solved-10',
        title: 'Problem Solver',
        tag: '10 AC',
        description: 'Solved 10+ verified problems',
        unlocked: solvedCount >= 10,
        color: '#3B82F6',
        requirement: `${solvedCount}/10 solved`,
        progressPercent: Math.min(100, Math.round((solvedCount / 10) * 100)),
      },
      {
        id: 'solved-25',
        title: 'Algorithmic Knight',
        tag: '25 AC',
        description: 'Solved 25+ verified problems',
        unlocked: solvedCount >= 25,
        color: '#8B5CF6',
        requirement: `${solvedCount}/25 solved`,
        progressPercent: Math.min(100, Math.round((solvedCount / 25) * 100)),
      },
      {
        id: 'streak-30',
        title: '30-Day Streak',
        tag: '30 DAYS',
        description: '30-day algorithmic consistency streak',
        unlocked: maxStreak >= 30,
        color: '#F97316',
        requirement: `${maxStreak}/30 active days`,
        progressPercent: Math.min(100, Math.round((maxStreak / 30) * 100)),
      },
    ];
  }, [solvedCount, maxStreak]);

  const earned = useMemo(() => milestones.filter((m) => m.unlocked), [milestones]);
  const nextMilestone = useMemo(() => milestones.find((m) => !m.unlocked), [milestones]);

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border border-white/[0.07] bg-[#0E121B] shadow-sm space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Achievements
          </h4>
        </div>
        <Link
          to="/app/progress"
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
        >
          <span>{earned.length}/{milestones.length} Earned</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {earned.length > 0 ? (
        <div className="space-y-3">
          {/* List of earned badges horizontally */}
          <div className="flex items-center gap-2 flex-wrap">
            {earned.map((b) => (
              <div
                key={b.id}
                title={`${b.title}: ${b.description}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-200"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: b.color }}
                />
                <span className="font-semibold text-[11px]">{b.title}</span>
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
            ))}
          </div>

          {/* Next target to unlock */}
          {nextMilestone && (
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-500">Next unlock:</span>
              <span className="text-zinc-300 font-medium">
                {nextMilestone.title} ({nextMilestone.requirement})
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Calm, compact preview of upcoming milestones */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium text-[11px]">
              Next milestone: <strong className="text-white">First AC</strong>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">0/1 verified AC</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            <div className="h-full bg-[#00B8A3] rounded-full transition-all duration-500" style={{ width: '0%' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactAchievements;
