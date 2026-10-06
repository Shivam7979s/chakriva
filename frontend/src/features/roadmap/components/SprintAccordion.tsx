import React, { useState } from 'react';
import { DayTimeline } from './DayTimeline';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  Lock,
  CircleDot,
} from 'lucide-react';
import type { RoadmapSprint } from '../types';

interface SprintAccordionProps {
  sprint: RoadmapSprint;
  isActiveSprint?: boolean;
  isDefaultExpanded?: boolean;
  onToggleComplete: (itemId: string) => void;
  prerequisiteSprintTitle?: string;
}

export const SprintAccordion: React.FC<SprintAccordionProps> = ({
  sprint,
  isActiveSprint = false,
  isDefaultExpanded = true,
  onToggleComplete,
  prerequisiteSprintTitle,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isDefaultExpanded);
  const status = sprint.status || 'AVAILABLE';
  const isCompleted = status === 'COMPLETED';
  const isLocked = status === 'LOCKED';
  const isActive = isActiveSprint || status === 'IN_PROGRESS';

  const completedDays = sprint.days.filter((d) => d.status === 'COMPLETED').length;
  const totalDays = sprint.days.length;
  const percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Clean title without repeating "Sprint X — "
  const displayTitle = sprint.title.replace(/^Sprint\s+\d+\s*[-—:]\s*/i, '');

  const renderSprintBadge = () => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#00B8A3]/10 text-[#00B8A3] border border-[#00B8A3]/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          COMPLETED
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
          <CircleDot className="w-3.5 h-3.5" />
          ACTIVE
        </span>
      );
    }
    if (isLocked) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-white/[0.04] text-text-muted border border-border">
          <Lock className="w-3.5 h-3.5" />
          LOCKED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-surface-subtle text-text-muted border border-border">
        UPCOMING
      </span>
    );
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'bg-surface border-primary/50 shadow-elevation-1'
          : isCompleted
          ? 'bg-surface/50 border-border/80'
          : isLocked
          ? 'bg-surface/20 border-border/40 opacity-80'
          : 'bg-surface border-border shadow-elevation-1'
      }`}
    >
      {/* Sprint Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 bg-surface-elevated/60 hover:bg-surface-elevated cursor-pointer transition-colors select-none"
      >
        <div className="flex flex-col gap-3">
          {/* Top Line: Position and State Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={isExpanded ? 'Collapse Sprint' : 'Expand Sprint'}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-text-secondary">
                Sprint {sprint.position}
              </span>
            </div>

            <div>{renderSprintBadge()}</div>
          </div>

          {/* Main Title & Description */}
          <div className="pl-6 sm:pl-6 space-y-1">
            <h2
              className={`text-base sm:text-lg font-semibold tracking-[-0.01em] ${
                isActive
                  ? 'text-text-primary'
                  : isLocked
                  ? 'text-text-secondary'
                  : 'text-text-primary'
              }`}
            >
              {displayTitle}
            </h2>

            {sprint.description && (
              <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
                {sprint.description}
              </p>
            )}

            {/* Locked Prerequisite Message */}
            {isLocked && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted pt-1 font-mono">
                <Lock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>
                  Complete {prerequisiteSprintTitle || `Sprint ${sprint.position - 1}`} to unlock this sprint.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Metrics Bar */}
          <div className="pl-6 sm:pl-6 pt-1 flex items-center justify-between border-t border-border/40 mt-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <span>~{sprint.estimatedHours} hrs</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-text-secondary">
                <strong className="text-text-primary font-bold">{completedDays}</strong> / {totalDays} {totalDays === 1 ? 'day' : 'days'}
              </span>

              <div className="w-24 bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-[#00B8A3] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sprint Days Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-surface/40 border-t border-border space-y-5">
          {sprint.days.map((day) => (
            <DayTimeline
              key={day.id}
              day={day}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
