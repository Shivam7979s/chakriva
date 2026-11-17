import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import { ProgressNavigationTabs } from '@/features/progress/components/ProgressNavigationTabs';
import type { DifficultyLevel } from '@/types';
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
        console.warn('Error fetching revision queue:', error);
        setRevisionQueue([]);
      } else if (data) {
        const mapped: RevisionItem[] = data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          problem_id: row.problem_id,
          interval_days: row.interval_days || 1,
          next_review_at: row.next_review_at,
          is_reviewed: row.is_reviewed || false,
          problem: row.problems
            ? {
                id: row.problems.id,
                title: row.problems.title,
                slug: row.problems.slug,
                difficulty: row.problems.difficulty || 'medium',
                description_markdown: row.problems.description_markdown,
                constraints_markdown: row.problems.constraints_markdown,
              }
            : undefined,
        }));
        setRevisionQueue(mapped);
      }
    } catch (err) {
      console.warn('Failed to load revision queue:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRevisionQueue();
  }, [fetchRevisionQueue]);

  // Filter due cards (due on or before now)
  const dueCards = useMemo(() => {
    const now = new Date();
    return revisionQueue.filter((item) => {
      if (!item.next_review_at) return true;
      const dueDate = new Date(item.next_review_at);
      return dueDate <= now && !item.is_reviewed;
    });
  }, [revisionQueue]);

  const currentCard = dueCards[activeCardIndex] || dueCards[0];

  // Stats calculation
  const reviewedTodayCount = useMemo(() => {
    return revisionQueue.filter((item) => item.is_reviewed).length;
  }, [revisionQueue]);

  const masteredCount = useMemo(() => {
    return revisionQueue.filter((item) => item.interval_days >= 21).length;
  }, [revisionQueue]);

  const nextMilestone = useMemo(() => {
    const futureCards = revisionQueue.filter((item) => {
      if (!item.next_review_at) return false;
      return new Date(item.next_review_at) > new Date() && !item.is_reviewed;
    });

    if (futureCards.length === 0) return null;

    const earliest = futureCards[0];
    const days = Math.max(
      1,
      Math.ceil((new Date(earliest.next_review_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return {
      count: futureCards.length,
      days,
      dateFormatted: new Date(earliest.next_review_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    };
  }, [revisionQueue]);

  // Handler: Advance interval (1d -> 3d -> 7d -> 21d)
  const handleAdvanceInterval = async () => {
    if (!currentCard) return;

    try {
      let nextInterval = 3;
      if (currentCard.interval_days <= 1) nextInterval = 3;
      else if (currentCard.interval_days <= 3) nextInterval = 7;
      else if (currentCard.interval_days <= 7) nextInterval = 21;
      else nextInterval = 45;

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + nextInterval);

      setRevisionQueue((prev) =>
        prev.map((item) =>
          item.id === currentCard.id
            ? {
                ...item,
                interval_days: nextInterval,
                next_review_at: nextDate.toISOString(),
                is_reviewed: true,
              }
            : item
        )
      );

      setShowHint(false);
      setActionFeedback(`Recall verified. Promoted to Stage (${nextInterval} days interval).`);
      setTimeout(() => setActionFeedback(null), 4000);

      if (isSupabaseConfigured()) {
        await supabase
          .from('user_revision_queue')
          .update({
            interval_days: nextInterval,
            next_review_at: nextDate.toISOString(),
            is_reviewed: true,
          })
          .eq('id', currentCard.id);
      }
    } catch (err) {
      console.error('Failed to update interval:', err);
    }
  };

  // Handler: Reset interval back to 1 day on recall failure
  const handleResetInterval = async () => {
    if (!currentCard) return;

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
      setActionFeedback('Recalibrated to Stage 1. Scheduled for reinforcement tomorrow.');
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
      const { data: progressRows, error: pErr } = await supabase
        .from('user_problem_progress')
        .select('problem_id, status')
        .eq('user_id', user.id)
        .eq('status', 'solved');

      if (pErr) throw pErr;

      if (!progressRows || progressRows.length === 0) {
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
        setActionFeedback('Seeded "Two Sum" into your recall queue for practice.');
      } else {
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
        setActionFeedback(`Enrolled ${progressRows.length} solved problems into your spaced repetition queue.`);
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

  const getStageMeta = (days: number) => {
    if (days <= 1) {
      return {
        stage: 'Stage 1',
        title: '1-Day Interval',
        badgeBg: 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/25',
      };
    }
    if (days <= 3) {
      return {
        stage: 'Stage 2',
        title: '3-Day Interval',
        badgeBg: 'bg-[#00B8A3]/10 text-[#00B8A3] border-[#00B8A3]/25',
      };
    }
    if (days <= 7) {
      return {
        stage: 'Stage 3',
        title: '7-Day Interval',
        badgeBg: 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/25',
      };
    }
    return {
      stage: 'Stage 4',
      title: '21+ Days (Mastered)',
      badgeBg: 'bg-[#10B981]/10 text-[#34D399] border-[#10B981]/25',
    };
  };

  const activeInvariant = currentCard?.problem?.slug
    ? PROBLEM_INVARIANTS[currentCard.problem.slug]
    : null;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Progress', href: '/app/progress' },
        { label: 'Spaced Revision' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Executive Header */}
        <div className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                Spaced Revision Queue
              </h1>
              <p className="text-sm text-[#7C8BA6] max-w-2xl leading-relaxed">
                Active recall and spaced repetition based on the Ebbinghaus forgetting curve to consolidate core algorithmic invariants.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleSyncSolvedToRevision}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl border border-[#243B6B] bg-[#0F172A]/60 hover:bg-[#152443] text-xs font-medium text-[#93C5FD] transition-colors"
              >
                {isSyncing ? 'Syncing...' : 'Sync Solved Problems'}
              </button>
              <Link
                to="/leaderboard"
                className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors"
              >
                Campus Leaderboard
              </Link>
            </div>
          </div>
        </div>

        {/* Unified Navigation Tabs */}
        <ProgressNavigationTabs activeTab="revision" />

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className="p-4 rounded-xl bg-[#0F172A] border border-[#243B6B] text-xs text-[#93C5FD] flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs text-[#7C8BA6] hover:text-white underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top 4 KPI Metrics (Zero icons, zero uppercase monospace) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
            <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Due for Review</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {dueCards.length}
              </span>
              <span className="text-xs text-[#7C8BA6]">in queue</span>
            </div>
            <p className="text-[11px] text-[#556480] mt-3">Ebbinghaus forgetting curve recall</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
            <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Reviewed Today</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#00B8A3] tracking-tight">
                {reviewedTodayCount}
              </span>
              <span className="text-xs text-[#7C8BA6]">completed</span>
            </div>
            <p className="text-[11px] text-[#556480] mt-3">Reinforced algorithmic invariants</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
            <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Next Milestone</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {nextMilestone ? `${nextMilestone.count} Cards` : 'Queue Fresh'}
              </span>
            </div>
            <p className="text-[11px] text-[#556480] mt-3">
              {nextMilestone ? `in ${nextMilestone.days} days (${nextMilestone.dateFormatted})` : 'All invariants synchronized'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
            <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Mastered Invariants</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#F59E0B] tracking-tight">
                {masteredCount}
              </span>
              <span className="text-xs text-[#7C8BA6]">permanent</span>
            </div>
            <p className="text-[11px] text-[#556480] mt-3">Stage 4 (21+ days interval)</p>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-16 text-center rounded-2xl border border-[#181F30] bg-[#0F131D]">
            <p className="text-sm text-[#7C8BA6]">Loading revision queue...</p>
          </div>
        )}

        {/* RECALL DECK: CARDS DUE TODAY */}
        {!loading && dueCards.length > 0 && currentCard && (
          <div className="space-y-4">
            {/* Deck Navigation Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#152443] text-[#93C5FD] border border-[#243B6B]">
                  Card {activeCardIndex + 1} of {dueCards.length}
                </span>
                <span className="text-xs text-[#7C8BA6]">
                  Active Invariant Recall Deck
                </span>
              </div>

              {dueCards.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowHint(false);
                      setActiveCardIndex((p) => Math.max(0, p - 1));
                    }}
                    disabled={activeCardIndex === 0}
                    className="px-3 py-1.5 rounded-lg border border-[#181F30] bg-[#0F131D] hover:bg-[#152443] disabled:opacity-40 text-xs font-medium text-[#C3CEE0] transition-colors"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => {
                      setShowHint(false);
                      setActiveCardIndex((p) => Math.min(dueCards.length - 1, p + 1));
                    }}
                    disabled={activeCardIndex === dueCards.length - 1}
                    className="px-3 py-1.5 rounded-lg border border-[#181F30] bg-[#0F131D] hover:bg-[#152443] disabled:opacity-40 text-xs font-medium text-[#C3CEE0] transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* Flashcard Surface */}
            <div className="p-6 md:p-8 rounded-2xl border border-[#181F30] bg-[#0F131D] space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#181F30] pb-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-md text-xs font-medium border',
                        getStageMeta(currentCard.interval_days).badgeBg
                      )}
                    >
                      {getStageMeta(currentCard.interval_days).stage} · {currentCard.interval_days} Day Interval
                    </span>
                    {currentCard.problem && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#141A29] border border-[#181F30] text-[#E2E8F5] flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            currentCard.problem.difficulty === 'easy'
                              ? 'bg-[#00B8A3]'
                              : currentCard.problem.difficulty === 'hard'
                              ? 'bg-[#EF4444]'
                              : 'bg-[#F59E0B]'
                          )}
                        />
                        {currentCard.problem.difficulty.charAt(0).toUpperCase() + currentCard.problem.difficulty.slice(1)}
                      </span>
                    )}
                    <span className="text-xs text-[#7C8BA6]">Due today</span>
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {currentCard.problem?.title || 'Algorithmic Problem'}
                  </h2>
                </div>

                {currentCard.problem && (
                  <Link
                    to={`/app/practice/${currentCard.problem.slug}`}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors self-start sm:self-auto"
                  >
                    Practice in IDE →
                  </Link>
                )}
              </div>

              {/* Problem Excerpt */}
              {currentCard.problem?.description_markdown && (
                <div className="p-4 rounded-xl bg-[#0B0E16] border border-[#181F30] text-xs text-[#C3CEE0] leading-relaxed line-clamp-3">
                  {currentCard.problem.description_markdown.slice(0, 280)}...
                </div>
              )}

              {/* INVARIANT HINT DRAWER */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowHint((prev) => !prev)}
                    className="px-3.5 py-2 rounded-xl border border-[#243B6B] bg-[#0F172A]/60 hover:bg-[#152443] text-xs font-medium text-[#93C5FD] transition-colors"
                  >
                    {showHint ? 'Hide Invariant Hint' : 'Reveal Invariant Hint'}
                  </button>
                  <span className="text-xs text-[#7C8BA6]">
                    Test your memory before checking invariants
                  </span>
                </div>

                {showHint && (
                  <div className="p-5 rounded-xl border border-[#243B6B] bg-[#0B0E16] space-y-4">
                    <div className="text-xs font-semibold text-[#93C5FD]">
                      Algorithmic Invariant & Complexity Guarantee
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-[#0F131D] border border-[#181F30]">
                        <span className="text-[11px] text-[#7C8BA6] block">Time Complexity</span>
                        <p className="font-medium text-white mt-0.5">
                          {activeInvariant?.timeComplexity || 'O(n) Linear Time'}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-[#0F131D] border border-[#181F30]">
                        <span className="text-[11px] text-[#7C8BA6] block">Space Complexity</span>
                        <p className="font-medium text-white mt-0.5">
                          {activeInvariant?.spaceComplexity || 'O(1) Auxiliary Space'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[11px] text-[#7C8BA6] block">Core Mathematical Invariant</span>
                        <p className="text-[#E2E8F5] leading-relaxed mt-1">
                          {activeInvariant?.keyInvariant ||
                            'Monotonic boundaries guarantee that subproblems can be eliminated in amortized sub-linear or linear steps without redundant recomputation.'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] text-[#7C8BA6] block">Pattern Strategy</span>
                        <p className="text-[#94A3B8] leading-relaxed mt-1">
                          {activeInvariant?.strategySummary ||
                            'Formulate constraints as invariant bounds and advance pointers or hash keys accordingly.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD ACTION BUTTONS */}
              <div className="pt-4 border-t border-[#181F30] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleResetInterval}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-xs font-medium text-[#F87171] transition-colors"
                >
                  Need Review (Reset to 1d)
                </button>

                <button
                  onClick={handleAdvanceInterval}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors"
                >
                  Mark Mastered (Advance Stage)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && dueCards.length === 0 && (
          <div className="p-12 md:p-16 rounded-2xl border border-[#181F30] bg-[#0F131D] text-center space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Revision Queue is Fresh
            </h2>
            <p className="text-xs text-[#7C8BA6] max-w-md mx-auto leading-relaxed">
              No algorithmic invariants are due for recall review today. Continue solving new problems or review curriculum tracks.
            </p>

            {nextMilestone && (
              <p className="text-xs text-[#93C5FD]">
                Next recall checkpoint: <strong>{nextMilestone.count} cards</strong> scheduled for {nextMilestone.dateFormatted}.
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/app/roadmap"
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors"
              >
                Browse Study Roadmaps
              </Link>
              <Link
                to="/app/practice"
                className="px-4 py-2 rounded-xl border border-[#243B6B] bg-[#0F172A]/60 hover:bg-[#152443] text-xs font-medium text-[#93C5FD] transition-colors"
              >
                Practice New Problems
              </Link>
            </div>
          </div>
        )}

        {/* Spaced Repetition Note */}
        <div className="p-5 rounded-2xl border border-[#181F30] bg-[#0B0E16] text-xs text-[#7C8BA6] space-y-1.5">
          <div className="text-white font-medium">How Spaced Repetition Works</div>
          <p className="leading-relaxed">
            Whenever you solve a problem on CHAKRIVA, active recall checkpoints are scheduled across 1-day, 3-day, 7-day, and 21-day intervals.
            Reviewing key invariants before looking up code reinforces long-term algorithmic pattern recognition.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RevisionView;
