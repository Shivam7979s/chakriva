import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { ActiveSprintBanner } from '@/components/dashboard/ActiveSprintBanner';
import { ProblemOfTheDayCard } from '@/components/dashboard/ProblemOfTheDayCard';
import { CategoryProgressModule } from '@/components/dashboard/CategoryProgressModule';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Button } from '@/components/ui/actions/Button';
import { useAuth } from '@/hooks/useAuth';
import { useUserTelemetry } from '@/hooks/useUserTelemetry';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import type { StudySprint, SprintTask, RevisionCard } from '@/types';
import {
  Flame,
  Trophy,
  Repeat,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  ExternalLink,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, type ProgressSummary } from '@/lib/apiClient';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

function formatTimeAgo(timestampStr: string): string {
  if (!timestampStr) return '';
  const now = new Date().getTime();
  const past = new Date(timestampStr).getTime();
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(timestampStr).toLocaleDateString();
}

export interface DashboardViewProps {
  initialTab?: 'overview' | 'analytics';
}

export const DashboardView: React.FC<DashboardViewProps> = ({ initialTab = 'overview' }) => {
  const { profile, user } = useAuth();
  const telemetry = useUserTelemetry();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'overview' | 'analytics' | null;
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>(tabFromUrl || initialTab);

  useEffect(() => {
    if (tabFromUrl && (tabFromUrl === 'overview' || tabFromUrl === 'analytics')) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: 'overview' | 'analytics') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'overview') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };

  // Active Sprint & Tasks
  const [activeSprint, setActiveSprint] = useState<StudySprint | null>(null);
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([]);
  const [todaySprintTasks, setTodaySprintTasks] = useState<SprintTask[]>([]);
  const [revisionDueItems, setRevisionDueItems] = useState<RevisionCard[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string) ||
    (user ? 'Developer' : 'Guest Developer');

  const collegeName =
    profile?.college_name ||
    (profile?.college_id ? 'Affiliated University' : 'Independent');

  const streak =
    telemetry.currentStreak > 0
      ? telemetry.currentStreak
      : profile?.current_streak || 0;

  const campusRank = profile?.score
    ? Math.max(1, 100 - Math.floor(profile.score / 50))
    : '1';

  // Dynamic Command Greeting
  const commandGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Up early, ${displayName}?`;
    if (hour < 17) return `Focused afternoon, ${displayName}?`;
    return `Late engineering sprint, ${displayName}?`;
  }, [displayName]);

  // Fetch active sprint and today's tasks
  const fetchDashboardData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Fetch active sprint
      const { data: sData } = await supabase
        .from('study_sprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sData) {
        setActiveSprint(sData as StudySprint);

        // Fetch all sprint tasks
        const { data: tData } = await supabase
          .from('sprint_tasks')
          .select(`
            id,
            sprint_id,
            user_id,
            problem_id,
            task_type,
            title,
            estimated_minutes,
            scheduled_date,
            is_completed,
            completed_at,
            order_index,
            problems:problem_id (
              id,
              title,
              slug,
              difficulty
            )
          `)
          .eq('sprint_id', sData.id)
          .order('scheduled_date', { ascending: true })
          .order('order_index', { ascending: true });

        if (tData) {
          const mapped: SprintTask[] = tData.map((t: any) => {
            const matchedFallback = FALLBACK_PROBLEMS.find((p) => p.id === t.problem_id);
            return {
              ...t,
              problem: t.problems || matchedFallback,
            };
          });
          setSprintTasks(mapped);
          setTodaySprintTasks(mapped.filter((t) => t.scheduled_date === todayStr));
        }
      } else {
        setActiveSprint(null);
        setSprintTasks([]);
        setTodaySprintTasks([]);
      }

      // 2. Fetch spaced repetition items due today
      const { data: revData } = await supabase
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
            difficulty
          )
        `)
        .eq('user_id', user.id)
        .eq('is_reviewed', false)
        .order('next_review_at', { ascending: true })
        .limit(3);

      if (revData) {
        const revMapped: RevisionCard[] = revData.map((item: any) => {
          const matchedFallback = FALLBACK_PROBLEMS.find((p) => p.id === item.problem_id);
          return {
            id: item.id,
            user_id: item.user_id,
            problem_id: item.problem_id,
            interval_days: item.interval_days || 1,
            next_review_at: item.next_review_at,
            is_reviewed: item.is_reviewed,
            problem: item.problems || matchedFallback,
          };
        });
        setRevisionDueItems(revMapped);
      }

      // 3. Fetch server-authoritative progress summary from Spring Boot API
      try {
        const sum = await apiClient.getProgressSummary();
        if (sum) {
          setProgressSummary(sum);
        }
      } catch (sumErr) {
        console.warn('[DashboardView] Could not fetch server progress summary:', sumErr);
      }
    } catch (err) {
      console.error('[DashboardView] Error fetching telemetry:', err);
    }
  }, [user, todayStr]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Toggle today's task completion state
  const handleToggleTask = async (task: SprintTask) => {
    if (!user) return;
    const newCompleted = !task.is_completed;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    setTodaySprintTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: newCompleted, completed_at: completedAt } : t))
    );
    setSprintTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: newCompleted, completed_at: completedAt } : t))
    );

    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('sprint_tasks')
          .update({
            is_completed: newCompleted,
            completed_at: completedAt,
          })
          .eq('id', task.id);

        if (newCompleted && task.problem_id) {
          await supabase.from('user_problem_progress').upsert({
            user_id: user.id,
            problem_id: task.problem_id,
            status: 'solved',
            solved_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle sprint task:', err);
    }
  };

  // Solve Counts by Difficulty (Server-Authoritative from Spring Boot)
  const solvedCount = progressSummary ? progressSummary.totalProblemsSolved : telemetry.solvedCount;
  const attemptedCount = progressSummary ? progressSummary.totalProblemsAttempted : 0;
  const totalSubmissions = progressSummary ? progressSummary.totalSubmissions : telemetry.totalSubmissions;
  const acceptedSubmissions = progressSummary ? progressSummary.acceptedSubmissions : telemetry.recentAccepted.length;
  const acceptanceRate = progressSummary ? progressSummary.submissionAcceptanceRate : 0.0;

  const easyTotal = progressSummary ? progressSummary.difficulty.easy.total : FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'easy').length;
  const medTotal = progressSummary ? progressSummary.difficulty.medium.total : FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'medium').length;
  const hardTotal = progressSummary ? progressSummary.difficulty.hard.total : FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'hard').length;
  const totalProblems = (easyTotal + medTotal + hardTotal) || FALLBACK_PROBLEMS.length;

  const solvedSet = useMemo(() => new Set(telemetry.solvedProblemIds), [telemetry.solvedProblemIds]);

  const easySolved = progressSummary ? progressSummary.difficulty.easy.solved : FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'easy' && solvedSet.has(p.id)).length;
  const medSolved = progressSummary ? progressSummary.difficulty.medium.solved : FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'medium' && solvedSet.has(p.id)).length;
  const hardSolved = progressSummary ? progressSummary.difficulty.hard.solved : FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'hard' && solvedSet.has(p.id)).length;

  // Topic Mastery Breakdown (Server-Authoritative)
  const topicMastery = useMemo(() => {
    if (progressSummary && progressSummary.topics && progressSummary.topics.length > 0) {
      const palette = ['#00B8A3', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#6366F1'];
      return progressSummary.topics.map((t, idx) => ({
        id: t.topicSlug,
        name: t.topicName,
        total: Number(t.total) || 0,
        solved: Number(t.solved) || 0,
        color: palette[idx % palette.length],
      }));
    }
    return [
      {
        id: 'arrays',
        name: 'Arrays & Hashing',
        total: 2,
        solved: FALLBACK_PROBLEMS.filter(
          (p) => p.tags?.includes('Arrays') && solvedSet.has(p.id)
        ).length,
        color: '#00B8A3',
      },
      {
        id: 'two-pointers',
        name: 'Two Pointers',
        total: 3,
        solved: FALLBACK_PROBLEMS.filter(
          (p) => p.tags?.includes('Two Pointers') && solvedSet.has(p.id)
        ).length,
        color: '#3B82F6',
      },
      {
        id: 'binary-search',
        name: 'Binary Search',
        total: 1,
        solved: FALLBACK_PROBLEMS.filter(
          (p) => p.tags?.includes('Binary Search') && solvedSet.has(p.id)
        ).length,
        color: '#8B5CF6',
      },
      {
        id: 'dynamic-programming',
        name: 'Dynamic Programming',
        total: 1,
        solved: 0,
        color: '#F59E0B',
      },
    ];
  }, [progressSummary, solvedSet]);

  const recentActivities = progressSummary?.recentActivity || [];

  // 30-Day Activity Grid
  const activityPulseCells = useMemo(() => {
    const cells = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = telemetry.activityMap[dateStr] || 0;
      cells.push({
        dateStr,
        active: count > 0,
        count,
      });
    }
    return cells;
  }, [telemetry.activityMap]);

  const activeDaysCount = activityPulseCells.filter((c) => c.active).length;

  const getTaskTypePill = (type: SprintTask['task_type']) => {
    switch (type) {
      case 'learn_concept':
        return { label: 'Learn', className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'practice_problem':
        return { label: 'Practice', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'spaced_revision':
        return { label: 'Revision', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'mistake_retrial':
        return { label: 'Retrial', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      default:
        return { label: 'Task', className: 'bg-surface-elevated text-neutral-400 border-white/[0.06]' };
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Student Workspace', href: '/app/dashboard' },
        { label: 'Mission Control' },
      ]}
    >
      <div className="max-w-[1560px] mx-auto space-y-6 pb-12">
        {/* TOP COMMAND GREETING & CHIPS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 text-left">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-blue-400">
              MISSION CONTROL • STAGE ZERO
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {commandGreeting}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Solved / Attempted Metrics Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
              <span>
                <strong>{solvedCount}</strong> Solved ({attemptedCount} Attempted)
              </span>
            </div>

            {/* Submission Acceptance Rate Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
              <span>
                <strong>{acceptanceRate}%</strong> Acceptance ({acceptedSubmissions}/{totalSubmissions} Subs)
              </span>
            </div>

            {/* Active Streak Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono">
              <Flame className="w-4 h-4 fill-orange-500/20" />
              <span>
                <strong>{streak}</strong> Day Streak
              </span>
            </div>

            {/* Campus Standing Chip */}
            <Link
              to="/leaderboard?tab=campus"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors text-xs font-mono"
            >
              <Trophy className="w-4 h-4" />
              <span>
                Rank #{campusRank} in {collegeName}
              </span>
            </Link>
          </div>
        </div>

        {/* WORKSPACE VIEW TABS */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2',
              activeTab === 'overview'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Mission Execution
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('analytics')}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2',
              activeTab === 'analytics'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Intelligence & Analytics
          </button>
        </div>

        {/* TAB 1: INTELLIGENCE & ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard onRefreshParent={fetchDashboardData} />
        )}

        {/* TAB 2: EXECUTION HORIZON & TELEMETRY */}
        {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* CENTER STAGE: EXECUTION HORIZON (65% / 8 cols) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-6">
            {/* Active Sprint Hero */}
            <ActiveSprintBanner sprint={activeSprint} tasks={sprintTasks} />

            {/* Today's Sprint Tasks Module */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#12151D] shadow-elevation-1 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-blue-400" />
                  <h3 className="text-base font-bold text-white">
                    Today's Sprint Tasks
                  </h3>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  {todaySprintTasks.filter((t) => t.is_completed).length} /{' '}
                  {todaySprintTasks.length} Completed
                </span>
              </div>

              {/* Tasks Checklist */}
              <div className="space-y-2">
                {todaySprintTasks.length > 0 ? (
                  todaySprintTasks.map((task) => {
                    const pill = getTaskTypePill(task.task_type);
                    const isDone = task.is_completed;
                    const slug = task.problem?.slug;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group',
                          isDone
                            ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                            : 'border-white/[0.06] bg-[#181C26] hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Interactive Completion Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task)}
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 transition-colors',
                              isDone
                                ? 'border-emerald-500 bg-emerald-500 text-black font-bold'
                                : 'border-white/20 group-hover:border-emerald-400 text-transparent'
                            )}
                          >
                            ✓
                          </button>

                          <div className="min-w-0 space-y-0.5">
                            <p
                              className={cn(
                                'text-sm font-semibold truncate',
                                isDone ? 'line-through text-neutral-400' : 'text-neutral-100'
                              )}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                              <span
                                className={cn(
                                  'px-1.5 py-0.2 rounded border font-semibold text-[10px]',
                                  pill.className
                                )}
                              >
                                {pill.label}
                              </span>
                              <span>•</span>
                              <span>{task.estimated_minutes} min</span>
                              {task.problem && (
                                <>
                                  <span>•</span>
                                  <DifficultyBadge
                                    difficulty={task.problem.difficulty}
                                    showPip={false}
                                    className="text-[9px] px-1 py-0.2"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Link */}
                        {slug && (
                          <Link to={`/problems/${slug}`}>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#12151D] hover:bg-white/[0.08] text-neutral-200 border border-white/[0.08] flex items-center gap-1.5 shrink-0 transition-colors"
                            >
                              <span>Solve</span>
                              <ExternalLink className="w-3 h-3 text-blue-400" />
                            </button>
                          </Link>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center rounded-xl border border-dashed border-white/[0.08] bg-[#181C26]/50 space-y-3">
                    <p className="text-xs text-neutral-400 font-mono">
                      No tasks scheduled for today in this sprint horizon.
                    </p>
                    <Link to="/app/diagnostic">
                      <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                        Generate Sprint from Diagnostic
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Empirical Progress Matrix */}
            <CategoryProgressModule
              solvedCount={solvedCount}
              totalProblems={totalProblems}
              easySolved={easySolved}
              easyTotal={easyTotal}
              medSolved={medSolved}
              medTotal={medTotal}
              hardSolved={hardSolved}
              hardTotal={hardTotal}
              topicMastery={topicMastery}
            />
          </div>

          {/* ========================================================================= */}
          {/* RIGHT RAIL: TELEMETRY & PERSISTENT HORIZON (35% / 4 cols) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* Problem of the Day (POTD) Widget */}
            <ProblemOfTheDayCard solvedProblemIds={telemetry.solvedProblemIds} />

            {/* 30-Day Activity Pulse */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#12151D] shadow-elevation-1 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                    Telemetry Invariants
                  </span>
                  <h4 className="text-sm font-bold text-white">30-Day Activity Pulse</h4>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {activeDaysCount} / 30 Active
                </span>
              </div>

              {/* 30-Cell Micro-Grid */}
              <div className="grid grid-cols-10 gap-1.5 pt-1">
                {activityPulseCells.map((cell) => (
                  <div
                    key={cell.dateStr}
                    title={`${cell.dateStr}: ${cell.count} submissions`}
                    className={cn(
                      'aspect-square rounded-md transition-all',
                      cell.active
                        ? 'bg-[#00B8A3] shadow-[0_0_8px_rgba(0,184,163,0.4)]'
                        : 'bg-[#1C212E] hover:bg-neutral-800'
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-white/[0.04]">
                <span>30 Days Ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Spaced Repetition Due Today Queue */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#12151D] shadow-elevation-1 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white">Spaced Repetition Queue</h4>
                </div>
                <Link
                  to="/app/revision"
                  className="text-[11px] font-mono text-purple-400 hover:underline"
                >
                  Deck View →
                </Link>
              </div>

              <div className="space-y-2">
                {revisionDueItems.length > 0 ? (
                  revisionDueItems.map((card) => {
                    const prob = card.problem;
                    const stageLabel =
                      card.interval_days <= 1
                        ? 'Stage 1 (1d)'
                        : card.interval_days <= 3
                        ? 'Stage 2 (3d)'
                        : card.interval_days <= 7
                        ? 'Stage 3 (7d)'
                        : 'Stage 4 (21d)';

                    return (
                      <div
                        key={card.id}
                        className="p-3 rounded-xl border border-white/[0.06] bg-[#181C26] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-neutral-200 truncate">
                            {prob?.title || 'Algorithmic Problem'}
                          </p>
                          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                            {stageLabel}
                          </span>
                        </div>

                        <Link to="/app/revision">
                          <button className="px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-[#12151D] border border-white/[0.08] text-neutral-300 hover:text-white transition-colors">
                            Review
                          </button>
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center space-y-2 rounded-xl border border-dashed border-white/[0.06] bg-[#181C26]/40">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                    <p className="text-xs font-mono text-neutral-400">
                      All revision cards fresh.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Coding Activity (Server-Authoritative) */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#12151D] shadow-elevation-1 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                    Live Telemetry
                  </span>
                  <h4 className="text-sm font-bold text-white">Recent Coding Activity</h4>
                </div>
                <span className="text-xs font-mono text-neutral-400">Authoritative</span>
              </div>

              <div className="space-y-2">
                {recentActivities.length > 0 ? (
                  recentActivities.map((act, i) => (
                    <div
                      key={act.problemId || i}
                      className="p-3 rounded-xl border border-white/[0.06] bg-[#181C26] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.06]">
                            {act.verniqId}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold',
                              act.status === 'SOLVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            )}
                          >
                            {act.status === 'SOLVED' ? '✓ Solved' : '○ Attempted'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-200 truncate">
                          {act.problemTitle}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center space-y-2 rounded-xl border border-dashed border-white/[0.06] bg-[#181C26]/40">
                    <p className="text-xs font-mono text-neutral-400">
                      No recent submissions recorded yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default DashboardView;
