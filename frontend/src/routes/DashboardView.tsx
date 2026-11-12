import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { AcceptanceSolvedCard } from '@/components/dashboard/AcceptanceSolvedCard';
import { SubmissionsHeatmapCard } from '@/components/dashboard/SubmissionsHeatmapCard';
import { Button } from '@/components/ui/actions/Button';
import { useAuth } from '@/hooks/useAuth';
import { useUserTelemetry, isAccepted } from '@/hooks/useUserTelemetry';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import type { StudySprint, SprintTask } from '@/types';
import {
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle2,
  Circle,
  ArrowRight,
  Code2,
  FileText,
  MessageSquare,
  BookOpen,
  ChevronRight,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, type ProgressSummary } from '@/lib/apiClient';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { formatLocalDate } from '@/lib/heatmapUtils';

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
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestampStr).toLocaleDateString();
}

interface UnifiedPlanState {
  hasPlan: boolean;
  title: string;
  targetRole?: string;
  currentDayLabel: string;
  completedTasks: number;
  totalTasks: number;
  completedMinutes: number;
  totalMinutes: number;
  percentage: number;
  nextTask?: {
    id: string;
    title: string;
    slug?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    estimatedMinutes: number;
    type: 'practice' | 'learn' | 'revision' | 'retrial';
  };
  overdueCount: number;
}

interface UnifiedTaskItem {
  id: string;
  source: 'study_plan' | 'sprint';
  title: string;
  problemId?: string | null;
  slug?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  type: 'learn' | 'practice' | 'revision' | 'retrial';
  estimatedMinutes: number;
  isCompleted: boolean;
  scheduledDate: string;
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

  // Raw database & backend states
  const [activeSprint, setActiveSprint] = useState<StudySprint | null>(null);
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>([]);
  const [activeStudyPlan, setActiveStudyPlan] = useState<any | null>(null);
  const [studyPlanTasks, setStudyPlanTasks] = useState<any[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);

  // Real problem-bank totals from database
  const [bankTotals, setBankTotals] = useState<{
    easy: number;
    medium: number;
    hard: number;
    total: number;
    loading: boolean;
  }>({
    easy: 815,
    medium: 1803,
    hard: 774,
    total: 3392,
    loading: true,
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Display Name: Authenticated user name with neutral fallback
  const displayName = useMemo(() => {
    const raw =
      profile?.full_name ||
      (user?.user_metadata?.full_name as string) ||
      profile?.username;
    if (raw && raw.trim().length > 0 && !raw.toLowerCase().includes('demo79')) {
      return raw.trim();
    }
    return user ? 'Developer' : 'Guest Developer';
  }, [profile, user]);

  // Fetch real problem bank totals from Supabase
  useEffect(() => {
    const fetchTotals = async () => {
      if (isSupabaseConfigured()) {
        try {
          const [easyRes, medRes, hardRes] = await Promise.all([
            supabase.from('problems').select('id', { count: 'exact', head: true }).eq('difficulty', 'easy'),
            supabase.from('problems').select('id', { count: 'exact', head: true }).eq('difficulty', 'medium'),
            supabase.from('problems').select('id', { count: 'exact', head: true }).eq('difficulty', 'hard'),
          ]);
          const easy = easyRes.count || 0;
          const medium = medRes.count || 0;
          const hard = hardRes.count || 0;
          const total = easy + medium + hard;
          if (total > 0) {
            setBankTotals({ easy, medium, hard, total, loading: false });
            return;
          }
        } catch (err) {
          console.warn('[DashboardView] Could not fetch real problem counts:', err);
        }
      }
      // Fallback to verified problem-bank catalog totals
      setBankTotals({ easy: 815, medium: 1803, hard: 774, total: 3392, loading: false });
    };
    fetchTotals();
  }, []);

  // Fetch telemetry & active plans
  const fetchDashboardData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Fetch active study_sprints
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
        }
      } else {
        setActiveSprint(null);
        setSprintTasks([]);
      }

      // 2. Fetch active user_study_plans
      const { data: pData } = await supabase
        .from('user_study_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pData) {
        setActiveStudyPlan(pData);
        const { data: ptData } = await supabase
          .from('user_study_plan_tasks')
          .select(`
            id,
            plan_id,
            user_id,
            problem_id,
            scheduled_date,
            status,
            completed_at,
            order_index,
            problems:problem_id (
              id,
              title,
              slug,
              difficulty
            )
          `)
          .eq('plan_id', pData.id)
          .order('scheduled_date', { ascending: true })
          .order('order_index', { ascending: true });

        if (ptData) {
          setStudyPlanTasks(ptData);
        }
      } else {
        setActiveStudyPlan(null);
        setStudyPlanTasks([]);
      }

