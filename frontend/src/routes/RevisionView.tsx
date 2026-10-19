import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Button } from '@/components/ui/actions/Button';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import type { DifficultyLevel } from '@/types';
import {
  Brain,
  Repeat,
  Sparkles,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Algorithmic Invariant Knowledge Base
interface AlgorithmicInvariant {
  timeComplexity: string;
  spaceComplexity: string;
  pattern: string;
  keyInvariant: string;
  strategySummary: string;
}

const PROBLEM_INVARIANTS: Record<string, AlgorithmicInvariant> = {
  'two-sum': {
    timeComplexity: 'O(n) Linear Time',
    spaceComplexity: 'O(n) Hash Map Auxiliary Space',
    pattern: 'Complement Hash Map Lookup',
    keyInvariant:
      'For every element nums[i], if a valid pair exists that sums to target, its complement (target - nums[i]) was either registered previously in the hashmap or will match with a future element.',
    strategySummary:
      'Maintain an inverted index map (val -> index). Single pass allows constant-time verification of complement presence without duplicate element reuse.',
  },
  'best-time-to-buy-and-sell-stock': {
    timeComplexity: 'O(n) Single Pass',
    spaceComplexity: 'O(1) Constant Space',
    pattern: 'Monotonic Prefix Minimum',
    keyInvariant:
      'At any day i, the maximum possible profit if selling on day i is strictly prices[i] - min_price_seen_so_far. Tracking running minimum guarantees global maximum.',
    strategySummary:
      'Track running prefix minimum price. Calculate profit at each step and maximize the global difference.',
  },
  '3sum': {
    timeComplexity: 'O(n²) Quadratic Time',
    spaceComplexity: 'O(1) Auxiliary Space (ignoring output)',
    pattern: 'Sorted Dual Convergent Pointers',
    keyInvariant:
      'On a sorted array, for fixed pivot nums[i], if sum(nums[i], nums[l], nums[r]) < 0, only incrementing l can increase the sum; if > 0, only decrementing r can decrease it.',
    strategySummary:
      'Sort the array. Fix the first element with an outer loop, then use two pointers converging inward. Skip adjacent duplicates to avoid duplicate triplets.',
  },
  'search-in-rotated-sorted-array': {
    timeComplexity: 'O(log n) Logarithmic Time',
    spaceComplexity: 'O(1) Constant Space',
    pattern: 'Modified Binary Search with Sorted Half Invariant',
    keyInvariant:
      'For any pivot mid in a rotated sorted array with distinct elements, at least one half ([left, mid] or [mid, right]) is guaranteed to be strictly monotonically increasing.',
    strategySummary:
      'Identify which half is strictly sorted. Check if target lies within the boundaries of the sorted half. Bisect the search space accordingly.',
  },
  'container-with-most-water': {
    timeComplexity: 'O(n) Linear Time',
    spaceComplexity: 'O(1) Constant Space',
    pattern: 'Two-Pointer Width Contraction',
    keyInvariant:
      'The area is constrained by min(height[l], height[r]) * (r - l). Moving the taller line inward cannot possibly increase area because width decreases and height is bounded by the shorter line.',
    strategySummary:
      'Initialize pointers at extremes (0 and n-1). Always move the pointer pointing to the shorter vertical bar inward to seek taller boundaries.',
  },
  'trapping-rain-water': {
    timeComplexity: 'O(n) Linear Time',
    spaceComplexity: 'O(1) Constant Space with Two Pointers',
    pattern: 'Dual Boundary Elevation Invariant',
    keyInvariant:
      'Water trapped at index i is strictly determined by min(max_left, max_right) - height[i]. With two pointers, if max_left < max_right, the trapped water at left is definitively bounded by max_left.',
    strategySummary:
      'Converge from left and right. Update left_max and right_max. Process the side with the lower boundary to immediately resolve trapped water volume.',
  },
};

interface RevisionItem {
  id: string;
  user_id: string;
  problem_id: string;
  interval_days: number;
  next_review_at: string;
  is_reviewed: boolean;
  problem?: {
    id: string;
    title: string;
    slug: string;
    difficulty: DifficultyLevel;
    description_markdown?: string;
    constraints_markdown?: string;
    tags?: string[];
  };
}

export const RevisionView: React.FC = () => {
  const { user } = useAuth();

  const [revisionQueue, setRevisionQueue] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Fetch Revision Queue strictly from Supabase joined with problems
  const fetchRevisionQueue = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_revision_queue')
        .select(`
          id,
          user_id,
          problem_id,
          interval_days,
          next_review_at,
          is_reviewed,
          problems:problem_id (
            id,
            title,
            slug,
            difficulty,
            description_markdown,
            constraints_markdown
          )
        `)
        .eq('user_id', user.id)
        .order('next_review_at', { ascending: true });

      if (error) {
        console.error('Error fetching revision queue:', error);
        setRevisionQueue([]);
      } else if (data) {
        const mapped: RevisionItem[] = data.map((item: any) => {
          const matchedFallback = FALLBACK_PROBLEMS.find((p) => p.id === item.problem_id);
          const prob = item.problems || matchedFallback;
          return {
            id: item.id,
            user_id: item.user_id,
            problem_id: item.problem_id,
            interval_days: item.interval_days || 1,
            next_review_at: item.next_review_at,
            is_reviewed: Boolean(item.is_reviewed),
            problem: prob
              ? {
                  id: prob.id,
                  title: prob.title,
                  slug: prob.slug,
                  difficulty: prob.difficulty,
                  description_markdown: prob.description_markdown,
                  constraints_markdown: prob.constraints_markdown,
                  tags: matchedFallback?.tags || ['Algorithms', 'DSA'],
                }
              : undefined,
          };
        });
        setRevisionQueue(mapped);
      }
    } catch (err) {
      console.error('Failed to load revision queue:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRevisionQueue();
  }, [fetchRevisionQueue]);

  // Current timestamp for due calculation
  const now = useMemo(() => new Date(), []);
  const todayEnd = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);

  // Filter cards due today (unreviewed & scheduled on or before today)
  const dueCards = useMemo(() => {
    return revisionQueue.filter((item) => {
      if (item.is_reviewed) return false;
      const reviewDate = new Date(item.next_review_at);
      return reviewDate <= todayEnd;
    });
  }, [revisionQueue, todayEnd]);

  // Metric: Reviewed Today
  const reviewedTodayCount = useMemo(() => {
    const todayDateStr = now.toISOString().split('T')[0];
    return revisionQueue.filter((item) => {
      if (!item.is_reviewed) return false;
      return item.next_review_at.startsWith(todayDateStr);
    }).length;
  }, [revisionQueue, now]);

  // Metric: Next Review Milestone
  const nextMilestone = useMemo(() => {
    const upcoming = revisionQueue.filter((item) => {
      if (item.is_reviewed) return false;
      const reviewDate = new Date(item.next_review_at);
      return reviewDate > todayEnd;
    });

    if (upcoming.length === 0) return null;

    const earliest = upcoming[0];
    const targetDate = new Date(earliest.next_review_at);
    const diffDays = Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const countOnDate = upcoming.filter((i) => {
      const d = new Date(i.next_review_at);
      return d.toDateString() === targetDate.toDateString();
    }).length;

    return {
      days: diffDays,
      count: countOnDate,
      dateFormatted: targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }, [revisionQueue, todayEnd, now]);

  // Metric: Mastered Count (Interval >= 21 or is_reviewed)
  const masteredCount = useMemo(() => {
    return revisionQueue.filter((i) => i.interval_days >= 21 || i.is_reviewed).length;
  }, [revisionQueue]);

  // Current Card
  const currentCard = dueCards[activeCardIndex] || dueCards[0] || null;

  // Handler: Advance Spaced Repetition (Mark Mastered)
  const handleAdvanceInterval = async () => {
    if (!currentCard || !user) return;
    try {
      const currentInterval = currentCard.interval_days;
      let nextInterval = 3;
      let isReviewedNow = false;

      if (currentInterval === 1) nextInterval = 3;
      else if (currentInterval === 3) nextInterval = 7;
      else if (currentInterval === 7) nextInterval = 21;
      else if (currentInterval >= 21) {
        nextInterval = 30;
        isReviewedNow = true;
      }

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

      // Optimistic update
      setRevisionQueue((prev) =>
        prev.map((item) =>
          item.id === currentCard.id
            ? {
                ...item,
                interval_days: nextInterval,
                next_review_at: nextReviewDate.toISOString(),
                is_reviewed: isReviewedNow,
              }
            : item
        )
      );

      setShowHint(false);
      if (activeCardIndex >= dueCards.length - 1) {
        setActiveCardIndex(Math.max(0, dueCards.length - 2));
      }

      setActionFeedback(
        `🎉 Mastered! Problem promoted to Stage ${
          nextInterval >= 21 ? '4 (21 Days - Permanent Mastered)' : nextInterval === 7 ? '3 (7 Days)' : '2 (3 Days)'
        }.`
      );
      setTimeout(() => setActionFeedback(null), 4000);

      // Update in Supabase
      if (isSupabaseConfigured()) {
        await supabase
          .from('user_revision_queue')
          .update({
            interval_days: nextInterval,
            next_review_at: nextReviewDate.toISOString(),
            is_reviewed: isReviewedNow,
          })
          .eq('id', currentCard.id);
      }
    } catch (err) {
      console.error('Failed to advance interval:', err);
    }
  };

  // Handler: Reset to 1 Day (Need More Practice)
  const handleResetInterval = async () => {
    if (!currentCard || !user) return;
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      setRevisionQueue((prev) =>
        prev.map((item) =>
          item.id === currentCard.id
            ? {
                ...item,
                interval_days: 1,
                next_review_at: tomorrow.toISOString(),
                is_reviewed: false,
              }
            : item
        )
      );

      setShowHint(false);
      setActionFeedback('🔄 Recalibrated to Stage 1. Scheduled for recall reinforcement tomorrow.');
      setTimeout(() => setActionFeedback(null), 4000);

      if (isSupabaseConfigured()) {
        await supabase
          .from('user_revision_queue')
          .update({
            interval_days: 1,
            next_review_at: tomorrow.toISOString(),
            is_reviewed: false,
          })
          .eq('id', currentCard.id);
      }
    } catch (err) {
      console.error('Failed to reset interval:', err);
    }
  };

  // Handler: Sync Solved Problems into Revision Queue
  const handleSyncSolvedToRevision = async () => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      setIsSyncing(true);
      // Query all solved problems from user_problem_progress
      const { data: progressRows, error: pErr } = await supabase
        .from('user_problem_progress')
        .select('problem_id, status')
        .eq('user_id', user.id)
        .eq('status', 'solved');

      if (pErr) throw pErr;

      if (!progressRows || progressRows.length === 0) {
        // If user has no solved rows yet in DB, seed a default problem for spaced repetition trial
        const seedProblem = FALLBACK_PROBLEMS[0];
        await supabase.from('user_revision_queue').upsert(
          {
            user_id: user.id,
            problem_id: seedProblem.id,
            interval_days: 1,
            next_review_at: new Date().toISOString(),
            is_reviewed: false,
          },
          { onConflict: 'user_id,problem_id' }
        );
        setActionFeedback('✨ Seeded "Two Sum" into your Ebbinghaus recall deck for practice!');
      } else {
        // Upsert all solved problems with initial 1-day interval
        for (const row of progressRows) {
          await supabase.from('user_revision_queue').upsert(
            {
              user_id: user.id,
              problem_id: row.problem_id,
              interval_days: 1,
              next_review_at: new Date().toISOString(),
              is_reviewed: false,
            },
            { onConflict: 'user_id,problem_id' }
          );
        }
        setActionFeedback(`✨ Enrolled ${progressRows.length} solved problems into your spaced repetition queue!`);
      }

      await fetchRevisionQueue();
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to sync revision items:', err);
      setActionFeedback(`Sync error: ${err.message || 'Unknown'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper for Ebbinghaus Stage details
  const getStageMeta = (days: number) => {
    if (days <= 1) {
      return {
        stage: 'Stage 1',
        title: '1 Day • Immediate Recall',
        desc: 'Memory trace retention test 24h after solve',
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    }
    if (days <= 3) {
      return {
        stage: 'Stage 2',
        title: '3 Days • Consolidation',
        desc: 'Medium-term synaptogenesis retention check',
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    if (days <= 7) {
      return {
        stage: 'Stage 3',
        title: '7 Days • Deep Transfer',
        desc: 'Long-term pattern schema internalization',
        badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      };
    }
    return {
      stage: 'Stage 4',
      title: '21 Days • Mastered Invariant',
      desc: 'Permanent algorithmic intuition achieved',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
  };

  const activeInvariant = currentCard?.problem?.slug
    ? PROBLEM_INVARIANTS[currentCard.problem.slug]
    : null;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Student Workspace', href: '/app/dashboard' },
        { label: 'Ebbinghaus Spaced Repetition' },
      ]}
    >
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Banner Alert for Feedback */}
        {actionFeedback && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 shrink-0 text-primary" />
              <p className="text-sm font-medium">{actionFeedback}</p>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs text-text-muted hover:text-text-primary underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TOP METRICS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Cards Due Today</span>
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-mono text-text-primary">
                {dueCards.length}
              </span>
              <span className="text-xs text-text-muted font-mono">in queue</span>
            </div>
            <p className="text-[11px] text-text-muted">Ebbinghaus forgetting curve recall</p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Reviewed Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-mono text-emerald-400">
                {reviewedTodayCount}
              </span>
              <span className="text-xs text-text-muted font-mono">completed</span>
            </div>
            <p className="text-[11px] text-text-muted">Reinforced algorithmic invariants</p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Next Milestone</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-bold font-mono text-text-primary">
                {nextMilestone ? `${nextMilestone.count} Cards` : 'Queue Fresh'}
              </span>
            </div>
            <p className="text-[11px] text-text-muted font-mono">
              {nextMilestone ? `in ${nextMilestone.days} days (${nextMilestone.dateFormatted})` : 'All invariants synchronized'}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-1">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Mastered Invariants</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold font-mono text-amber-400">
                {masteredCount}
              </span>
              <span className="text-xs text-text-muted font-mono">permanent</span>
            </div>
            <p className="text-[11px] text-text-muted">Stage 4 (21+ days interval)</p>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-16 text-center rounded-xl border border-white/[0.08] bg-surface flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-text-secondary">Retrieving Ebbinghaus decay curve telemetry...</p>
          </div>
        )}

        {/* RECALL DECK: CARDS DUE TODAY */}
        {!loading && dueCards.length > 0 && currentCard && (
          <div className="space-y-4">
            {/* Deck Navigation & Progress Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                  Card {activeCardIndex + 1} of {dueCards.length}
                </span>
                <span className="text-xs text-text-muted">
                  Ebbinghaus Spaced Repetition Desk
                </span>
              </div>

              {dueCards.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowHint(false);
                      setActiveCardIndex((p) => Math.max(0, p - 1));
                    }}
                    disabled={activeCardIndex === 0}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowHint(false);
                      setActiveCardIndex((p) => Math.min(dueCards.length - 1, p + 1));
                    }}
                    disabled={activeCardIndex === dueCards.length - 1}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            {/* Flashcard Surface */}
            <div className="p-6 md:p-8 rounded-2xl border border-white/[0.08] bg-surface shadow-elevation-2 space-y-6 relative overflow-hidden transition-all">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider border',
                        getStageMeta(currentCard.interval_days).badgeBg
                      )}
                    >
                      {getStageMeta(currentCard.interval_days).stage} • {currentCard.interval_days} Day Interval
                    </span>
                    {currentCard.problem && (
                      <DifficultyBadge
                        difficulty={currentCard.problem.difficulty}
                        className="text-xs px-2 py-0.5"
                      />
                    )}
                    <span className="text-[11px] font-mono text-text-muted">
                      Due: Today
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                    {currentCard.problem?.title || 'Algorithmic Problem'}
                  </h2>
                </div>

                {/* Direct Solve Link */}
                {currentCard.problem && (
                  <Link to={`/problems/${currentCard.problem.slug}`}>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<ExternalLink className="w-3.5 h-3.5 text-primary" />}
                    >
                      Practice in IDE
                    </Button>
                  </Link>
                )}
              </div>

              {/* Problem Context & Tags */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                  <span>Category Tags:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {(currentCard.problem?.tags || ['Algorithms', 'Data Structures']).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-surface-elevated border border-white/[0.06] text-text-secondary text-[11px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {currentCard.problem?.description_markdown && (
                  <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.05] text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {currentCard.problem.description_markdown.slice(0, 280)}...
                  </div>
                )}
              </div>

              {/* INVARIANT HINT DRAWER (Interactive Invariant Recall) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint((prev) => !prev)}
                    leftIcon={<Lightbulb className={cn('w-4 h-4', showHint ? 'text-amber-400' : 'text-text-muted')} />}
                  >
                    {showHint ? 'Hide Invariant Hint' : 'Flip Invariant Hint'}
                  </Button>
                  <span className="text-xs text-text-muted">
                    Test your memory before revealing invariants
                  </span>
                </div>

                {showHint && (
                  <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
                      <ShieldCheck className="w-4 h-4" />
                      Algorithmic Invariant & Complexity Guarantee
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-surface border border-white/[0.06]">
                        <span className="text-[10px] font-mono text-text-muted uppercase block">
                          Time Invariant
                        </span>
                        <p className="font-mono font-bold text-text-primary mt-0.5">
                          {activeInvariant?.timeComplexity || 'O(n) Linear Time'}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-surface border border-white/[0.06]">
                        <span className="text-[10px] font-mono text-text-muted uppercase block">
                          Space Invariant
                        </span>
                        <p className="font-mono font-bold text-text-primary mt-0.5">
                          {activeInvariant?.spaceComplexity || 'O(1) Auxiliary Space'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono text-[10px] uppercase text-text-muted block">
                          Core Mathematical Invariant
                        </span>
                        <p className="text-text-primary leading-relaxed mt-1 font-sans">
                          {activeInvariant?.keyInvariant ||
                            'Monotonic boundaries guarantee that subproblems can be eliminated in amortized sub-linear or linear steps without redundant recomputation.'}
                        </p>
                      </div>

                      <div>
                        <span className="font-mono text-[10px] uppercase text-text-muted block">
                          Algorithmic Pattern Strategy
                        </span>
                        <p className="text-text-secondary leading-relaxed mt-1 font-sans">
                          {activeInvariant?.strategySummary ||
                            'Formulate constraints as invariant bounds and advance pointers or hash keys accordingly.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD ACTION BUTTONS */}
              <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={handleResetInterval}
                  leftIcon={<RotateCcw className="w-4 h-4 text-amber-400" />}
                  className="w-full sm:w-auto"
                >
                  Need Review (Reset to 1d)
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="primary"
                    onClick={handleAdvanceInterval}
                    leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Mark Mastered (Advance Stage)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE: REVISION QUEUE CLEAR */}
        {!loading && dueCards.length === 0 && (
          <div className="p-12 md:p-16 rounded-2xl border border-white/[0.08] bg-surface text-center space-y-6 shadow-elevation-1">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                Revision Queue Clear
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                All algorithmic invariants are fresh. The Ebbinghaus decay curve has no decaying memory traces due today.
              </p>
            </div>

            {nextMilestone && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-white/[0.06] text-xs font-mono text-text-muted">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>
                  Next recall milestone: <strong className="text-text-primary">{nextMilestone.count} cards</strong> scheduled on {nextMilestone.dateFormatted}
                </span>
              </div>
            )}

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link to="/roadmaps">
                <Button
                  variant="primary"
                  leftIcon={<BookOpen className="w-4 h-4" />}
                >
                  Browse Curriculum Roadmaps
                </Button>
              </Link>

              <Link to="/problems">
                <Button
                  variant="outline"
                  leftIcon={<Code2 className="w-4 h-4" />}
                >
                  Practice New Problems
                </Button>
              </Link>

              <Button
                variant="ghost"
                onClick={handleSyncSolvedToRevision}
                disabled={isSyncing}
                leftIcon={isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4 text-primary" />}
                title="Enroll solved problems from your history into the spaced repetition deck"
              >
                {isSyncing ? 'Syncing...' : 'Sync Solved to Revision Deck'}
              </Button>
            </div>
          </div>
        )}

        {/* EBBINGHAUS EDUCATIONAL FOOTER */}
        <div className="p-6 rounded-xl border border-white/[0.06] bg-surface-subtle/50 text-xs text-text-muted space-y-2">
          <div className="flex items-center gap-2 text-text-primary font-semibold font-mono text-xs">
            <Brain className="w-4 h-4 text-primary" />
            How Chakriva Spaced Repetition Works
          </div>
          <p className="leading-relaxed">
            Hermann Ebbinghaus demonstrated that human memory decays exponentially without active reinforcement.
            Whenever you solve a problem on Chakriva, it automatically schedules active recall checkpoints at <strong>1 Day</strong>, <strong>3 Days</strong>, <strong>7 Days</strong>, and <strong>21 Days</strong>.
            Reviewing invariant hints and practicing in the IDE ensures permanent, panic-free recall in high-stakes technical interviews.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};
export default RevisionView;
