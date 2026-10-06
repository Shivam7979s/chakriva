import React from 'react';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { RefreshCw, Clock, Layers, Award } from 'lucide-react';
import type { Roadmap, ProgressSummary } from '../types';

interface RoadmapHeaderProps {
  roadmap: Roadmap;
  progressSummary: ProgressSummary;
  loading: boolean;
  onRefresh: () => void;
}

export const RoadmapHeader: React.FC<RoadmapHeaderProps> = ({
  roadmap,
  progressSummary,
  loading,
  onRefresh,
}) => {
  const { completedItems, totalItems, percentage } = progressSummary;

  return (
    <PageHeader
      badge="Engineering Structured Curriculum"
      title={roadmap.title}
      subtitle={roadmap.description}
      actions={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Track Completion Card */}
          <div className="p-4 rounded-lg border border-white/[0.08] bg-[#181C28] w-full sm:w-80 space-y-2.5 shadow-elevation-1">
            <div className="flex items-center justify-between text-xs font-mono font-semibold tracking-wider text-text-muted uppercase">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <Award className="w-3.5 h-3.5 text-primary" />
                TRACK COMPLETION
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <span className="text-xs font-mono text-text-secondary">
                <span className="text-sm font-bold text-text-primary tabular-nums">{completedItems}</span> / {totalItems} items
              </span>
              <span className="text-sm font-mono font-bold text-[#00B8A3] tabular-nums">
                {percentage}%
              </span>
            </div>

            {/* Subtle Progress Bar */}
            <div
              className="w-full bg-[#1C212E] h-1.5 rounded-full overflow-hidden border border-white/[0.04]"
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Track completion progress: ${percentage}%`}
            >
              <div
                className="bg-[#00B8A3] h-full transition-all duration-300 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono pt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-text-muted" />
                {roadmap.estimatedDuration}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-text-muted" />
                {roadmap.sprints.length} Sprints
              </span>
            </div>
          </div>

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh curriculum progress"
            title="Sync curriculum progress"
            className="p-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center shrink-0 self-start sm:self-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      }
    />
  );
};