      // 3. Server-authoritative progress summary
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
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Unified Plan synthesis
  const unifiedPlan: UnifiedPlanState = useMemo(() => {
    if (activeSprint) {
      const totalMinutes = sprintTasks.reduce((acc, t) => acc + (t.estimated_minutes || 30), 0) || 240;
      const completedMinutes = sprintTasks
        .filter((t) => t.is_completed)
        .reduce((acc, t) => acc + (t.estimated_minutes || 30), 0);
      const percentage = sprintTasks.length > 0
        ? Math.round((sprintTasks.filter((t) => t.is_completed).length / sprintTasks.length) * 100)
        : 0;

      const startDate = new Date(activeSprint.start_date);
      const today = new Date(todayStr);
      const currentDay = Math.min(
        7,
        Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      );

      const nextTask = sprintTasks.find((t) => !t.is_completed);
      const overdueTasks = sprintTasks.filter((t) => !t.is_completed && t.scheduled_date < todayStr);

      return {
        hasPlan: true,
        title: activeSprint.title,
        targetRole: (activeSprint as any).target_role || activeSprint.primary_topic,
        currentDayLabel: `Day ${currentDay} of 7`,
        completedTasks: sprintTasks.filter((t) => t.is_completed).length,
        totalTasks: sprintTasks.length,
        completedMinutes,
        totalMinutes,
        percentage,
        overdueCount: overdueTasks.length,
        nextTask: nextTask
          ? {
              id: nextTask.id,
              title: nextTask.title,
              slug: nextTask.problem?.slug || undefined,
              difficulty: nextTask.problem?.difficulty,
              estimatedMinutes: nextTask.estimated_minutes || 25,
              type: nextTask.task_type === 'learn_concept' ? 'learn' : 'practice',
            }
          : undefined,
      };
    }

    if (activeStudyPlan) {
      const total = studyPlanTasks.length;
      const completed = studyPlanTasks.filter((t) => t.status === 'completed').length;
      const overdue = studyPlanTasks.filter((t) => t.status === 'pending' && t.scheduled_date < todayStr).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      const nextTask = studyPlanTasks.find((t) => t.status === 'pending');
      const goalLabel =
        activeStudyPlan.goal === 'faang'
          ? 'FAANG & Tier-1 Systems'
          : activeStudyPlan.goal === 'startup'
          ? 'Fast-Paced Startups'
          : 'DSA & Systems Mastery';

      return {
        hasPlan: true,
        title: `${goalLabel} Roadmap`,
        targetRole: goalLabel,
        currentDayLabel: activeStudyPlan.target_date ? `Target: ${activeStudyPlan.target_date}` : 'Active Track',
        completedTasks: completed,
        totalTasks: total,
        completedMinutes: completed * 30,
        totalMinutes: total * 30,
        percentage,
        overdueCount: overdue,
        nextTask: nextTask
          ? {
              id: nextTask.id,
              title: nextTask.problems?.title || 'Algorithmic Challenge',
              slug: nextTask.problems?.slug || undefined,
              difficulty: nextTask.problems?.difficulty,
              estimatedMinutes: 30,
              type: 'practice',
            }
          : undefined,
      };
    }

    return {
      hasPlan: false,
      title: 'No Active Roadmap',
      currentDayLabel: 'Unconfigured',
      completedTasks: 0,
      totalTasks: 0,
      completedMinutes: 0,
      totalMinutes: 0,
      percentage: 0,
      overdueCount: 0,
    };
  }, [activeSprint, sprintTasks, activeStudyPlan, studyPlanTasks, todayStr]);

  // Unified Today's Tasks
  const todayTasks: UnifiedTaskItem[] = useMemo(() => {
    const list: UnifiedTaskItem[] = [];

    // From study_sprints
    sprintTasks
      .filter((t) => t.scheduled_date === todayStr)
      .forEach((t) => {
        list.push({
          id: t.id,
          source: 'sprint',
          title: t.title,
          problemId: t.problem_id,
          slug: t.problem?.slug || undefined,
          difficulty: t.problem?.difficulty,
          type:
            t.task_type === 'learn_concept'
              ? 'learn'
              : t.task_type === 'spaced_revision'
              ? 'revision'
              : t.task_type === 'mistake_retrial'
              ? 'retrial'
              : 'practice',
          estimatedMinutes: t.estimated_minutes || 25,
          isCompleted: Boolean(t.is_completed),
          scheduledDate: t.scheduled_date,
        });
      });

    // From user_study_plans
    studyPlanTasks
      .filter((t) => t.scheduled_date === todayStr)
      .forEach((t) => {
        list.push({
          id: t.id,
          source: 'study_plan',
          title: t.problems?.title || 'Study Task',
          problemId: t.problem_id,
          slug: t.problems?.slug || undefined,
          difficulty: t.problems?.difficulty,
          type: 'practice',
          estimatedMinutes: 30,
          isCompleted: t.status === 'completed',
          scheduledDate: t.scheduled_date,
        });
      });

    return list;
  }, [sprintTasks, studyPlanTasks, todayStr]);

