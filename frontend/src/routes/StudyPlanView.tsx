import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Button } from '@/components/ui/actions/Button';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import type {
  PlannerGoal,
  PlanTaskStatus,
  UserStudyPlan,
  UserStudyPlanTask,
  Problem,
} from '@/types';
import {
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
  GraduationCap,
  Building2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Check,
  RotateCcw,
  CheckSquare,
  CalendarCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Domain Goal Configurations
const GOAL_OPTIONS: {
  id: PlannerGoal;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  difficultyFocus: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}[] = [
  {
    id: 'product_sde',
    title: 'Product SDE',
    subtitle: 'Top Unicorns & Product Companies',
    description: 'Master core DSA patterns: Two Pointers, Sliding Window, Trees, and HashMaps essential for Stripe, Atlassian, Uber.',
    difficultyFocus: '40% Easy • 50% Medium • 10% Hard',
    icon: Target,
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/30',
    accentText: 'text-emerald-400',
  },
  {
    id: 'faang_top_tier',
    title: 'FAANG / Top Tier',
    subtitle: 'Google, Meta, Apple, Amazon',
    description: 'Deep algorithmic rigor: Graphs, Dynamic Programming, Monotonic Stacks, and Invariant Proofs for L4/L5 rounds.',
    difficultyFocus: '20% Easy • 60% Medium • 20% Hard',
    icon: Zap,
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/30',
    accentText: 'text-blue-400',
  },
  {
    id: 'core_cs_foundations',
    title: 'Core CS Foundations',
    subtitle: 'Systems, GATE & Engineering Basics',
    description: 'Fundamental data structures, sorting algorithms, bit manipulation, and asymptotic space/time complexity.',
    difficultyFocus: '60% Easy • 35% Medium • 5% Hard',
    icon: Building2,
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30',
    accentText: 'text-amber-400',
  },
  {
    id: 'campus_placement',
    title: 'Campus Placements',
    subtitle: 'Tier-1 / Tier-2 University Hiring',
    description: 'High-yield online assessment questions, rapid pattern recognition, strings, math, arrays, and standard interview classics.',
    difficultyFocus: '50% Easy • 45% Medium • 5% Hard',
    icon: GraduationCap,
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/30',
    accentText: 'text-purple-400',
  },
];

const BANDWIDTH_OPTIONS = [
  { minutes: 30, problemsPerDay: 1, label: '30 min / day', subtitle: '1 Problem daily • Steady pacing' },
  { minutes: 60, problemsPerDay: 2, label: '60 min / day', subtitle: '2 Problems daily • Balanced track' },
  { minutes: 90, problemsPerDay: 3, label: '90 min / day', subtitle: '3 Problems daily • Fast track' },
  { minutes: 120, problemsPerDay: 4, label: '120 min / day', subtitle: '4 Problems daily • Intensive sprint' },
];

const TOPIC_OPTIONS = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Binary Search',
  'Linked Lists',
  'Trees & BST',
  'Graphs (BFS/DFS)',
  'Dynamic Programming',
  'Stack & Queues',
  'Greedy Algorithms',
];

interface EnrichedTask extends UserStudyPlanTask {
  problemDetails?: Problem;
}

