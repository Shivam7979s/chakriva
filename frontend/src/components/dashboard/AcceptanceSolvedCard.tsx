import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface AcceptanceSolvedCardProps {
  solvedCount?: number;
  totalProblems?: number;
  attemptingCount?: number;
  acceptanceRate?: number;
  totalSubmissions?: number;
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
  className?: string;
  loading?: boolean;
}

export const AcceptanceSolvedCard: React.FC<AcceptanceSolvedCardProps> = ({
  solvedCount,
  totalProblems,
  attemptingCount = 0,
  easySolved,
  easyTotal,
  mediumSolved,
  mediumTotal,
  hardSolved,
  hardTotal,
  className,
}) => {
  const displaySolved =
    solvedCount !== undefined ? solvedCount : easySolved + mediumSolved + hardSolved;
  const displayTotal =
    totalProblems !== undefined && totalProblems > 0
      ? totalProblems
      : easyTotal + mediumTotal + hardTotal > 0
      ? easyTotal + mediumTotal + hardTotal
      : 1;

  const safeTotal = displayTotal > 0 ? displayTotal : 1;
  const safeEasyTotal = easyTotal > 0 ? easyTotal : 1;
  const safeMedTotal = mediumTotal > 0 ? mediumTotal : 1;
  const safeHardTotal = hardTotal > 0 ? hardTotal : 1;

  // Attempted total
  const displayAttempted = attemptingCount > 0 ? displaySolved + attemptingCount : Math.max(displaySolved, 0);

  // SVG circular gauge geometry
  const cx = 56;
  const cy = 56;
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const progressRatio = Math.min(1, Math.max(0.02, displaySolved / safeTotal));
  const strokeDashoffset = circumference - progressRatio * circumference;

  const easyPct = Math.min(100, Math.round((easySolved / safeEasyTotal) * 100));
  const medPct = Math.min(100, Math.round((mediumSolved / safeMedTotal) * 100));
  const hardPct = Math.min(100, Math.round((hardSolved / safeHardTotal) * 100));

  return (
    <div
      className={cn(
        'p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-4 text-left',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <h3 className="text-sm font-bold text-white tracking-tight">Your progress</h3>
        <Link
          to="/app/progress"
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          <span>View detailed</span>
          <span>→</span>
        </Link>
      </div>

      {/* Main Content: Left circular gauge + Right difficulty bars */}
      <div className="flex items-center justify-between gap-6">
        {/* Left: Circular gauge */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg width={112} height={112} viewBox="0 0 112 112" className="rotate-[-90deg]">
              {/* Background track */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={7}
              />
              {/* Active cyan/emerald arc */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#00E5BE"
                strokeWidth={7}
                strokeDasharray={circumference}
                strokeDashoffset={displaySolved > 0 ? strokeDashoffset : circumference}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Center: Solved */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-sans text-2xl font-bold text-white tracking-tight">
                {displaySolved}
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Solved</span>
            </div>
          </div>

          {/* Under gauge: Attempted / Attempting */}
          <div className="text-center -mt-1">
            <div className="text-sm font-bold text-white">{displayAttempted}</div>
            <div className="text-[10px] text-zinc-400 font-medium">Attempting</div>
          </div>
        </div>

        {/* Right: Difficulty horizontal bars */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Easy */}
          <Link
            to="/problems?difficulty=easy"
            className="group flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-1.5 shrink-0 w-16">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A3]" />
              <span className="font-medium text-white group-hover:text-[#00E5A3] transition-colors">
                Easy
              </span>
            </div>
            <div className="h-1.5 flex-1 bg-zinc-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00E5A3] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(easySolved > 0 ? 8 : 0, easyPct)}%` }}
              />
            </div>
            <span className="font-sans font-bold text-white text-xs w-8 text-right shrink-0">
              {displaySolved === 0 ? `${easySolved}/2` : easySolved}
            </span>
          </Link>

          {/* Medium */}
          <Link
            to="/problems?difficulty=medium"
            className="group flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-1.5 shrink-0 w-16">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800]" />
              <span className="font-medium text-white group-hover:text-[#FFB800] transition-colors">
                Medium
              </span>
            </div>
            <div className="h-1.5 flex-1 bg-zinc-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFB800] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(mediumSolved > 0 ? 8 : 0, medPct)}%` }}
              />
            </div>
            <span className="font-sans font-bold text-white text-xs w-8 text-right shrink-0">
              {displaySolved === 0 ? `${mediumSolved}/3` : mediumSolved}
            </span>
          </Link>

          {/* Hard */}
          <Link
            to="/problems?difficulty=hard"
            className="group flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-1.5 shrink-0 w-16">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4D]" />
              <span className="font-medium text-white group-hover:text-[#FF4D4D] transition-colors">
                Hard
              </span>
            </div>
            <div className="h-1.5 flex-1 bg-zinc-800/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF4D4D] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(hardSolved > 0 ? 8 : 0, hardPct)}%` }}
              />
            </div>
            <span className="font-sans font-bold text-white text-xs w-8 text-right shrink-0">
              {displaySolved === 0 ? `${hardSolved}/1` : hardSolved}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptanceSolvedCard;
