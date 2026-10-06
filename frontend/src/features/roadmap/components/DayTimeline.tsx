import React from 'react';
import { RoadmapItemRow } from './RoadmapItemRow';
import {
  CheckCircle2,
  Lock,
  CircleDot,
  Circle,
  Target,
  ListOrdered,
} from 'lucide-react';
import type { RoadmapDay } from '../types';

interface DayTimelineProps {
  day: RoadmapDay;
  onToggleComplete: (itemId: string) => void;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  day,
  onToggleComplete,
}) => {
  const status = day.status || 'AVAILABLE';
  const isLocked = status === 'LOCKED';
  const isCompleted = status === 'COMPLETED';
  const isInProgress = status === 'IN_PROGRESS';

  const requiredItems = day.items.filter((i) => i.required);
  const evalItems = requiredItems.length > 0 ? requiredItems : day.items;
  const completedCount = evalItems.filter((i) => i.status === 'COMPLETED').length;
  const totalCount = evalItems.length;

  const renderStatusBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#00B8A3]/10 text-[#00B8A3] border border-[#00B8A3]/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          COMPLETED
        </span>
      );
    }
    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-white/[0.04] text-text-muted border border-border">
          <Lock className="w-3.5 h-3.5" />
          LOCKED
        </span>
      );
    }
    if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
          <CircleDot className="w-3.5 h-3.5" />
          IN PROGRESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-surface-subtle text-text-muted border border-border">
        <Circle className="w-3.5 h-3.5" />
        AVAILABLE
      </span>
    );
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isCompleted
          ? 'bg-surface/50 border-border/80'
          : isLocked
          ? 'bg-surface/20 border-border/40 opacity-75'
          : isInProgress
          ? 'bg-surface border-primary/40 shadow-elevation-1'
          : 'bg-surface border-border shadow-elevation-1'
      } p-4 sm:p-5 space-y-4`}
    >
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              DAY {day.dayNumber}
            </span>
            <h3 className="text-base font-semibold text-text-primary tracking-[-0.01em]">
              {day.title}
            </h3>
          </div>
          {day.description && (
            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
              {day.description}
            </p>
          )}
          {isLocked && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono pt-0.5">
              <Lock className="w-3 h-3 text-text-muted shrink-0" />
              <span>Complete Day {day.dayNumber - 1} to unlock this day.</span>
            </div>
          )}
        </div>

        {/* Progress & Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-mono font-medium text-text-secondary">
              <strong className="text-text-primary font-bold">{completedCount}</strong> / {totalCount} items
            </div>
            <div className="w-24 bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-white/[0.04] mt-1">
              <div
                className="bg-[#00B8A3] h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Learning Objectives (if present) */}
      {day.learningObjectives && day.learningObjectives.length > 0 && (
        <div className="rounded-md bg-surface-subtle/60 p-3 border border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-2">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span>Learning Objectives</span>
          </div>
          <ul className="space-y-1 text-xs text-text-secondary pl-5 list-disc">
            {day.learningObjectives.map((obj, idx) => (
              <li key={idx} className="leading-relaxed">
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Learning Items List */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted uppercase tracking-wider">
          <ListOrdered className="w-3.5 h-3.5 text-text-muted" />
          <span>Curriculum Items ({day.items.length})</span>
        </div>
        <div className="space-y-2">
          {day.items.map((item) => (
            <RoadmapItemRow
              key={item.id}
              item={item}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
