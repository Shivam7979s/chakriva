import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SolvedProblemGaugeProps {
  solved: number;
  total: number;
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
  attemptingCount?: number;
  className?: string;
  loading?: boolean;
}

// Polar to Cartesian coordinate converter for SVG Arc paths
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

// Generate SVG arc path string from startAngle to endAngle
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const delta = Math.min(359.99, Math.max(0.1, endAngle - startAngle));
  const effectiveEnd = startAngle + delta;

  const start = polarToCartesian(cx, cy, r, effectiveEnd);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = delta <= 180 ? '0' : '1';

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export const SolvedProblemGauge: React.FC<SolvedProblemGaugeProps> = ({
  solved,
  total,
  easySolved,
  easyTotal,
  mediumSolved,
  mediumTotal,
  hardSolved,
  hardTotal,
  attemptingCount = 0,
  className,
  loading = false,
}) => {
  // Safe denominators
  const safeTotal = total > 0 ? total : 1;
  const safeEasyTotal = easyTotal > 0 ? easyTotal : 1;
  const safeMedTotal = mediumTotal > 0 ? mediumTotal : 1;
  const safeHardTotal = hardTotal > 0 ? hardTotal : 1;

  // Arc geometry specifications
  const cx = 100;
  const cy = 96;
  const r = 74;
  const strokeWidth = 9;

  // 260° sweep leaving 100° open at bottom
  const totalSweep = 260;
  const startBaseAngle = 230;
  const gapAngle = 5; // 5° gap between sectors

  // Sector angular proportions
  const easyRatio = Math.max(0.2, easyTotal / safeTotal);
  const medRatio = Math.max(0.35, mediumTotal / safeTotal);
  const hardRatio = Math.max(0.2, hardTotal / safeTotal);
  const ratioSum = easyRatio + medRatio + hardRatio;

  const usableSweep = totalSweep - 2 * gapAngle;
  const easySpan = (easyRatio / ratioSum) * usableSweep;
  const medSpan = (medRatio / ratioSum) * usableSweep;
  const hardSpan = (hardRatio / ratioSum) * usableSweep;

  // Easy sector
  const easyStart = startBaseAngle;
  const easyEnd = easyStart + easySpan;
  const easyProgressPercent = Math.min(1, Math.max(0, easySolved / safeEasyTotal));
  const easyActiveEnd = easyStart + easySpan * easyProgressPercent;

  // Medium sector
  const medStart = easyEnd + gapAngle;
  const medEnd = medStart + medSpan;
  const medProgressPercent = Math.min(1, Math.max(0, mediumSolved / safeMedTotal));
  const medActiveEnd = medStart + medSpan * medProgressPercent;

  // Hard sector
  const hardStart = medEnd + gapAngle;
  const hardEnd = hardStart + hardSpan;
  const hardProgressPercent = Math.min(1, Math.max(0, hardSolved / safeHardTotal));
  const hardActiveEnd = hardStart + hardSpan * hardProgressPercent;

  // Percentages for micro-progress bars
  const easyPct = Math.round((easySolved / safeEasyTotal) * 100);
  const medPct = Math.round((mediumSolved / safeMedTotal) * 100);
  const hardPct = Math.round((hardSolved / safeHardTotal) * 100);
  const overallPct = ((solved / safeTotal) * 100).toFixed(1);

  return (
    <div
      className={cn(
        'p-5 sm:p-6 rounded-2xl border border-white/[0.07] bg-[#0D111A] shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden',
        className
      )}
    >
      {/* Subtle background radial ambient glow */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* LEFT: LeetCode-Style Circular Arc Gauge */}
      <div className="relative flex flex-col items-center justify-center shrink-0">
        <svg
          width={200}
          height={195}
          viewBox="0 0 200 195"
          className="overflow-visible select-none"
        >
          <defs>
            <filter id="easy-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00B8A3" floodOpacity="0.4" />
            </filter>
            <filter id="med-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FFC01E" floodOpacity="0.4" />
            </filter>
            <filter id="hard-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FF375F" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* 1. EASY TRACK & ACTIVE */}
          <path
            d={describeArc(cx, cy, r, easyStart, easyEnd)}
            fill="none"
            stroke="rgba(0, 184, 163, 0.16)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {easySolved > 0 && (
            <path
              d={describeArc(cx, cy, r, easyStart, easyActiveEnd)}
              fill="none"
              stroke="#00B8A3"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter="url(#easy-glow)"
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* 2. MEDIUM TRACK & ACTIVE */}
          <path
            d={describeArc(cx, cy, r, medStart, medEnd)}
            fill="none"
            stroke="rgba(255, 192, 30, 0.16)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {mediumSolved > 0 && (
            <path
              d={describeArc(cx, cy, r, medStart, medActiveEnd)}
              fill="none"
              stroke="#FFC01E"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter="url(#med-glow)"
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* 3. HARD TRACK & ACTIVE */}
          <path
            d={describeArc(cx, cy, r, hardStart, hardEnd)}
            fill="none"
            stroke="rgba(255, 55, 95, 0.16)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {hardSolved > 0 && (
            <path
              d={describeArc(cx, cy, r, hardStart, hardActiveEnd)}
              fill="none"
              stroke="#FF375F"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter="url(#hard-glow)"
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>

        {/* Central Counter Display */}
        <div className="absolute top-[48px] inset-x-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          {loading ? (
            <div className="h-8 w-16 bg-white/[0.06] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                {solved}
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-zinc-400">
                /{total}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00B8A3] mt-1">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Solved</span>
            <span className="text-[10px] font-mono text-zinc-500 font-normal">({overallPct}%)</span>
          </div>
        </div>

        {/* Bottom Gap: Attempting Counter Pill */}
        <div className="mt-[-20px] text-center z-10">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
            <strong className="text-zinc-200">{attemptingCount}</strong> Attempting
          </span>
        </div>
      </div>

      {/* RIGHT: High-End Difficulty Breakdown Panel with Micro-Progress Bars */}
      <div className="w-full flex-1 md:max-w-xs space-y-2.5">
        {/* EASY CARD */}
        <Link
          to="/problems?difficulty=easy"
          className="group block p-3 rounded-xl border border-white/[0.06] bg-[#141824]/80 hover:bg-[#182030] hover:border-[#00B8A3]/40 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#00B8A3] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00B8A3] shadow-[0_0_6px_rgba(0,184,163,0.6)]" />
              Easy
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <strong className="text-white text-xs font-bold tabular-nums">{easySolved}</strong>
              <span className="text-zinc-500 text-[11px]">/{easyTotal}</span>
              <span className="text-zinc-400 text-[10px] ml-1">({easyPct}%)</span>
            </div>
          </div>
          <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#00B8A3] h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(easySolved > 0 ? 3 : 0, easyPct)}%` }}
            />
          </div>
        </Link>

        {/* MEDIUM CARD */}
        <Link
          to="/problems?difficulty=medium"
          className="group block p-3 rounded-xl border border-white/[0.06] bg-[#141824]/80 hover:bg-[#182030] hover:border-[#FFC01E]/40 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#FFC01E] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFC01E] shadow-[0_0_6px_rgba(255,192,30,0.6)]" />
              Medium
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <strong className="text-white text-xs font-bold tabular-nums">{mediumSolved}</strong>
              <span className="text-zinc-500 text-[11px]">/{mediumTotal}</span>
              <span className="text-zinc-400 text-[10px] ml-1">({medPct}%)</span>
            </div>
          </div>
          <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FFC01E] h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(mediumSolved > 0 ? 3 : 0, medPct)}%` }}
            />
          </div>
        </Link>

        {/* HARD CARD */}
        <Link
          to="/problems?difficulty=hard"
          className="group block p-3 rounded-xl border border-white/[0.06] bg-[#141824]/80 hover:bg-[#182030] hover:border-[#FF375F]/40 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[#FF375F] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF375F] shadow-[0_0_6px_rgba(255,55,95,0.6)]" />
              Hard
            </span>
            <div className="flex items-baseline gap-1 font-mono">
              <strong className="text-white text-xs font-bold tabular-nums">{hardSolved}</strong>
              <span className="text-zinc-500 text-[11px]">/{hardTotal}</span>
              <span className="text-zinc-400 text-[10px] ml-1">({hardPct}%)</span>
            </div>
          </div>
          <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FF375F] h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(hardSolved > 0 ? 3 : 0, hardPct)}%` }}
            />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default SolvedProblemGauge;
