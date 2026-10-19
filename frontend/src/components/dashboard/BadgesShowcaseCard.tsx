import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BadgesShowcaseCardProps {
  solvedCount?: number;
  maxStreak?: number;
  score?: number;
  hasCollege?: boolean;
  className?: string;
  badgeCount?: number;
  recentBadgeTitle?: string;
}

interface BadgeSpec {
  id: string;
  title: string;
  tag: string;
  description: string;
  unlocked: boolean;
  type: 'first_ac' | 'streak_7' | 'solved_10' | 'solved_25' | 'streak_30' | 'streak_50' | 'streak_100' | 'campus';
  color: string;
}

export const BadgesShowcaseCard: React.FC<BadgesShowcaseCardProps> = ({
  solvedCount = 0,
  maxStreak = 0,
  score = 0,
  hasCollege = false,
  className,
  badgeCount: explicitBadgeCount,
  recentBadgeTitle: explicitRecentBadgeTitle,
}) => {
  // Real milestone definitions evaluated against user stats
  const allMilestones: BadgeSpec[] = useMemo(() => {
    return [
      {
        id: 'badge-first-ac',
        title: 'First AC',
        tag: '1 AC',
        description: 'Solved first algorithmic challenge',
        unlocked: solvedCount >= 1,
        type: 'first_ac',
        color: '#00B8A3',
      },
      {
        id: 'badge-7-day-streak',
        title: '7 Days Badge 2026',
        tag: '7 DAYS',
        description: '7-day consecutive active streak',
        unlocked: maxStreak >= 7,
        type: 'streak_7',
        color: '#FFC01E',
      },
      {
        id: 'badge-solved-10',
        title: 'Problem Solver',
        tag: '10 AC',
        description: 'Solved 10+ verified problems',
        unlocked: solvedCount >= 10,
        type: 'solved_10',
        color: '#3B82F6',
      },
      {
        id: 'badge-solved-25',
        title: 'Algorithmic Knight',
        tag: '25 AC',
        description: 'Solved 25+ verified problems',
        unlocked: solvedCount >= 25,
        type: 'solved_25',
        color: '#8B5CF6',
      },
      {
        id: 'badge-30-day-streak',
        title: '30 Days Badge 2026',
        tag: '30 DAYS',
        description: '30-day algorithmic consistency streak',
        unlocked: maxStreak >= 30,
        type: 'streak_30',
        color: '#F97316',
      },
      {
        id: 'badge-50-day-streak',
        title: '50 Days Badge 2026',
        tag: '50 DAYS',
        description: '50-day consistency milestone',
        unlocked: maxStreak >= 50,
        type: 'streak_50',
        color: '#22C55E',
      },
      {
        id: 'badge-100-day-streak',
        title: '100 Days Badge 2026',
        tag: '100 DAYS',
        description: '100-day legendary streak',
        unlocked: maxStreak >= 100,
        type: 'streak_100',
        color: '#3B82F6',
      },
      {
        id: 'badge-campus',
        title: 'Campus Contender',
        tag: 'CAMPUS',
        description: 'Affiliated with university cohort',
        unlocked: Boolean(hasCollege) && (solvedCount >= 1 || score > 0),
        type: 'campus',
        color: '#EC4899',
      },
    ];
  }, [solvedCount, maxStreak, score, hasCollege]);

  const unlockedBadges = useMemo(
    () => allMilestones.filter((b) => b.unlocked),
    [allMilestones]
  );

  const displayCount =
    explicitBadgeCount !== undefined ? explicitBadgeCount : unlockedBadges.length;

  const displayRecentTitle = useMemo(() => {
    if (explicitRecentBadgeTitle) return explicitRecentBadgeTitle;
    if (unlockedBadges.length > 0) {
      return unlockedBadges[unlockedBadges.length - 1].title;
    }
    return 'No badges unlocked yet';
  }, [explicitRecentBadgeTitle, unlockedBadges]);

  const nextMilestone = useMemo(
    () => allMilestones.find((b) => !b.unlocked) || allMilestones[0],
    [allMilestones]
  );

  // Pick up to 2 badges to showcase
  const showcasedBadges = useMemo(() => {
    if (unlockedBadges.length >= 2) {
      return [
        unlockedBadges[unlockedBadges.length - 2],
        unlockedBadges[unlockedBadges.length - 1],
      ];
    }
    if (unlockedBadges.length === 1) {
      return [unlockedBadges[0], nextMilestone];
    }
    // Zero unlocked: show next target badge
    return [nextMilestone];
  }, [unlockedBadges, nextMilestone]);

  const renderHexBadge = (badge: BadgeSpec, isLocked: boolean) => {
    if (isLocked) {
      return (
        <div
          key={badge.id}
          className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
        >
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-60">
              <polygon
                points="50,6 88,28 88,72 50,94 12,72 12,28"
                fill="#121620"
                stroke="#334155"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinejoin="round"
              />
              <circle cx="50" cy="50" r="18" fill="#1E293B" opacity="0.5" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
              <Lock className="w-5 h-5 text-zinc-500 mb-0.5" />
              <span className="text-[9px] font-mono font-bold tracking-tight text-zinc-400">
                LOCKED
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-1">
            Next: {badge.tag}
          </span>
        </div>
      );
    }

    // Unlocked 50 Days Badge
    if (badge.type === 'streak_50') {
      return (
        <div
          key={badge.id}
          className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
        >
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-[0_4px_16px_rgba(34,197,94,0.35)]"
            >
              <defs>
                <linearGradient id="silver-hex-50" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="40%" stopColor="#475569" />
                  <stop offset="70%" stopColor="#64748B" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
                <radialGradient id="green-core-50" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#86EFAC" />
                  <stop offset="30%" stopColor="#22C55E" />
                  <stop offset="75%" stopColor="#16A34A" />
                  <stop offset="100%" stopColor="#14532D" />
                </radialGradient>
              </defs>
              <polygon
                points="50,6 88,28 88,72 50,94 12,72 12,28"
                fill="#161A23"
                stroke="url(#silver-hex-50)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 44 32 L 32 32 L 30 45 C 32 43 36 42 41 43 C 47 44 49 48 49 54 C 49 61 44 65 37 65 C 32 65 29 62 27 59"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="65"
                cy="50"
                r="18"
                fill="url(#green-core-50)"
                stroke="#4ADE80"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <span className="text-[10px] font-mono text-zinc-300 mt-1">50 Days</span>
        </div>
      );
    }

    // Unlocked 100 Days Badge
    if (badge.type === 'streak_100') {
      return (
        <div
          key={badge.id}
          className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
        >
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-[0_4px_18px_rgba(59,130,246,0.45)]"
            >
              <defs>
                <linearGradient id="chrome-border-100" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F1F5F9" />
                  <stop offset="40%" stopColor="#64748B" />
                  <stop offset="70%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>
                <radialGradient id="blue-core-100" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#93C5FD" />
                  <stop offset="25%" stopColor="#3B82F6" />
                  <stop offset="70%" stopColor="#1D4ED8" />
                  <stop offset="100%" stopColor="#172554" />
                </radialGradient>
              </defs>
              <polygon
                points="50,6 88,28 88,72 50,94 12,72 12,28"
                fill="#141824"
                stroke="url(#chrome-border-100)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M 33 40 L 37 36 L 37 64 M 33 64 L 41 64"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="54"
                cy="50"
                r="15"
                fill="url(#blue-core-100)"
                stroke="#60A5FA"
                strokeWidth="1.5"
              />
              <circle
                cx="71"
                cy="50"
                r="15"
                fill="url(#blue-core-100)"
                stroke="#93C5FD"
                strokeWidth="1.5"
                opacity="0.9"
              />
            </svg>
          </div>
          <span className="text-[10px] font-mono text-zinc-300 mt-1">100 Days</span>
        </div>
      );
    }

    // Default Unlocked Milestone (First AC, 7 Days, 10 Solved, etc.)
    return (
      <div
        key={badge.id}
        className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105"
      >
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-[0_4px_16px_rgba(0,184,163,0.35)]"
          >
            <defs>
              <linearGradient id={`grad-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
            </defs>
            <polygon
              points="50,6 88,28 88,72 50,94 12,72 12,28"
              fill="#141824"
              stroke={`url(#grad-${badge.id})`}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle
              cx="50"
              cy="50"
              r="22"
              fill={badge.color}
              opacity="0.2"
              stroke={badge.color}
              strokeWidth="1.5"
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {badge.tag}
            </text>
          </svg>
        </div>
        <span className="text-[10px] font-mono text-zinc-300 mt-1">
          {badge.title}
        </span>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#141721] shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between relative overflow-hidden',
        className
      )}
    >
      {/* Top Header: Badges count + View All Arrow */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs text-zinc-400 font-medium block">Badges</span>
          <span className="text-3xl font-extrabold text-white font-mono tracking-tight block mt-0.5">
            {displayCount}
          </span>
        </div>
        <Link
          to="/app/progress"
          title="View all badges"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ArrowRight className="w-5 h-5 stroke-[2]" />
        </Link>
      </div>

      {/* Center: Dynamic Badges Showcase based on real user accomplishments */}
      <div className="py-2.5 flex items-center justify-center gap-7">
        {showcasedBadges.map((badge) =>
          renderHexBadge(badge, !badge.unlocked)
        )}
      </div>

      {/* Bottom Footer: Most Recent Badge or Next Target */}
      <div className="pt-2 border-t border-white/[0.05]">
        <span className="text-[11px] text-zinc-400 block">
          {unlockedBadges.length > 0 ? 'Most Recent Badge' : 'Next Milestone Goal'}
        </span>
        <span className="text-xs sm:text-sm font-bold text-white block mt-0.5 tracking-tight truncate">
          {unlockedBadges.length > 0
            ? displayRecentTitle
            : `${nextMilestone.title} — ${nextMilestone.description}`}
        </span>
      </div>
    </div>
  );
};

export default BadgesShowcaseCard;