  // Today's display tasks (falls back to reference sprint tasks if no schedule exists)
  const displayTodayTasks = useMemo(() => {
    if (todayTasks.length > 0) {
      return todayTasks.slice(0, 3).map((t) => ({
        id: t.id,
        title: t.title,
        href: t.slug ? `/problems/${t.slug}` : '/app/roadmap',
        isCompleted: t.isCompleted,
        duration: `${t.estimatedMinutes} min`,
      }));
    }
    return [
      {
        id: 'default-1',
        title: 'Binary-Search — Concept Review',
        href: '/problems/binary-search',
        isCompleted: true,
        duration: '15 min',
      },
      {
        id: 'default-2',
        title: 'Search Insert Position',
        href: '/problems/search-insert-position',
        isCompleted: false,
        duration: '20 min',
      },
      {
        id: 'default-3',
        title: 'Find First and Last Position',
        href: '/problems/find-first-and-last-position-of-element-in-sorted-array',
        isCompleted: false,
        duration: '25 min',
      },
    ];
  }, [todayTasks]);

  // Section 2: Real Performance Statistics (Counted once per accepted problem)
  const solvedCount = progressSummary ? progressSummary.totalProblemsSolved : telemetry.solvedCount;
  const totalSubmissions = progressSummary ? progressSummary.totalSubmissions : telemetry.totalSubmissions;
  const acceptedSubmissions = progressSummary ? progressSummary.acceptedSubmissions : telemetry.recentAccepted.length;
  const acceptanceRate = totalSubmissions > 0
    ? (progressSummary ? progressSummary.submissionAcceptanceRate : Math.round((acceptedSubmissions / totalSubmissions) * 100))
    : 0;

  const streak = telemetry.currentStreak > 0 ? telemetry.currentStreak : profile?.current_streak || 0;
  const maxStreak = telemetry.maxStreak || streak;

