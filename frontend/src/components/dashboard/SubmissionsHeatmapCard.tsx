import React, { useMemo, useState } from 'react';
import { Flame, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildRolling12MonthCalendar,
  type CalendarResult,
} from '@/lib/heatmapUtils';

export interface SubmissionsHeatmapCardProps {
  activityMap?: Record<string, number>;
  acceptedMap?: Record<string, number>;
  totalSubmissions?: number;
  totalActiveDays?: number;
  maxStreak?: number;
  selectedDate?: string | null;
  onSelectDate?: (dateStr: string | null) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  showDropdown?: boolean;
}

export const SubmissionsHeatmapCard: React.FC<SubmissionsHeatmapCardProps> = ({
  activityMap = {},
  acceptedMap = {},
  totalSubmissions: _totalSubmissions,
  totalActiveDays,
  maxStreak = 0,
  selectedDate,
  onSelectDate,
  className,
  title = 'Your activity',
  subtitle,
  showDropdown = false,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    formattedDate: string;
    count: number;
    acceptedCount: number;
    isToday: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Generate genuine rolling 12-month calendar ending on current date
  const calendar: CalendarResult = useMemo(() => {
    return buildRolling12MonthCalendar({
      activityMap,
      acceptedMap,
    });
  }, [activityMap, acceptedMap]);

  const displayActiveDays =
    totalActiveDays !== undefined ? totalActiveDays : calendar.activeDays;
  const displayMaxStreak =
    maxStreak !== undefined && maxStreak > calendar.maxStreak
      ? maxStreak
      : calendar.maxStreak;

  // 5-tier intensity color mapper matching the reference screenshot
  const getCellFill = (count: number) => {
    if (count === 0) return '#1A202C'; // Crisp dark charcoal inactive cell
    if (count <= 2) return '#15803D'; // Level 1 - Forest green
    if (count <= 5) return '#16A34A'; // Level 2 - Medium green
    if (count <= 9) return '#22C55E'; // Level 3 - Bright grass green
    if (count <= 14) return '#4ADE80'; // Level 4 - Vibrant light green
    return '#86EFAC';                 // Level 5 - Pale lime peak green
  };

  return (
    <div
      className={cn(
        'p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm relative overflow-hidden space-y-4 w-full h-full text-left',
        className
      )}
    >
      {/* Top Header: Activity title + Dropdown OR Metrics */}
      <div className="space-y-1.5 select-none">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Activity Title */}
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <h3 className="font-bold text-white text-sm tracking-tight">{title}</h3>
          </div>

          {/* Right: Active days & Max streak OR Dropdown */}
          {showDropdown ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300">
              <span>Past Year</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span>
                <strong className="text-zinc-300 font-semibold">{displayActiveDays}</strong> active days
              </span>
              <span className="text-zinc-600">|</span>
              <span>
                Max streak: <strong className="text-zinc-300 font-semibold">{displayMaxStreak}</strong>
              </span>
              {selectedDate && (
                <div className="inline-flex items-center gap-1.5 ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <span>{selectedDate}</span>
                  <button
                    type="button"
                    onClick={() => onSelectDate?.(null)}
                    className="hover:text-white transition-colors"
                    title="Clear date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtitle */}
        <p className="text-[11px] text-zinc-400">
          {subtitle || 'Your coding activity over the past year.'}
        </p>
      </div>

      {/* Heatmap Responsive SVG Visualization (Matches exact LeetCode layout) */}
      <div className="overflow-x-auto no-scrollbar select-none pt-0.5">
        <div className="w-[716px] max-w-full">
          <svg
            viewBox="0 0 716 116"
            className="w-[716px] h-auto select-none overflow-visible block"
            role="grid"
            aria-label="Annual submission activity calendar"
          >
            {/* 53 Columns of 7 Day Rectangles with Weekday Offsets */}
            {calendar.weeks.map((week) => (
              <g key={`week-${week.weekIndex}`}>
                {week.days.map((day) => {
                  // Omit cells outside the rolling 365-day range (weekday offsets at start and end)
                  if (!day.isInRange) return null;

                  const rx = week.weekIndex * 13.5;
                  const ry = day.dayOfWeek * 13.5;
                  const isSelected = selectedDate === day.dateStr;

                  return (
                    <rect
                      key={day.dateStr}
                      x={rx}
                      y={ry}
                      width={10.5}
                      height={10.5}
                      rx={2.5}
                      fill={getCellFill(day.count)}
                      stroke={
                        isSelected
                          ? '#FFFFFF'
                          : day.isToday
                          ? '#38BDF8'
                          : 'none'
                      }
                      strokeWidth={isSelected ? 1.5 : day.isToday ? 1 : 0}
                      className="transition-colors cursor-pointer hover:brightness-125 focus:outline-none focus:stroke-white focus:stroke-[1.5]"
                      tabIndex={0}
                      role="gridcell"
                      aria-label={`${day.formattedDate}${
                        day.isToday ? ' (Today)' : ''
                      } — ${
                        day.count === 0
                          ? 'No submissions'
                          : `${day.count} submission${day.count === 1 ? '' : 's'}`
                      }`}
                      onClick={() => {
                        if (selectedDate === day.dateStr) {
                          onSelectDate?.(null);
                        } else {
                          onSelectDate?.(day.dateStr);
                        }
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          dateStr: day.dateStr,
                          formattedDate: day.formattedDate,
                          count: day.count,
                          acceptedCount: day.acceptedCount,
                          isToday: day.isToday,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      onFocus={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          dateStr: day.dateStr,
                          formattedDate: day.formattedDate,
                          count: day.count,
                          acceptedCount: day.acceptedCount,
                          isToday: day.isToday,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onBlur={() => setHoveredCell(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (selectedDate === day.dateStr) {
                            onSelectDate?.(null);
                          } else {
                            onSelectDate?.(day.dateStr);
                          }
                        }
                      }}
                    />
                  );
                })}
              </g>
            ))}

            {/* Month Column Headers placed BELOW the grid */}
            {calendar.monthHeaders.map((header) => {
              const x = Math.min(header.weekIndex * 13.5, 712.5 - 24);
              return (
                <text
                  key={`month-${header.year}-${header.month}-${header.weekIndex}`}
                  x={x}
                  y={108}
                  fill="#8A92A0"
                  fontSize="10"
                  fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                  fontWeight="400"
                >
                  {header.month}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Floating Hover Tooltip: “Oct 12, 2026 — 4 submissions” */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-md bg-zinc-950/95 text-zinc-100 text-xs font-mono border border-zinc-700 shadow-xl"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 8}px`,
          }}
        >
          <span className="font-semibold text-white">
            {hoveredCell.formattedDate}
            {hoveredCell.isToday && (
              <span className="text-[#38BDF8] ml-1 font-normal">(Today)</span>
            )}
            {' — '}
            {hoveredCell.count === 0
              ? 'No submissions'
              : `${hoveredCell.count} ${
                  hoveredCell.count === 1 ? 'submission' : 'submissions'
                }`}
          </span>
          {hoveredCell.count > 0 &&
            hoveredCell.acceptedCount > 0 &&
            hoveredCell.acceptedCount !== hoveredCell.count && (
              <span className="text-cyan-400 ml-1.5">
                ({hoveredCell.acceptedCount} accepted)
              </span>
            )}
        </div>
      )}
    </div>
  );
};

export default SubmissionsHeatmapCard;
