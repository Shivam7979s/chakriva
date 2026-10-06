import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/actions/Button';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import {
  Sparkles,
  ArrowRight,
  Clock,
  BookOpen,
  Code2,
  Video,
  FileText,
  RotateCcw,
  CheckCircle2,
  Check,
} from 'lucide-react';
import type { ContinueLearningTarget } from '../types';

interface ContinueLearningBannerProps {
  target: ContinueLearningTarget | null;
  onMarkComplete?: (itemId: string) => void;
  isAllCompleted?: boolean;
}

export const ContinueLearningBanner: React.FC<ContinueLearningBannerProps> = ({
  target,
  onMarkComplete,
  isAllCompleted = false,
}) => {
  if (isAllCompleted) {
    return (
      <div className="rounded-lg border border-[#00B8A3]/30 bg-[#00B8A3]/[0.05] p-5 shadow-elevation-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00B8A3]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#00B8A3]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Roadmap Complete
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              You've completed every required item in this track. Time to practice mock interviews or explore advanced tracks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!target) {
    return (
      <div className="rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Ready to begin
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">
              Start with Sprint 1 · Day 1.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'PROBLEM':
        return <Code2 className="w-4 h-4 text-primary" />;
      case 'VIDEO':
      case 'LECTURE':
        return <Video className="w-4 h-4 text-blue-400" />;
      case 'ARTICLE':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'REVISION':
        return <RotateCcw className="w-4 h-4 text-[#FFC01E]" />;
      default:
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
    }
  };

  const isProblem = target.itemType === 'PROBLEM' && Boolean(target.problemSlug);
  // Extract sprint position if available
  const sprintLabel = target.sprintTitle.match(/Sprint\s+\d+/i)?.[0] || 'Sprint 1';

  return (
    <div className="rounded-lg border border-primary/30 bg-surface-elevated p-5 relative overflow-hidden shadow-elevation-2">
      {/* Subtle indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-[#00B8A3]" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Side: Context & Next Action */}
        <div className="space-y-3">
          {/* Track Context: Sprint and Day */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 tracking-wider uppercase">
                <Sparkles className="w-3 h-3" />
                CONTINUE LEARNING
              </span>
              <span className="text-xs font-mono font-semibold text-text-primary">
                {sprintLabel} · Day {target.dayNumber}
              </span>
            </div>
            <div className="text-xs font-medium text-text-secondary pl-0.5">
              {target.dayTitle}
            </div>
          </div>

          {/* Next Up Item Title */}
          <div>
            <div className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-wider">
              NEXT UP
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="p-1 rounded bg-white/[0.04] border border-white/[0.06]">
                {getItemIcon(target.itemType)}
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-text-primary tracking-[-0.01em]">
                {target.itemTitle}
              </h3>
            </div>
          </div>

          {/* Metadata: Duration & Problem details */}
          <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              ~{target.estimatedMinutes} min
            </span>

            {target.verniqProblemId && (
              <>
                <span className="text-border">·</span>
                <span className="font-mono text-primary font-semibold">
                  {target.verniqProblemId}
                </span>
              </>
            )}

            {target.problemDifficulty && (
              <DifficultyBadge difficulty={target.problemDifficulty} />
            )}
          </div>
        </div>

        {/* Right Side: CTA Actions */}
        <div className="shrink-0 flex items-center gap-3 self-start md:self-center">
          {isProblem ? (
            <Link to={`/problems/${target.problemSlug}?fromRoadmap=dsa-mastery`}>
              <Button variant="primary" size="md" className="font-mono text-xs shadow-md">
                <span>Solve Problem</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              {onMarkComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkComplete(target.itemId)}
                  className="text-xs font-mono border-border hover:bg-surface text-text-secondary hover:text-text-primary"
                >
                  <Check className="w-3.5 h-3.5 mr-1 text-[#00B8A3]" />
                  Mark Done
                </Button>
              )}

              <Button
                variant="primary"
                size="md"
                onClick={() => onMarkComplete?.(target.itemId)}
                className="font-mono text-xs shadow-md"
              >
                <span>Continue Learning</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