export const StudyPlanView: React.FC = () => {
  const { user } = useAuth();

  // Active Plan & Tasks State
  const [activePlan, setActivePlan] = useState<UserStudyPlan | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [allProblems, setAllProblems] = useState<Problem[]>(FALLBACK_PROBLEMS);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Wizard Configuration State
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedGoal, setSelectedGoal] = useState<PlannerGoal>('product_sde');
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [timelineDays, setTimelineDays] = useState<number>(60);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    'Arrays & Hashing',
    'Two Pointers',
    'Binary Search',
    'Trees & BST',
  ]);
  const [generating, setGenerating] = useState<boolean>(false);

  // Calendar Week Window State
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  // Quick filter for tasks list
  const [taskFilter, setTaskFilter] = useState<'all' | 'due_today' | 'pending' | 'completed'>('all');

  // Load all problems once on mount
  useEffect(() => {
    const fetchCatalogProblems = async () => {
      if (!isSupabaseConfigured()) {
        setAllProblems(FALLBACK_PROBLEMS);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('problems')
          .select('id, title, slug, difficulty, acceptance_rate, description_markdown, constraints_markdown, starter_templates, is_premium, is_published, created_at, updated_at');
        if (!error && data && data.length > 0) {
          // Merge with fallback to ensure rich tags
          const merged: Problem[] = data.map((p) => {
            const fallbackMatch = FALLBACK_PROBLEMS.find((fb) => fb.id === p.id || fb.slug === p.slug);
            return {
              ...p,
              tags: fallbackMatch?.tags || ['Algorithms', 'DSA'],
              acceptance_rate: p.acceptance_rate || fallbackMatch?.acceptance_rate || 75,
            } as Problem;
          });
          setAllProblems(merged);
        } else {
          setAllProblems(FALLBACK_PROBLEMS);
        }
      } catch (err) {
        console.warn('Could not fetch catalog problems:', err);
        setAllProblems(FALLBACK_PROBLEMS);
      }
    };

    fetchCatalogProblems();
  }, []);

  // Fetch active study plan and associated tasks
  const fetchActivePlan = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Query active plan for user
      const { data: planData, error: planError } = await supabase
        .from('user_study_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planError) {
        console.error('Error fetching study plan:', planError);
        setActivePlan(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      if (!planData) {
        setActivePlan(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      setActivePlan(planData as UserStudyPlan);

      // Query tasks for active plan
      const { data: tasksData, error: tasksError } = await supabase
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
        .eq('plan_id', planData.id)
        .order('scheduled_date', { ascending: true })
        .order('order_index', { ascending: true });

      if (tasksError) {
        console.error('Error fetching plan tasks:', tasksError);
        setTasks([]);
      } else if (tasksData) {
        const enriched: EnrichedTask[] = tasksData.map((t: any) => {
          const matchedProblem =
            allProblems.find((p) => p.id === t.problem_id) ||
            FALLBACK_PROBLEMS.find((p) => p.id === t.problem_id) ||
            t.problems;
          return {
            ...t,
            problemDetails: matchedProblem,
          };
        });
        setTasks(enriched);
      }
    } catch (err) {
      console.error('Failed to load study plan:', err);
    } finally {
      setLoading(false);
    }
  }, [user, allProblems]);

  useEffect(() => {
    fetchActivePlan();
  }, [fetchActivePlan]);

  // Helper date utilities
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const daysRemaining = useMemo(() => {
    if (!activePlan?.target_date) return 0;
    const target = new Date(activePlan.target_date);
    const today = new Date(todayStr);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [activePlan, todayStr]);

  // Plan progress calculations
  const progressStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const skipped = tasks.filter((t) => t.status === 'skipped').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const overdue = tasks.filter((t) => t.status === 'pending' && t.scheduled_date < todayStr).length;
    const dueToday = tasks.filter((t) => t.scheduled_date === todayStr).length;
    const completedToday = tasks.filter(
      (t) => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(todayStr)
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, skipped, pending, overdue, dueToday, completedToday, percentage };
  }, [tasks, todayStr]);

  // Weekly Horizon Calendar window
  const weekDays = useMemo(() => {
    const curr = new Date();
    // Adjust to Monday of the current week + weekOffset
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    curr.setDate(curr.getDate() + distanceToMonday + currentWeekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(curr.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayFull = d.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isToday = dateStr === todayStr;
      const dayTasks = tasks.filter((t) => t.scheduled_date === dateStr);

      days.push({
        dateStr,
        dayName,
        dayFull,
        formattedDate,
        isToday,
        tasks: dayTasks,
      });
    }
    return days;
  }, [currentWeekOffset, tasks, todayStr]);

  // Handler: Toggle Task Completed
  const handleToggleTaskStatus = async (task: EnrichedTask) => {
    if (!user) return;
    const newStatus: PlanTaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t))
    );

    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('user_study_plan_tasks')
          .update({
            status: newStatus,
            completed_at: completedAt,
          })
          .eq('id', task.id);

        // Also if completed, sync to user_problem_progress and user_revision_queue
        if (newStatus === 'completed' && task.problem_id) {
          await supabase.from('user_problem_progress').upsert({
            user_id: user.id,
            problem_id: task.problem_id,
            status: 'solved',
            solved_at: new Date().toISOString(),
          });

          // Add to revision queue for 1-day spaced repetition
          await supabase.from('user_revision_queue').upsert(
            {
              user_id: user.id,
              problem_id: task.problem_id,
              interval_days: 1,
              next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              is_reviewed: false,
            },
            { onConflict: 'user_id,problem_id' }
          );
        }
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Handler: Skip Task
  const handleSkipTask = async (task: EnrichedTask) => {
    if (!user) return;
    const newStatus: PlanTaskStatus = 'skipped';

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('user_study_plan_tasks')
          .update({ status: newStatus })
          .eq('id', task.id);
      }
    } catch (err) {
      console.error('Failed to skip task:', err);
    }
  };

  // Handler: Rebalance Schedule (Shifts overdue pending tasks forward smoothly)
  const handleRebalanceSchedule = async () => {
    if (!user || !activePlan) return;
    const overdueTasks = tasks.filter((t) => t.status === 'pending' && t.scheduled_date < todayStr);

    if (overdueTasks.length === 0) {
      setActionMessage('Schedule is up-to-date! No overdue tasks to rebalance.');
      setTimeout(() => setActionMessage(null), 4000);
      return;
    }

    try {
      setGenerating(true);
      // Redistribute overdue tasks starting from today across the remaining days of the plan
      const targetDate = new Date(activePlan.target_date);
      const todayDate = new Date(todayStr);
      const remainingDaysCount = Math.max(
        1,
        Math.ceil((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Reassign overdue tasks smoothly
      const updates = overdueTasks.map((t, idx) => {
        const dayOffset = idx % remainingDaysCount;
        const newDate = new Date(todayDate);
        newDate.setDate(todayDate.getDate() + dayOffset);
        const newDateStr = newDate.toISOString().split('T')[0];
        return {
          id: t.id,
          scheduled_date: newDateStr,
        };
      });

      // Update in Supabase
      if (isSupabaseConfigured()) {
        for (const update of updates) {
          await supabase
            .from('user_study_plan_tasks')
            .update({ scheduled_date: update.scheduled_date })
            .eq('id', update.id);
        }
      }

      await fetchActivePlan();
      setActionMessage(
        `✨ Schedule rebalanced! ${overdueTasks.length} overdue ${
          overdueTasks.length === 1 ? 'task was' : 'tasks were'
        } redistributed forward without burnout.`
      );
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err) {
      console.error('Failed to rebalance schedule:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Handler: Generate Tailored Study Plan
  const handleGeneratePlan = async () => {
    if (!user) return;
    try {
      setGenerating(true);

      const goalConfig = GOAL_OPTIONS.find((g) => g.id === selectedGoal) || GOAL_OPTIONS[0];
      const problemsPerDay = Math.max(1, Math.round(dailyMinutes / 30));

      // Calculate target date
      const target = new Date();
      target.setDate(target.getDate() + timelineDays);
      const targetDateStr = target.toISOString().split('T')[0];

      // Filter and prioritize problems from catalog
      const pool = allProblems.length > 0 ? allProblems : FALLBACK_PROBLEMS;

      // Score problems based on selected topics & difficulty preference
      const scoredProblems = [...pool].sort((a, b) => {
        const aTopicMatch = (a.tags || []).some((t) => selectedTopics.includes(t)) ? 2 : 0;
        const bTopicMatch = (b.tags || []).some((t) => selectedTopics.includes(t)) ? 2 : 0;
        return bTopicMatch - aTopicMatch;
      });

      // Allocate tasks across days
      const totalDays = timelineDays;
      const scheduledTasksData: {
        problem_id: string;
        dateStr: string;
        orderIndex: number;
      }[] = [];

      let problemCursor = 0;
      for (let day = 0; day < totalDays; day++) {
        const scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + day);
        const dateStr = scheduleDate.toISOString().split('T')[0];

        for (let pIndex = 0; pIndex < problemsPerDay; pIndex++) {
          const selectedProblem = scoredProblems[problemCursor % scoredProblems.length];
          scheduledTasksData.push({
            problem_id: selectedProblem.id,
            dateStr,
            orderIndex: pIndex,
          });
          problemCursor++;
        }
      }

      if (isSupabaseConfigured()) {
        // 1. Deactivate existing active plans for this user
        await supabase
          .from('user_study_plans')
          .update({ is_active: false })
          .eq('user_id', user.id);

        // 2. Insert new active plan
        const { data: newPlan, error: planError } = await supabase
          .from('user_study_plans')
          .insert({
            user_id: user.id,
            title: `${goalConfig.title} Sprint Plan`,
            goal: selectedGoal,
            target_date: targetDateStr,
            daily_minutes: dailyMinutes,
            is_active: true,
          })
          .select()
          .single();

        if (planError || !newPlan) {
          throw new Error(planError?.message || 'Failed to create plan');
        }

        // 3. Batch insert tasks
        const taskRows = scheduledTasksData.map((t, idx) => ({
          plan_id: newPlan.id,
          user_id: user.id,
          problem_id: t.problem_id,
          scheduled_date: t.dateStr,
          status: 'pending' as PlanTaskStatus,
          order_index: idx,
        }));

        const { error: tasksError } = await supabase
          .from('user_study_plan_tasks')
          .insert(taskRows);

        if (tasksError) {
          console.error('Error inserting plan tasks:', tasksError);
        }
      }

      setIsConfiguring(false);
      setWizardStep(1);
      await fetchActivePlan();
      setActionMessage('🚀 Tailored study plan successfully created and scheduled!');
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      console.error('Study plan generation failed:', err);
      setActionMessage(`Error generating study plan: ${err.message || 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const activeGoalConfig = useMemo(() => {
    return GOAL_OPTIONS.find((g) => g.id === activePlan?.goal) || GOAL_OPTIONS[0];
  }, [activePlan]);

  // Filtered task view for horizon list
  const filteredTaskList = useMemo(() => {
    if (taskFilter === 'due_today') {
      return tasks.filter((t) => t.scheduled_date === todayStr);
    }
    if (taskFilter === 'pending') {
      return tasks.filter((t) => t.status === 'pending');
    }
    if (taskFilter === 'completed') {
      return tasks.filter((t) => t.status === 'completed');
    }
    return tasks;
  }, [tasks, taskFilter, todayStr]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Student Workspace', href: '/app/dashboard' },
        { label: 'Personalized Study Planner' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Banner Alert for Feedback */}
        {actionMessage && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 shrink-0 text-primary" />
              <p className="text-sm font-medium">{actionMessage}</p>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs text-text-muted hover:text-text-primary underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="p-12 text-center rounded-xl border border-white/[0.08] bg-surface flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-text-secondary">Loading your personalized study horizon...</p>
          </div>
        )}

        {/* ONBOARDING WIZARD (When no plan exists or user clicked Configure) */}
        {!loading && (!activePlan || isConfiguring) && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary border border-primary/20">
                    Adaptive Plan
                  </span>
                  <span className="text-xs text-text-muted">Adaptive Schedule Generator</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
                  Personalized Study Planner
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  Configure your target career milestones, daily bandwidth, and algorithmic focus to generate a balanced daily study horizon.
                </p>
              </div>

              {activePlan && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfiguring(false)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Return to Active Plan
                </Button>
              )}
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-3 gap-3">
              <div
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  wizardStep === 1
                    ? 'border-primary bg-primary/10 text-primary'
                    : wizardStep > 1
                    ? 'border-emerald-500/30 bg-surface text-emerald-400'
                    : 'border-white/[0.08] bg-surface/50 text-text-muted'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold">STEP 01</span>
                  {wizardStep > 1 && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-sm font-semibold mt-1">Target Career Goal</p>
              </div>

              <div
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  wizardStep === 2
                    ? 'border-primary bg-primary/10 text-primary'
                    : wizardStep > 2
                    ? 'border-emerald-500/30 bg-surface text-emerald-400'
                    : 'border-white/[0.08] bg-surface/50 text-text-muted'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold">STEP 02</span>
                  {wizardStep > 2 && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-sm font-semibold mt-1">Timeline & Bandwidth</p>
              </div>

              <div
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  wizardStep === 3
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/[0.08] bg-surface/50 text-text-muted'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold">STEP 03</span>
                </div>
                <p className="text-sm font-semibold mt-1">Priority Topics</p>
              </div>
            </div>

            {/* Wizard Steps Content */}
            <div className="p-6 md:p-8 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1">
              {/* STEP 1: Select Goal */}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Select Target Engineering Track</h2>
                    <p className="text-xs text-text-secondary mt-1">
                      Choose your primary benchmark. The engine tunes problem difficulty distributions and algorithmic weightings accordingly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {GOAL_OPTIONS.map((g) => {
                      const IconComponent = g.icon;
                      const isSelected = selectedGoal === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGoal(g.id)}
                          className={cn(
                            'p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 relative overflow-hidden',
                            isSelected
                              ? 'border-primary bg-primary/[0.07] ring-1 ring-primary/40'
                              : 'border-white/[0.08] bg-surface hover:border-white/20 hover:bg-surface-elevated'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className={cn('p-2.5 rounded-lg border', g.accentBg, g.accentBorder)}>
                              <IconComponent className={cn('w-5 h-5', g.accentText)} />
                            </div>
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary text-text-inverse font-bold'
                                  : 'border-white/20 text-transparent'
                              )}
                            >
                              ✓
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-text-primary mt-4">{g.title}</h3>
                          <p className="text-xs font-mono text-text-muted mt-0.5">{g.subtitle}</p>
                          <p className="text-xs text-text-secondary mt-2.5 leading-relaxed">{g.description}</p>

                          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
                            <span className="text-text-muted">Target Weight:</span>
                            <span className={cn('font-semibold', g.accentText)}>{g.difficultyFocus}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      variant="primary"
                      onClick={() => setWizardStep(2)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Bandwidth
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Timeline & Daily Bandwidth */}
              {wizardStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Commitment & Timeline</h2>
                    <p className="text-xs text-text-secondary mt-1">
                      Choose how much time you can realistically commit daily to avoid burnout.
                    </p>
                  </div>

                  {/* Daily Bandwidth */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-text-secondary block">
                      Daily Bandwidth Budget
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {BANDWIDTH_OPTIONS.map((b) => {
                        const isSelected = dailyMinutes === b.minutes;
                        return (
                          <div
                            key={b.minutes}
                            onClick={() => setDailyMinutes(b.minutes)}
                            className={cn(
                              'p-4 rounded-xl border text-left cursor-pointer transition-all',
                              isSelected
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                                : 'border-white/[0.08] bg-surface hover:border-white/20 hover:bg-surface-elevated'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base font-bold text-text-primary">{b.label}</span>
                              <Clock className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-text-muted')} />
                            </div>
                            <p className="text-xs text-text-secondary">{b.subtitle}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Horizon Duration */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-text-secondary block">
                      Target Horizon Duration
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { days: 30, title: '30 Days Sprint', sub: 'Intensive interview cramming' },
                        { days: 60, title: '60 Days Track (Recommended)', sub: 'Balanced algorithmic mastery' },
                        { days: 90, title: '90 Days Deep Dive', sub: 'Complete foundational fluency' },
                      ].map((t) => {
                        const isSelected = timelineDays === t.days;
                        return (
                          <div
                            key={t.days}
                            onClick={() => setTimelineDays(t.days)}
                            className={cn(
                              'p-4 rounded-xl border text-left cursor-pointer transition-all',
                              isSelected
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                                : 'border-white/[0.08] bg-surface hover:border-white/20 hover:bg-surface-elevated'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-text-primary">{t.title}</span>
                              <Calendar className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-text-muted')} />
                            </div>
                            <p className="text-xs text-text-secondary">{t.sub}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                    <Button
                      variant="outline"
                      onClick={() => setWizardStep(1)}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setWizardStep(3)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue to Topics
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Priority Topics */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">Priority Topics & Pattern Focus</h2>
                    <p className="text-xs text-text-secondary mt-1">
                      Select the foundational algorithmic topics you want prioritized in your roadmap.
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted font-mono">
                      Selected: {selectedTopics.length} / {TOPIC_OPTIONS.length} topics
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTopics([...TOPIC_OPTIONS])}
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-text-muted text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTopics([])}
                        className="text-xs text-text-muted hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {TOPIC_OPTIONS.map((topic) => {
                      const isSelected = selectedTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => {
                            setSelectedTopics((prev) =>
                              isSelected ? prev.filter((t) => t !== topic) : [...prev, topic]
                            );
                          }}
                          className={cn(
                            'p-3 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between',
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-white/[0.08] bg-surface text-text-secondary hover:text-text-primary hover:border-white/20'
                          )}
                        >
                          <span className="truncate">{topic}</span>
                          <span
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ml-2',
                              isSelected
                                ? 'border-primary bg-primary text-text-inverse font-bold'
                                : 'border-white/20 text-transparent'
                            )}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-xl border border-white/[0.08] bg-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-text-muted text-xs font-medium">Plan Summary</span>
                      <p className="font-semibold text-text-primary">
                        {GOAL_OPTIONS.find((g) => g.id === selectedGoal)?.title} Track • {dailyMinutes} mins/day •{' '}
                        {timelineDays} Days Timeline
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-text-muted text-xs font-medium">Estimated Allocation</span>
                      <p className="font-semibold text-emerald-400">
                        ~{Math.round(dailyMinutes / 30) * timelineDays} Problems Total
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                    <Button
                      variant="outline"
                      onClick={() => setWizardStep(2)}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleGeneratePlan}
                      disabled={generating}
                      leftIcon={generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    >
                      {generating ? 'Synthesizing Roadmap...' : 'Generate My Tailored Study Plan'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE STUDY PLAN COCKPIT */}
        {!loading && activePlan && !isConfiguring && (
          <div className="space-y-6">
            {/* Header Bar */}
            <div className="p-6 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded text-xs font-semibold border',
                        activeGoalConfig.accentBg,
                        activeGoalConfig.accentBorder,
                        activeGoalConfig.accentText
                      )}
                    >
                      {activeGoalConfig.title} Track
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-surface-elevated border border-white/[0.08] text-text-muted">
                      {activePlan.daily_minutes} min daily budget
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {daysRemaining} Days Remaining
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                    {activePlan.title}
                  </h1>
                  <p className="text-xs text-text-secondary">
                    Target Completion Date:{' '}
                    <span className="font-mono text-text-primary font-semibold">
                      {new Date(activePlan.target_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                </div>

                {/* Cockpit Actions */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRebalanceSchedule}
                    disabled={generating}
                    leftIcon={generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                    title="Recalculates and smoothly shifts overdue uncompleted tasks forward"
                  >
                    Rebalance Schedule
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsConfiguring(true);
                      setWizardStep(1);
                    }}
                    leftIcon={<SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />}
                  >
                    Configure New Plan
                  </Button>
                </div>
              </div>

              {/* Progress Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/[0.06]">
                <div className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06]">
                  <span className="text-xs font-medium text-text-muted block">Completion Rate</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-emerald-400">{progressStats.percentage}%</span>
                    <span className="text-xs text-text-muted font-mono">
                      ({progressStats.completed}/{progressStats.total})
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06]">
                  <span className="text-xs font-medium text-text-muted block">Due Today</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-text-primary">{progressStats.dueToday}</span>
                    <span className="text-xs text-text-muted font-mono">scheduled</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06]">
                  <span className="text-xs font-medium text-text-muted block">Overdue Tasks</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        'text-xl font-bold font-mono',
                        progressStats.overdue > 0 ? 'text-amber-400' : 'text-text-muted'
                      )}
                    >
                      {progressStats.overdue}
                    </span>
                    <span className="text-xs text-text-muted font-mono">need rebalance</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06]">
                  <span className="text-xs font-medium text-text-muted block">Pending Total</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-blue-400">{progressStats.pending}</span>
                    <span className="text-xs text-text-muted font-mono">remaining</span>
                  </div>
                </div>
              </div>

              {/* Linear Progress Indicator */}
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-white/[0.05]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressStats.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-text-muted">
                  <span>{progressStats.completed} completed</span>
                  <span>{progressStats.pending} pending remaining</span>
                </div>
              </div>
            </div>

            {/* WEEKLY HORIZON CALENDAR (Mon - Sun Deck) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-text-primary">Weekly Horizon Schedule</h2>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeekOffset((p) => p - 1)}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Prev Week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentWeekOffset(0)}
                    disabled={currentWeekOffset === 0}
                  >
                    Current Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeekOffset((p) => p + 1)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next Week
                  </Button>
                </div>
              </div>

              {/* 7-Day Horizon Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const completedDayTasks = day.tasks.filter((t) => t.status === 'completed').length;
                  const allDone = day.tasks.length > 0 && completedDayTasks === day.tasks.length;

                  return (
                    <div
                      key={day.dateStr}
                      className={cn(
                        'rounded-xl border p-4 flex flex-col justify-between transition-all min-h-[220px]',
                        day.isToday
                          ? 'border-primary/60 bg-primary/[0.04] ring-1 ring-primary/40 shadow-elevation-1'
                          : 'border-white/[0.08] bg-surface hover:border-white/20'
                      )}
                    >
                      {/* Day Header */}
                      <div className="border-b border-white/[0.06] pb-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-text-muted">
                            {day.dayName}
                          </span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary text-text-inverse">
                              Today
                            </span>
                          )}
                          {allDone && (
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Done
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-text-primary mt-0.5">{day.formattedDate}</p>
                      </div>

                      {/* Day Tasks List */}
                      <div className="space-y-2 flex-1">
                        {day.tasks.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-3">
                            <span className="text-[11px] text-text-muted italic">Buffer / Rest Day</span>
                            <span className="text-[10px] text-text-muted mt-1">Review notes</span>
                          </div>
                        ) : (
                          day.tasks.map((task) => {
                            const isDone = task.status === 'completed';
                            const isSkipped = task.status === 'skipped';
                            const prob = task.problemDetails;
                            const slug = prob?.slug || 'two-sum';
                            const title = prob?.title || 'Algorithmic Problem';
                            const difficulty = prob?.difficulty || 'medium';

                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  'p-2.5 rounded-lg border text-left transition-all space-y-2',
                                  isDone
                                    ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                                    : isSkipped
                                    ? 'border-white/[0.05] bg-surface-subtle opacity-60'
                                    : 'border-white/[0.08] bg-surface-elevated hover:border-white/20'
                                )}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <Link
                                    to={`/problems/${slug}`}
                                    className="text-xs font-semibold text-text-primary hover:text-primary transition-colors line-clamp-2"
                                    title={title}
                                  >
                                    {title}
                                  </Link>
                                </div>

                                <div className="flex items-center justify-between text-[11px] pt-1">
                                  <DifficultyBadge difficulty={difficulty} showPip={false} className="text-[10px] px-1.5 py-0.2" />

                                  <div className="flex items-center gap-1">
                                    {/* Status Checkbox */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTaskStatus(task)}
                                      className={cn(
                                        'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                                        isDone
                                          ? 'border-emerald-500 bg-emerald-500 text-text-inverse'
                                          : 'border-white/20 hover:border-emerald-400 text-transparent'
                                      )}
                                      title={isDone ? 'Mark as pending' : 'Mark as completed'}
                                    >
                                      ✓
                                    </button>

                                    {/* Direct Solve Link */}
                                    <Link
                                      to={`/problems/${slug}`}
                                      className="p-1 rounded hover:bg-white/[0.08] text-text-muted hover:text-text-primary"
                                      title="Solve in IDE"
                                    >
                                      <Code2 className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Day Footer Count */}
                      <div className="pt-2 border-t border-white/[0.04] mt-2 flex items-center justify-between text-[10px] font-mono text-text-muted">
                        <span>{day.tasks.length} {day.tasks.length === 1 ? 'Task' : 'Tasks'}</span>
                        {day.tasks.length > 0 && (
                          <span>{completedDayTasks}/{day.tasks.length} solved</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABBED TASKS HORIZON LIST */}
            <div className="p-6 rounded-xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-text-primary">Curriculum Task Queue</h3>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-surface-elevated p-1 rounded-lg border border-white/[0.06] text-xs">
                  {(
                    [
                      { id: 'all', label: 'All Tasks' },
                      { id: 'due_today', label: `Due Today (${progressStats.dueToday})` },
                      { id: 'pending', label: `Pending (${progressStats.pending})` },
                      { id: 'completed', label: `Completed (${progressStats.completed})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTaskFilter(f.id)}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                        taskFilter === f.id
                          ? 'bg-primary text-text-inverse font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task Rows */}
              <div className="divide-y divide-white/[0.04]">
                {filteredTaskList.slice(0, 15).map((task) => {
                  const isDone = task.status === 'completed';
                  const prob = task.problemDetails;
                  const slug = prob?.slug || 'two-sum';
                  const title = prob?.title || 'Algorithmic Problem';
                  const difficulty = prob?.difficulty || 'medium';
                  const isOverdue = task.status === 'pending' && task.scheduled_date < todayStr;
                  const isDueToday = task.scheduled_date === todayStr;

                  return (
                    <div
                      key={task.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0',
                            isDone
                              ? 'border-emerald-500 bg-emerald-500 text-text-inverse font-bold'
                              : 'border-white/20 hover:border-emerald-400 text-transparent'
                          )}
                        >
                          ✓
                        </button>

                        <div className="min-w-0">
                          <Link
                            to={`/problems/${slug}`}
                            className={cn(
                              'text-sm font-semibold hover:text-primary transition-colors block truncate',
                              isDone ? 'line-through text-text-muted' : 'text-text-primary'
                            )}
                          >
                            {title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                            <DifficultyBadge difficulty={difficulty} showPip={false} className="text-[10px] px-1 py-0.2" />
                            <span>•</span>
                            <span className="font-mono text-[11px]">
                              Scheduled: {task.scheduled_date}
                            </span>
                            {isDueToday && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-semibold">
                                Due Today
                              </span>
                            )}
                            {isOverdue && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-semibold">
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {task.status !== 'completed' && task.status !== 'skipped' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSkipTask(task)}
                            className="text-xs text-text-muted hover:text-text-primary"
                          >
                            Skip
                          </Button>
                        )}
                        <Link to={`/problems/${slug}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Code2 className="w-3.5 h-3.5" />}
                          >
                            Solve in IDE
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {filteredTaskList.length === 0 && (
                  <div className="py-8 text-center text-text-muted text-xs">
                    No tasks match the selected filter.
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
export default StudyPlanView;
