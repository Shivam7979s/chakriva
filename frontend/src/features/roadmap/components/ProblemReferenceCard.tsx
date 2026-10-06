import React from 'react';
import { Link } from 'react-router-dom';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Code2, ArrowUpRight, Tag } from 'lucide-react';
import type { RoadmapProblemReference } from '../types';

interface ProblemReferenceCardProps {
  reference: RoadmapProblemReference;
}

export const ProblemReferenceCard: React.FC<ProblemReferenceCardProps> = ({ reference }) => {
  const summary = reference.problemSummary;
  const verniqId = reference.verniqProblemId;
  const title = summary?.title || `Problem ${verniqId}`;
  const difficulty = summary?.difficulty || 'medium';
  const slug = summary?.slug || '';
  const topics = summary?.topics || [];

  return (
    <div className="mt-2.5 rounded-md border border-border/80 bg-surface-subtle/50 p-3 hover:border-border transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Problem Catalog Metadata */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Permanent Verniq Problem ID */}
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-primary border border-white/[0.08]">
              {verniqId}
            </span>

            {/* Difficulty Badge */}
            <DifficultyBadge difficulty={difficulty} />

            {/* Problem Title */}
            <h4 className="text-sm font-semibold text-text-primary tracking-[-0.01em] truncate">
              {title}
            </h4>
          </div>

          {/* Topics and Notes */}
          <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
            {topics.length > 0 && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-text-muted">
                <Tag className="w-3 h-3 text-text-muted" />
                {topics.join(' · ')}
              </span>
            )}
            {reference.notes && (
              <span className="text-[11px] italic text-text-secondary border-l border-border pl-2">
                {reference.notes}
              </span>
            )}
          </div>
        </div>

        {/* Right: Solve Action Linking to Problem Workspace */}
        <div className="shrink-0 flex items-center gap-2">
          {slug ? (
            <Link
              to={`/problems/${slug}?fromRoadmap=dsa-mastery`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Solve</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          ) : (
            <span className="text-xs font-mono text-text-muted">Catalog Linked</span>
          )}
        </div>
      </div>
    </div>
  );
};