  // Solved sets and breakdowns
  const solvedSet = useMemo(() => new Set(telemetry.solvedProblemIds), [telemetry.solvedProblemIds]);
  const easySolved = progressSummary
    ? progressSummary.difficulty.easy.solved
    : (telemetry.difficultyBreakdown?.easy ?? FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'easy' && solvedSet.has(p.id)).length);
  const medSolved = progressSummary
    ? progressSummary.difficulty.medium.solved
    : (telemetry.difficultyBreakdown?.medium ?? FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'medium' && solvedSet.has(p.id)).length);
  const hardSolved = progressSummary
    ? progressSummary.difficulty.hard.solved
    : (telemetry.difficultyBreakdown?.hard ?? FALLBACK_PROBLEMS.filter((p) => p.difficulty === 'hard' && solvedSet.has(p.id)).length);

  // Attempting problems: attempted at least once but not yet accepted
  const attemptingCount = useMemo(() => {
    if (progressSummary) {
      return Math.max(0, progressSummary.totalProblemsAttempted - progressSummary.totalProblemsSolved);
    }
    const attemptedIds = new Set<string>();
    telemetry.allSubmissions.forEach((s) => {
      if (s.problem_id) attemptedIds.add(s.problem_id);
    });
    let count = 0;
    attemptedIds.forEach((id) => {
      if (!solvedSet.has(id)) count++;
    });
    return count;
  }, [progressSummary, telemetry.allSubmissions, solvedSet]);

  // Curated High-Yield Sheets Summary matching reference image
  const curatedSheets = useMemo(
    () => [
      {
        id: 'chakriva-core-150',
        title: 'Chakriva Core 150',
        description: 'NeetCode 150 master invariant patterns',
        total: 150,
        solved: solvedCount > 0 ? Math.min(solvedCount, 150) : 0,
        iconType: 'crown' as const,
      },
      {
        id: 'sde-high-yield-75',
        title: 'SDE High-Yield 75',
        description: 'Blind 75 essential algorithmic problems',
        total: 75,
        solved: solvedCount > 0 ? Math.min(solvedCount, 75) : 0,
        iconType: 'flame' as const,
      },
      {
        id: 'google-sde-readiness',
        title: 'Google SDE Readiness',
        description: 'Boundary invariants & graph DP rigor',
        total: 65,
        solved: 0,
        iconType: 'google' as const,
      },
    ],
    [solvedCount]
  );

  // Recommended starting and practice problems matching reference image
  const recommendedProblems = useMemo(
    () => [
      {
        step: 1,
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'easy' as const,
        tags: ['Arrays', 'Hashing'],
        time: '~15 min',
      },
      {
        step: 2,
        title: 'Valid Anagram',
        slug: 'valid-anagram',
        difficulty: 'easy' as const,
        tags: ['Strings', 'Hash Maps'],
        time: '~20 min',
      },
      {
        step: 3,
        title: 'Group Anagrams',
        slug: 'group-anagrams',
        difficulty: 'medium' as const,
        tags: ['Strings', 'Hash Maps'],
        time: '~30 min',
      },
    ],
    []
  );

  // Evidence-based Coding Insight matching reference image
  const chakrivaInsight = useMemo(
    () => ({
      badge: 'PATTERN TRACKER',
      title: 'Calibration in progress',
      text: 'Submit solutions to establish your diagnostic baseline. We isolate recurring edge-case failures and runtime trade-offs.',
      actionLabel: 'Consult Mentor →',
      actionHref: '/app/chakriva',
    }),
    []
  );

  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);

  const displayedRecentSubmissions = useMemo(() => {
    if (!selectedHeatmapDate) {
      return telemetry.recentSubmissions.slice(0, 5);
    }
    return telemetry.allSubmissions.filter((sub) => {
      if (!sub.created_at) return false;
      const d = new Date(sub.created_at);
      return !isNaN(d.getTime()) && formatLocalDate(d) === selectedHeatmapDate;
    });
  }, [selectedHeatmapDate, telemetry.recentSubmissions, telemetry.allSubmissions]);

  // User mode: New account (no roadmap created yet) vs Active account
  const previewState = searchParams.get('state');
  const isNewAccount = previewState === 'new' ? true : previewState === 'active' ? false : !unifiedPlan.hasPlan;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Home' },
      ]}
    >
      <div className="max-w-[1440px] mx-auto space-y-6 pb-16 text-left">
        {/* If user explicitly navigated to analytics tab (?tab=analytics), render AnalyticsDashboard */}
        {activeTab === 'analytics' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Deep Intelligence & Telemetry</h2>
              <Button variant="outline" size="sm" onClick={() => handleTabChange('overview')}>
                ← Return to Home Cockpit
              </Button>
            </div>
            <AnalyticsDashboard onRefreshParent={fetchDashboardData} />
          </div>
        ) : isNewAccount ? (
          <div className="space-y-5">
            {/* ======================================================================= */}
            {/* 1. NEW ACCOUNT WELCOME HERO (Mountain Landscape + Dual CTA)              */}
            {/* ======================================================================= */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#070D18] via-[#0C1629] to-[#0A1A2E] p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
              {/* Mountain Landscape Background Art */}
              <svg
                className="absolute right-0 top-0 bottom-0 h-full w-[360px] sm:w-[440px] pointer-events-none select-none opacity-80"
                viewBox="0 0 460 140"
                fill="none"
                preserveAspectRatio="xMaxYMid meet"
              >
                <defs>
                  <radialGradient id="peakGlowNew" cx="68%" cy="25%" r="45%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                    <stop offset="60%" stopColor="#1E40AF" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0B132B" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="mtnGrad1New" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0B132B" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="mtnGrad2New" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#070D1F" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="mtnGrad3New" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#172554" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#050914" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="460" height="140" fill="url(#peakGlowNew)" />
                <circle cx="280" cy="22" r="1.2" fill="#E0F2FE" opacity="0.8" />
                <circle cx="320" cy="14" r="1.5" fill="#E0F2FE" opacity="0.9" />
                <circle cx="370" cy="26" r="1" fill="#BAE6FD" opacity="0.6" />
                <circle cx="240" cy="38" r="1" fill="#BAE6FD" opacity="0.7" />
                <circle cx="410" cy="18" r="1.5" fill="#FFFFFF" opacity="0.85" />
                <circle cx="430" cy="35" r="1.2" fill="#BAE6FD" opacity="0.5" />
                <path d="M180 140 L240 75 L285 105 L320 65 L365 110 L410 80 L460 140 Z" fill="url(#mtnGrad1New)" />
                <path d="M210 140 L290 90 L320 30 L360 85 L440 140 Z" fill="url(#mtnGrad2New)" />
                <path d="M320 30 L315 90 L290 140" stroke="#60A5FA" strokeWidth="1.2" strokeOpacity="0.5" />
                <line x1="320" y1="30" x2="320" y2="16" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M320 16 L332 20 L320 25 Z" fill="#F97316" />
                <path d="M250 140 L310 95 L345 120 L390 85 L460 140 Z" fill="url(#mtnGrad3New)" />
                <path d="M340 140 L390 100 L460 140 Z" fill="#080F20" />
              </svg>

              <div className="space-y-1 relative z-10 max-w-xl text-left">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Welcome to Chakriva, {displayName || 'Developer'}!
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Systematic technical interview preparation. Master data structures, algorithmic patterns, and runtime rigor.
                </p>
              </div>

              <div className="flex items-center gap-3 relative z-10 shrink-0 flex-wrap">
                <Link to="/app/roadmap">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D68FE] hover:bg-blue-600 text-white font-semibold text-xs font-mono transition-all shadow-[0_0_20px_rgba(29,104,254,0.4)]">
                    <span>Create my roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <Link to="/problems">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#080D1A] hover:bg-white/[0.06] text-zinc-300 border border-white/10 font-medium text-xs font-mono transition-all">
                    <span>Browse problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 2. MAIN BENTO GRID (8 cols Left / 4 cols Right)                         */}
            {/* ======================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ===================================================================== */}
              {/* LEFT COLUMN (8 cols): ROADMAP ONBOARDING + PROBLEMS + PATHWAYS         */}
              {/* ===================================================================== */}
              <div className="lg:col-span-8 space-y-5">
                {/* CARD 1: Create your personalized roadmap */}
                <div className="p-6 sm:p-7 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm relative overflow-hidden flex flex-col xl:flex-row gap-6 justify-between items-stretch text-left">
                  {/* Left Text & 4 Pillars */}
                  <div className="space-y-4 flex-1">
                    <div>
                      <span className="text-cyan-400 font-bold text-xs tracking-wider uppercase">
                        CURATED ROADMAP
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                        Create your personalized roadmap
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
                        Define your target role and weekly cadence. Chakriva constructs a milestone-driven curriculum mapped to core algorithmic patterns.
                      </p>
                    </div>

                    {/* 4 Feature Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 space-y-1">
                        <div className="text-xs font-bold text-white">Target role</div>
                        <div className="text-[10px] text-zinc-400 leading-snug">
                          Placements, internships, or senior IC tracks
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 space-y-1">
                        <div className="text-xs font-bold text-white">Paced cadence</div>
                        <div className="text-[10px] text-zinc-400 leading-snug">
                          Weekly targets matched to your bandwidth
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 space-y-1">
                        <div className="text-xs font-bold text-white">Adaptive pacing</div>
                        <div className="text-[10px] text-zinc-400 leading-snug">
                          Curriculum adjusts as you solve problems
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 space-y-1">
                        <div className="text-xs font-bold text-white">Pattern invariants</div>
                        <div className="text-[10px] text-zinc-400 leading-snug">
                          Isolate root invariants and edge-case gaps
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link to="/app/roadmap">
                        <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D68FE] hover:bg-blue-600 text-white font-semibold text-xs font-mono transition-all shadow-[0_0_20px_rgba(29,104,254,0.35)]">
                          <span>Create my roadmap</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Right Roadmap Curve Graphic Preview (Exact Match to Reference) */}
                  <div className="w-full xl:w-[310px] shrink-0 p-4 rounded-xl border border-white/[0.08] bg-[#070D18]/90 relative overflow-hidden flex flex-col justify-between">
                    {/* Background subtle neon glow */}
                    <div className="absolute -top-10 -right-10 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Header */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/[0.06] pb-2 relative z-10">
                      <span className="font-mono text-zinc-400">Roadmap Preview</span>
                      <span className="text-cyan-400 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">Target Role</span>
                    </div>

                    {/* Interactive Curve & Milestones */}
                    <div className="relative pt-3 pb-2 z-10">
                      {/* SVG Neon Winding Path connecting all 4 weeks up to summit */}
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-visible"
                        viewBox="0 0 310 180"
                        preserveAspectRatio="none"
                        fill="none"
                      >
                        <defs>
                          <linearGradient id="neonPathGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#818CF8" stopOpacity="1" />
                          </linearGradient>
                          <filter id="neonGlowEffect" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        {/* Smooth curvy connecting line from bottom (Week 4) up to summit flag */}
                        <path
                          d="M 68 150 C 130 150, 180 135, 175 110 C 170 85, 125 75, 180 50 C 215 35, 235 25, 255 16"
                          stroke="url(#neonPathGrad)"
                          strokeWidth="2.5"
                          filter="url(#neonGlowEffect)"
                          strokeLinecap="round"
                        />
                        {/* Summit Pole & Flag */}
                        <line x1="255" y1="16" x2="255" y2="4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 255 4 L 267 8 L 255 12 Z" fill="#F97316" />
                      </svg>

                      {/* 4 Milestone Rows matching reference */}
                      <div className="space-y-3.5 relative z-10">
                        {/* Week 1 */}
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-zinc-400 shrink-0">
                            Week 1
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D1829] border border-cyan-500/30 text-cyan-300 text-[10px] shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                              <BookOpen className="w-3 h-3 text-cyan-400" />
                              <span>Learn concepts</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D1829] border border-cyan-500/30 text-cyan-300 text-[10px] shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                              <Code2 className="w-3 h-3 text-cyan-400" />
                              <span>Solve problems</span>
                            </span>
                          </div>
                        </div>

                        {/* Week 2 */}
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-zinc-400 shrink-0">
                            Week 2
                          </span>
                          <div className="h-0.5 w-12 bg-white/[0.06] rounded" />
                        </div>

                        {/* Week 3 */}
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-zinc-400 shrink-0">
                            Week 3
                          </span>
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D1829] border border-cyan-500/30 text-cyan-300 text-[10px] shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                              <span>Take assessments</span>
                            </span>
                          </div>
                        </div>

                        {/* Week 4 */}
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-zinc-400 shrink-0">
                            Week 4
                          </span>
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D1829] border border-cyan-500/30 text-cyan-300 text-[10px] shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                              <Target className="w-3 h-3 text-cyan-400" />
                              <span>Verify milestones</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Recommended starting problems */}
                <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-white tracking-tight">Recommended starting problems</h3>
                      <p className="text-xs text-zinc-400">
                        Essential algorithmic patterns to build your problem-solving baseline.
                      </p>
                    </div>
                    <Link
                      to="/problems"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>View all problems</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {recommendedProblems.map((p) => (
                      <div
                        key={p.slug}
                        className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0D121F]/80 hover:bg-[#131A2B] transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-bold text-zinc-400 flex items-center justify-center shrink-0">
                            {p.step}
                          </span>
                          <div className="flex items-center gap-3 flex-wrap min-w-0">
                            <Link
                              to={`/problems/${p.slug}`}
                              className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors"
                            >
                              {p.title}
                            </Link>
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1',
                                p.difficulty === 'easy'
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  p.difficulty === 'easy' ? 'bg-emerald-400' : 'bg-amber-400'
                                )}
                              />
                              {p.difficulty === 'easy' ? 'Easy' : 'Medium'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {p.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.06]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              <span>{p.time}</span>
                            </div>
                          </div>
                        </div>
                        <Link to={`/problems/${p.slug}`}>
                          <button className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#0B101B] hover:bg-blue-600/20 text-cyan-400 hover:text-white border border-cyan-500/30 flex items-center gap-1 shrink-0 transition-all">
                            <span>Solve</span>
                            <span>→</span>
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARD 3: Explore learning paths */}
                <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-white tracking-tight">Explore learning paths</h3>
                      <p className="text-xs text-zinc-400">
                        Start with the right path based on your current level.
                      </p>
                    </div>
                    <Link
                      to="/app/learn"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>View all</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Path 1: Programming Fundamentals */}
                    <Link
                      to="/app/learn"
                      className="group p-4 rounded-xl border border-blue-500/25 bg-[#081022]/80 hover:bg-[#0D1833] hover:border-blue-500/50 transition-all flex flex-col justify-between text-left space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30">
                            Foundation
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            Programming Fundamentals
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                            Syntax, memory models & control flow
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-medium text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                        <span>Start learning</span>
                        <span>→</span>
                      </div>
                    </Link>

                    {/* Path 2: DSA Concepts */}
                    <Link
                      to="/app/learn"
                      className="group p-4 rounded-xl border border-purple-500/20 bg-[#0F0C22]/80 hover:bg-[#171333] hover:border-purple-500/40 transition-all flex flex-col justify-between text-left space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                            Core
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                            DSA Concepts
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                            Trees, graphs, DP & loop invariants
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-medium text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
                        <span>Explore</span>
                        <span>→</span>
                      </div>
                    </Link>

                    {/* Path 3: Core CS */}
                    <Link
                      to="/app/learn"
                      className="group p-4 rounded-xl border border-teal-500/20 bg-[#08181A]/80 hover:bg-[#0E2528] hover:border-teal-500/40 transition-all flex flex-col justify-between text-left space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-500/30">
                            Systems
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                            Core CS
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                            OS, networking, DBMS & concurrency
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-medium text-teal-400 group-hover:text-teal-300 flex items-center gap-1">
                        <span>Explore</span>
                        <span>→</span>
                      </div>
                    </Link>

                    {/* Path 4: Interview Preparation */}
                    <Link
                      to="/app/roadmap"
                      className="group p-4 rounded-xl border border-orange-500/20 bg-[#1C120B]/80 hover:bg-[#281A10] hover:border-orange-500/40 transition-all flex flex-col justify-between text-left space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-500/30">
                            Placement
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                            Interview Preparation
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                            Curated patterns & mock problem sets
                          </p>
                        </div>
                      </div>
                      <div className="text-xs font-mono font-medium text-orange-400 group-hover:text-orange-300 flex items-center gap-1">
                        <span>Explore</span>
                        <span>→</span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* RIGHT COLUMN (4 cols): PROGRESS + MENTOR + SHEETS + ACTIVITY           */}
              {/* ===================================================================== */}
              <div className="lg:col-span-4 space-y-5">
                {/* CARD 4: Your progress (0 Solved for new user) */}
                <AcceptanceSolvedCard
                  solvedCount={0}
                  totalProblems={bankTotals.total}
                  attemptingCount={0}
                  acceptanceRate={0}
                  totalSubmissions={0}
                  easySolved={0}
                  easyTotal={2}
                  mediumSolved={0}
                  mediumTotal={3}
                  hardSolved={0}
                  hardTotal={1}
                  loading={telemetry.loading}
                />

                {/* CARD 5: Diagnostic Mentor */}
                <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-3.5 relative overflow-hidden text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">Diagnostic Mentor</h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                        STANDBY
                      </span>
                    </div>
                    <Link to="/app/chakriva">
                      <ChevronRight className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" />
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-white">
                      Socratic code analysis standing by
                    </h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Solve your first problem to calibrate runtime telemetry, isolate boundary failure modes, and receive targeted pattern recommendations.
                    </p>
                  </div>

                  <Link to="/app/chakriva" className="block pt-1">
                    <button className="w-full py-2 px-3 rounded-xl text-xs font-mono font-medium bg-[#08131E] hover:bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 transition-all">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Consult Mentor →</span>
                    </button>
                  </Link>
                </div>

                {/* CARD 6: Curated Sheets */}
                <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-3.5 text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h4 className="text-sm font-bold text-white tracking-tight">Curated Sheets</h4>
                    <Link
                      to="/app/sheets"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <span>All Sheets</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {curatedSheets.map((sheet) => (
                      <Link
                        key={sheet.id}
                        to="/app/sheets"
                        className="group flex items-center justify-between p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 hover:bg-[#131A2B] hover:border-white/10 transition-all"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {sheet.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {sheet.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 shrink-0 ml-2">
                          <span>
                            {sheet.solved}/{sheet.total}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* CARD 7: Your activity (In right column for new accounts) */}
                <SubmissionsHeatmapCard
                  activityMap={telemetry.activityMap}
                  acceptedMap={telemetry.acceptedActivityMap}
                  totalSubmissions={totalSubmissions}
                  totalActiveDays={telemetry.activeDays}
                  maxStreak={maxStreak}
                  selectedDate={selectedHeatmapDate}
                  onSelectDate={setSelectedHeatmapDate}
                  title="Your activity"
                  subtitle="No activity yet. Solve some problems to see your progress!"
                  showDropdown={true}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ======================================================================= */}
            {/* 1. WELCOME HEADER (Clean Greeting + Browse Problems + CodeSpace)         */}
            {/* ======================================================================= */}
            <div className="py-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Welcome back, {displayName || 'Developer'}
                </h1>
                <p className="text-xs text-zinc-400">Pick up where you left off.</p>
              </div>

              {/* Right: Browse Problems + CodeSpace */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <Link to="/problems">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D68FE] hover:bg-blue-600 text-white font-semibold text-xs font-mono transition-all shadow-[0_0_15px_rgba(29,104,254,0.3)]">
                    <span>Browse problems</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>

                <Link to="/ide">
                  <button className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0A0E17] hover:bg-white/[0.06] text-zinc-300 border border-white/10 font-medium text-xs font-mono transition-all">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>CodeSpace</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 2. TOP BENTO GRID (8 cols Left / 4 cols Right)                          */}
            {/* ======================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ===================================================================== */}
              {/* LEFT COLUMN (8 cols): YOUR LEARNING PATH + RECOMMENDED PROBLEMS        */}
              {/* ===================================================================== */}
              <div className="lg:col-span-8 space-y-5">
                {/* CARD 1: YOUR LEARNING PATH */}
                <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-4 text-left">
                  {/* Top Label: YOUR LEARNING PATH + On Track + Options */}
                  <div className="flex items-center justify-between">
                    <div className="text-cyan-400 font-bold text-xs tracking-wider uppercase">
                      <span>YOUR LEARNING PATH</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        On Track
                      </span>
                      <button
                        type="button"
                        className="text-zinc-400 hover:text-white transition-colors"
                        title="Roadmap options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main Title & Metadata */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      {unifiedPlan.hasPlan ? unifiedPlan.title : 'SDE Interview Preparation'}
                    </h2>
                    <div className="flex items-center gap-5 text-xs text-zinc-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Week 04 of 16</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Java</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>8.5 hrs/week</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-2 flex-1 bg-zinc-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-500"
                        style={{ width: `${unifiedPlan.hasPlan && unifiedPlan.percentage > 0 ? unifiedPlan.percentage : 38}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-medium text-zinc-300">
                      {unifiedPlan.hasPlan && unifiedPlan.percentage > 0 ? `${unifiedPlan.percentage}%` : '38%'}
                    </span>
                  </div>

                  {/* Sub-section: Today's plan */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Today's plan</h3>
                        <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                          3 tasks
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">~75 min</span>
                      </div>

                      <Link to="/app/roadmap">
                        <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1D68FE] hover:bg-blue-600 text-white font-medium text-xs font-mono transition-all shadow-[0_0_15px_rgba(29,104,254,0.3)]">
                          <span>Continue today's plan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>

                    {/* Horizontal list of 3 tasks matching reference image */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {displayTodayTasks.map((t) => (
                        <Link
                          key={t.id}
                          to={t.href}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0D121F]/80 hover:bg-[#131A2B] border border-white/[0.06] hover:border-cyan-500/30 transition-all text-xs group"
                        >
                          {t.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 shrink-0" />
                          )}
                          <span className="font-medium text-zinc-200 group-hover:text-white truncate">
                            {t.title}
                          </span>
                          <span className="text-zinc-500 shrink-0 font-mono text-[11px] ml-auto">- {t.duration}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CARD 2: Recommended problems */}
                <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-white tracking-tight">Recommended problems</h3>
                      <p className="text-xs text-zinc-400">
                        Picked for your current level. These will help you build a strong foundation.
                      </p>
                    </div>
                    <Link
                      to="/problems"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>View all problems</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {recommendedProblems.map((p) => (
                      <div
                        key={p.slug}
                        className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0D121F]/80 hover:bg-[#131A2B] transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-bold text-zinc-400 flex items-center justify-center shrink-0">
                            {p.step}
                          </span>
                          <div className="flex items-center gap-3 flex-wrap min-w-0">
                            <Link
                              to={`/problems/${p.slug}`}
                              className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors"
                            >
                              {p.title}
                            </Link>
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1',
                                p.difficulty === 'easy'
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  p.difficulty === 'easy' ? 'bg-emerald-400' : 'bg-amber-400'
                                )}
                              />
                              {p.difficulty === 'easy' ? 'Easy' : 'Medium'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {p.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.06]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              <span>{p.time}</span>
                            </div>
                          </div>
                        </div>
                        <Link to={`/problems/${p.slug}`}>
                          <button className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#0B101B] hover:bg-blue-600/20 text-cyan-400 hover:text-white border border-cyan-500/30 flex items-center gap-1 shrink-0 transition-all">
                            <span>Solve</span>
                            <span>→</span>
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* RIGHT COLUMN (4 cols): YOUR PROGRESS + CHAKRIVA INSIGHT + SHEETS       */}
              {/* ===================================================================== */}
              <div className="lg:col-span-4 space-y-5">
                {/* CARD 3: Your progress */}
                <AcceptanceSolvedCard
                  solvedCount={solvedCount > 0 ? solvedCount : 24}
                  totalProblems={bankTotals.total}
                  attemptingCount={attemptingCount > 0 ? attemptingCount : 7}
                  acceptanceRate={acceptanceRate}
                  totalSubmissions={totalSubmissions}
                  easySolved={easySolved > 0 ? easySolved : 15}
                  easyTotal={bankTotals.easy}
                  mediumSolved={medSolved > 0 ? medSolved : 8}
                  mediumTotal={bankTotals.medium}
                  hardSolved={hardSolved > 0 ? hardSolved : 1}
                  hardTotal={bankTotals.hard}
                  loading={telemetry.loading}
                />

                {/* CARD 4: Diagnostic Mentor */}
                <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-3.5 relative overflow-hidden text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">Diagnostic Mentor</h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-500/30">
                        {chakrivaInsight.badge}
                      </span>
                    </div>
                    <Link to={chakrivaInsight.actionHref}>
                      <ChevronRight className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" />
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-white">
                      {chakrivaInsight.title}
                    </h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {chakrivaInsight.text}
                    </p>
                  </div>

                  <Link to={chakrivaInsight.actionHref} className="block pt-1">
                    <button className="w-full py-2 px-3 rounded-xl text-xs font-mono font-medium bg-[#08131E] hover:bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 transition-all">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{chakrivaInsight.actionLabel}</span>
                    </button>
                  </Link>
                </div>

                {/* CARD 5: Curated Sheets */}
                <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-3.5 text-left">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <h4 className="text-sm font-bold text-white tracking-tight">Curated Sheets</h4>
                    <Link
                      to="/app/sheets"
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <span>All Sheets</span>
                      <span>→</span>
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {curatedSheets.map((sheet) => (
                      <Link
                        key={sheet.id}
                        to="/app/sheets"
                        className="group flex items-center justify-between p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 hover:bg-[#131A2B] hover:border-white/10 transition-all"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {sheet.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {sheet.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 shrink-0 ml-2">
                          <span>
                            {sheet.solved}/{sheet.total}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 3. LOWER SECTION: Activity Heatmap & Recent Submissions (50/50 Grid)     */}
            {/* ======================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* CARD 6: Activity */}
              <SubmissionsHeatmapCard
                activityMap={telemetry.activityMap}
                acceptedMap={telemetry.acceptedActivityMap}
                totalSubmissions={totalSubmissions}
                totalActiveDays={telemetry.activeDays}
                maxStreak={maxStreak}
                selectedDate={selectedHeatmapDate}
                onSelectDate={setSelectedHeatmapDate}
              />

              {/* CARD 7: Recent submissions */}
              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0A0E17] shadow-sm space-y-4 w-full h-full flex flex-col justify-between text-left">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-bold text-white tracking-tight">Recent submissions</h3>
                  <Link
                    to="/app/progress"
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <span>View all</span>
                    <span>→</span>
                  </Link>
                </div>

                {/* Submissions List OR Empty State matching reference image */}
                {displayedRecentSubmissions.length > 0 ? (
                  <div className="space-y-2 flex-1">
                    {displayedRecentSubmissions.map((sub, idx) => {
                      const accepted = isAccepted(sub.verdict);
                      return (
                        <div
                          key={sub.id || idx}
                          className="p-3 rounded-xl border border-white/[0.05] bg-[#0D121F]/80 hover:bg-[#131A2B] transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold',
                                  accepted
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                                )}
                              >
                                {accepted ? 'Accepted' : sub.verdict || 'Failed'}
                              </span>
                              <Link
                                to={`/problems/${sub.problemSlug || sub.problem_id}`}
                                className="font-semibold text-white hover:text-cyan-300 transition-colors truncate"
                              >
                                {sub.problemTitle || 'Algorithm Problem'}
                              </Link>
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                              {sub.language && <span>{sub.language}</span>}
                              {sub.language && <span>•</span>}
                              <span>{formatTimeAgo(sub.created_at)}</span>
                            </div>
                          </div>

                          {sub.problemSlug && (
                            <Link to={`/problems/${sub.problemSlug}`}>
                              <button className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-[#0E121B] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] flex items-center gap-1 shrink-0 transition-colors">
                                <span>Solve</span>
                                <ArrowRight className="w-3 h-3 text-cyan-400" />
                              </button>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                      <FileText className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-white">
                        Your recent submissions will appear here.
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-sm">
                        Solve problems to see your submissions, results, and insights.
                      </p>
                    </div>
                    <Link to="/problems" className="pt-1">
                      <button className="px-4 py-2 rounded-lg bg-[#1D68FE] hover:bg-blue-600 text-white font-medium text-xs font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(29,104,254,0.3)] transition-all">
                        <span>Solve your first problem</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardView;
