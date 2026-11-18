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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#131826] text-[#7C8BA6] border border-[#1B2234]">
          <Lock className="w-3.5 h-3.5" />
          LOCKED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#131826] text-[#8592A8] border border-[#1B2234]">
        UPCOMING
      </span>
    );
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'bg-[#0F131D] border-[#3B82F6]/40'
          : isCompleted
          ? 'bg-[#0F131D] border-[#1A2133]'
          : isLocked
          ? 'bg-[#0B0E16] border-[#151B2B] opacity-80'
          : 'bg-[#0F131D] border-[#192033]'
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
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <span className="text-xs font-semibold text-text-secondary">
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
          <div className="pl-6 sm:pl-6 pt-2 flex items-center justify-between border-t border-[#171D2D] mt-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <span>~{sprint.estimatedHours} hrs</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-text-secondary">
                <strong className="text-text-primary font-bold">{completedDays}</strong> / {totalDays} {totalDays === 1 ? 'day' : 'days'}
              </span>

              <div className="w-24 bg-[#141A29] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#3B82F6] to-[#00B8A3] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sprint Days Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-[#0B0E16] border-t border-[#171D2D] space-y-5">
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
