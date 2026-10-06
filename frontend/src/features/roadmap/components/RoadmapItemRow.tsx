import React from 'react';
import { ProblemReferenceCard } from './ProblemReferenceCard';
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Lock,
  FastForward,
  Clock,
  BookOpen,
  Code2,
  Video,
  FileText,
  RotateCcw,
} from 'lucide-react';
import type { RoadmapItem, RoadmapItemStatus } from '../types';

interface RoadmapItemRowProps {
  item: RoadmapItem;
  onToggleComplete: (itemId: string) => void;
}

export const RoadmapItemRow: React.FC<RoadmapItemRowProps> = ({
  item,
  onToggleComplete,
}) => {
  const status: RoadmapItemStatus = item.status || 'AVAILABLE';
  const isLocked = status === 'LOCKED';
  const isCompleted = status === 'COMPLETED';

  const isProblemItem = Boolean(item.problemReference || item.itemType === 'PROBLEM');

  const renderStatusIcon = () => {
    if (isProblemItem) {
      switch (status) {
        case 'COMPLETED':
          return (
            <span
              title="Problem Solved (Verified by Judge)"
              className="text-[#00B8A3] inline-flex items-center justify-center"
              aria-label={`Problem '${item.title}' is solved`}
            >
              <CheckCircle2 className="w-5 h-5 fill-[#00B8A3]/20" />
              <span className="sr-only">[Solved]</span>
            </span>
          );
        case 'IN_PROGRESS':
          return (
            <span
              title="Problem Attempted — Solve in workspace to complete"
              className="text-amber-400 inline-flex items-center justify-center"
              aria-label={`Problem '${item.title}' has been attempted`}
            >
              <CircleDot className="w-5 h-5" />
              <span className="sr-only">[Attempted]</span>
            </span>
          );
        case 'LOCKED':
          return (
            <span
              title="Locked — Complete previous items to unlock"
              className="text-text-muted/60 inline-flex items-center justify-center"
              aria-disabled="true"
            >
              <Lock className="w-4 h-4" />
              <span className="sr-only">[Locked — Prerequisite Required]</span>
            </span>
          );
        case 'AVAILABLE':
        default:
          return (
            <span
              title="Problem Available — Solve in workspace to complete"
              className="text-text-muted hover:text-text-primary transition-colors inline-flex items-center justify-center"
              aria-label={`Problem '${item.title}' is available`}
            >
              <Circle className="w-5 h-5" />
              <span className="sr-only">[Available]</span>
            </span>
          );
      }
    }

    switch (status) {
      case 'COMPLETED':
        return (
          <button
            onClick={() => onToggleComplete(item.id)}
            aria-label={`Mark item '${item.title}' incomplete`}
            title="Completed — click to toggle"
            className="text-[#00B8A3] hover:text-[#00B8A3]/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00B8A3]"
          >
            <CheckCircle2 className="w-5 h-5 fill-[#00B8A3]/20" />
            <span className="sr-only">[Completed]</span>
          </button>
        );
      case 'IN_PROGRESS':
        return (
          <button
            onClick={() => onToggleComplete(item.id)}
            aria-label={`Mark item '${item.title}' completed`}
            title="In Progress — click to mark complete"
            className="text-primary hover:text-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <CircleDot className="w-5 h-5" />
            <span className="sr-only">[In Progress]</span>
          </button>
        );
      case 'SKIPPED':
        return (
          <span title="Skipped item" className="text-text-muted">
            <FastForward className="w-5 h-5" />
            <span className="sr-only">[Skipped]</span>
          </span>
        );
      case 'LOCKED':
        return (
          <span
            title="Locked — complete previous items to unlock"
            className="text-text-muted/60"
            aria-disabled="true"
          >
            <Lock className="w-4 h-4" />
            <span className="sr-only">[Locked — Prerequisite Required]</span>
          </span>
        );
      case 'AVAILABLE':
      default:
        return (
          <button
            onClick={() => onToggleComplete(item.id)}
            aria-label={`Mark item '${item.title}' completed`}
            title="Available — click to mark complete"
            className="text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <Circle className="w-5 h-5" />
            <span className="sr-only">[Available]</span>
          </button>
        );
    }
  };

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'PROBLEM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
            <Code2 className="w-3 h-3" />
            PROBLEM
          </span>
        );
      case 'VIDEO':
      case 'LECTURE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Video className="w-3 h-3" />
            LECTURE
          </span>
        );
      case 'ARTICLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileText className="w-3 h-3" />
            ARTICLE
          </span>
        );
      case 'REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#FFC01E]/10 text-[#FFC01E] border border-[#FFC01E]/20">
            <RotateCcw className="w-3 h-3" />
            REVISION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="w-3 h-3" />
            CONCEPT
          </span>
        );
    }
  };

  return (
    <div
      className={`p-3.5 rounded-lg border transition-all duration-200 ${
        isCompleted
          ? 'bg-surface-elevated/40 border-border/60 opacity-95'
          : isLocked
          ? 'bg-surface/30 border-border/40 opacity-60'
          : 'bg-surface-elevated border-border hover:border-border-strong'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Checkbox / Icon */}
        <div className="mt-0.5 shrink-0 flex items-center justify-center">
          {renderStatusIcon()}
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {getItemTypeBadge(item.itemType)}

            {item.required ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Required
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">
                Optional
              </span>
            )}

            <span className="text-text-muted text-xs">·</span>

            <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
              <Clock className="w-3 h-3" />
              {item.estimatedMinutes} min
            </span>

            {/* Accessible Status Text */}
            <span className="ml-auto text-[11px] font-mono font-medium">
              {isCompleted ? (
                <span className="text-[#00B8A3]">{isProblemItem ? 'Solved' : 'Completed'}</span>
              ) : status === 'IN_PROGRESS' ? (
                <span className="text-amber-400">{isProblemItem ? 'Attempted' : 'In Progress'}</span>
              ) : isLocked ? (
                <span className="text-text-muted">Prerequisite Required</span>
              ) : (
                <span className="text-text-secondary">Available</span>
              )}
            </span>
          </div>

          {/* Title */}
          <h4
            className={`text-sm font-semibold tracking-[-0.01em] ${
              isCompleted
                ? 'text-text-secondary line-through decoration-text-muted/60'
                : isLocked
                ? 'text-text-muted'
                : 'text-text-primary'
            }`}
          >
            {item.title}
          </h4>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Embedded Problem Reference if item type is PROBLEM */}
          {item.problemReference && (
            <ProblemReferenceCard reference={item.problemReference} />
          )}
        </div>
      </div>
    </div>
  );
};
