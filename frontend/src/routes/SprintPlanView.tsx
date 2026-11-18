import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Button } from '@/components/ui/actions/Button';
import { SprintCard } from '@/components/planner/SprintCard';
import { RebalanceModal } from '@/components/planner/RebalanceModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import type { StudySprint, SprintTask } from '@/types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Code2,
  RotateCcw,
  Sparkles,
  BookOpen,
  Repeat,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Brain,
  Check,
  CalendarCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const SprintPlanView: React.FC = () => {
  const { user } = useAuth();

  const [activeSprint, setActiveSprint] = useState<StudySprint | null>(null);
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState<boolean>(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch active sprint and sprint tasks from Supabase
  const fetchSprintData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Query active sprint
      const { data: sprintData, error: sErr } = await supabase
        .from('study_sprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sErr) throw sErr;

      if (!sprintData) {
        setActiveSprint(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      setActiveSprint(sprintData as StudySprint);

      // Query sprint tasks
      const { data: taskRows, error: tErr } = await supabase
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
        .eq('sprint_id', sprintData.id)
        .order('scheduled_date', { ascending: true })
        .order('order_index', { ascending: true });

      if (tErr) throw tErr;

      if (taskRows) {
        const enriched: SprintTask[] = taskRows.map((t: any) => {
          const matchedFallback = FALLBACK_PROBLEMS.find((p) => p.id === t.problem_id);
          const prob = t.problems || matchedFallback;
          return {
            ...t,
            problem: prob,
          };
        });
        setTasks(enriched);
      }
    } catch (err) {
      console.error('Failed to load study sprint:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSprintData();
  }, [fetchSprintData]);

  // Overdue tasks calculation
  const overdueTasks = useMemo(() => {
    return tasks.filter((t) => !t.is_completed && t.scheduled_date < todayStr);
  }, [tasks, todayStr]);

  const missedDaysCount = useMemo(() => {
    const dates = new Set<string>();
    overdueTasks.forEach((t) => dates.add(t.scheduled_date));
    return dates.size;
  }, [overdueTasks]);

  // 7-day Weekly Horizon Window (Monday - Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date();
    const dayOfWeek = curr.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    curr.setDate(curr.getDate() + distanceToMonday + currentWeekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(curr.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isToday = dateStr === todayStr;
      const dayTasks = tasks.filter((t) => t.scheduled_date === dateStr);

      days.push({
        dateStr,
        dayName,
        formattedDate,
        isToday,
        tasks: dayTasks,
      });
    }
    return days;
  }, [currentWeekOffset, tasks, todayStr]);

  // Task Completion Toggle
  const handleToggleTask = async (task: SprintTask) => {
    if (!user) return;
    const newCompleted = !task.is_completed;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    // Optimistic UI update
    setTasks((prev) =>
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

        // If completed and tied to a problem, sync with problem progress and revision queue
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
      console.error('Failed to update task:', err);
    }
  };

  const getTaskTypeBadge = (type: SprintTask['task_type']) => {
    switch (type) {
      case 'learn_concept':
        return { label: 'Learn', icon: BookOpen, className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'practice_problem':
        return { label: 'Practice', icon: Code2, className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'spaced_revision':
        return { label: 'Revision', icon: Repeat, className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'mistake_retrial':
        return { label: 'Retrial', icon: RotateCcw, className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'sprint_assessment':
        return { label: 'Assessment', icon: Award, className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      default:
        return { label: 'Task', icon: Clock, className: 'bg-surface-elevated text-text-muted border-white/[0.06]' };
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Student Workspace', href: '/app/dashboard' },
        { label: 'Adaptive Sprint Planner' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Banner Alert for Feedback */}
        {feedbackMsg && (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 shrink-0 text-primary" />
              <p className="text-sm font-medium">{feedbackMsg}</p>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-xs text-text-muted hover:text-text-primary underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NON-PUNITIVE MISSED DAYS REBALANCE BANNER */}
        {overdueTasks.length > 0 && (
          <div className="p-4 md:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-text-primary">
                  You missed {missedDaysCount} study {missedDaysCount === 1 ? 'day' : 'days'}. Keep your momentum without burnout.
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {overdueTasks.length} uncompleted tasks are waiting. The non-punitive rebalancer can smoothly reschedule them across upcoming days.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRebalanceModalOpen(true)}
              leftIcon={<RotateCcw className="w-4 h-4 text-amber-400" />}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shrink-0 self-start sm:self-auto"
            >
              Rebalance Plan
            </Button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="p-16 text-center rounded-2xl border border-white/[0.08] bg-surface flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm text-text-secondary">Synthesizing adaptive sprint horizon...</p>
          </div>
        )}

        {/* EMPTY STATE: NO ACTIVE SPRINT */}
        {!loading && !activeSprint && (
          <div className="p-12 md:p-16 rounded-2xl border border-white/[0.08] bg-surface text-center space-y-6 shadow-elevation-1">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                No Active Study Sprint
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Take the High-Signal Algorithmic Diagnostic Assessment to evaluate your mental models and synthesize your personalized weekly sprint.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app/diagnostic">
                <Button
                  variant="primary"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="bg-primary hover:bg-primary-hover text-white"
                >
                  Start Diagnostic Assessment →
                </Button>
              </Link>

              <Link to="/app/study-plan">
                <Button variant="outline" leftIcon={<Calendar className="w-4 h-4" />}>
                  Long-Term Career Planner
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ACTIVE SPRINT VIEW */}
        {!loading && activeSprint && (
          <div className="space-y-6">
            {/* SPRINT CARD HEADER */}
            <SprintCard
              sprint={activeSprint}
              tasks={tasks}
              onRebalanceClick={() => setIsRebalanceModalOpen(true)}
              hasOverdueTasks={overdueTasks.length > 0}
            />

            {/* WEEKLY HORIZON SCHEDULE (Mon - Sun Deck) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-bold text-text-primary">Daily Horizon Schedule</h3>
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

              {/* 7-Day Sequence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const dayTasksDone = day.tasks.filter((t) => t.is_completed).length;
                  const allDone = day.tasks.length > 0 && dayTasksDone === day.tasks.length;

                  return (
                    <div
                      key={day.dateStr}
                      className={cn(
                        'rounded-xl border p-4 flex flex-col justify-between transition-all min-h-[260px]',
                        day.isToday
                          ? 'border-blue-500 bg-blue-500/[0.07] ring-1 ring-blue-500/40 shadow-elevation-2'
                          : 'border-white/[0.08] bg-surface hover:border-white/20'
                      )}
                    >
                      {/* Day Card Header */}
                      <div className="border-b border-white/[0.06] pb-2 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-text-muted">
                            {day.dayName}
                          </span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary text-white">
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
                          <div className="h-full flex flex-col items-center justify-center text-center p-3 text-text-muted">
                            <span className="text-[11px] italic">Rest / Buffer</span>
                            <span className="text-[10px] mt-1">Review notes</span>
                          </div>
                        ) : (
                          day.tasks.map((task) => {
                            const isDone = task.is_completed;
                            const typeMeta = getTaskTypeBadge(task.task_type);
                            const slug = task.problem?.slug;

                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  'p-2.5 rounded-lg border text-left transition-all space-y-2',
                                  isDone
                                    ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                                    : 'border-white/[0.08] bg-surface-elevated hover:border-white/20'
                                )}
                              >
                                <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.2 rounded border font-semibold',
                                      typeMeta.className
                                    )}
                                  >
                                    {typeMeta.label} ({task.estimated_minutes}m)
                                  </span>

                                  {task.problem && (
                                    <DifficultyBadge
                                      difficulty={task.problem.difficulty}
                                      showPip={false}
                                      className="text-[9px] px-1 py-0.2"
                                    />
                                  )}
                                </div>

                                <p
                                  className={cn(
                                    'text-xs font-semibold leading-snug line-clamp-2',
                                    isDone ? 'line-through text-text-muted' : 'text-text-primary'
                                  )}
                                >
                                  {task.title}
                                </p>

                                <div className="flex items-center justify-between pt-1">
                                  {/* Checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTask(task)}
                                    className={cn(
                                      'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                                      isDone
                                        ? 'border-emerald-500 bg-emerald-500 text-white font-bold'
                                        : 'border-white/20 hover:border-emerald-400 text-transparent'
                                    )}
                                  >
                                    ✓
                                  </button>

                                  {/* Solve link if problem attached */}
                                  {slug && (
                                    <Link
                                      to={`/problems/${slug}`}
                                      className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                                    >
                                      <span>Solve</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Day Footer Count */}
                      <div className="pt-2 border-t border-white/[0.04] mt-2 flex items-center justify-between text-[10px] font-mono text-text-muted">
                        <span>{day.tasks.length} Tasks</span>
                        {day.tasks.length > 0 && (
                          <span>{dayTasksDone}/{day.tasks.length} done</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CURRICULUM TASK BREAKDOWN */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-surface shadow-elevation-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-text-primary">Sprint Action Queue</h3>
                </div>
                <span className="text-xs font-mono text-text-muted">
                  {tasks.filter((t) => t.is_completed).length} / {tasks.length} Completed
                </span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {tasks.map((task) => {
                  const typeMeta = getTaskTypeBadge(task.task_type);
                  const isDone = task.is_completed;
                  const slug = task.problem?.slug;

                  return (
                    <div
                      key={task.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className={cn(
                            'w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0',
                            isDone
                              ? 'border-emerald-500 bg-emerald-500 text-white font-bold'
                              : 'border-white/20 hover:border-emerald-400 text-transparent'
                          )}
                        >
                          ✓
                        </button>

                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-sm font-semibold truncate',
                              isDone ? 'line-through text-text-muted' : 'text-text-primary'
                            )}
                          >
                            {task.title}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted font-mono">
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded border text-[10px] font-semibold',
                                typeMeta.className
                              )}
                            >
                              {typeMeta.label}
                            </span>
                            <span>•</span>
                            <span>{task.estimated_minutes} mins</span>
                            <span>•</span>
                            <span>Scheduled: {task.scheduled_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {slug && (
                          <Link to={`/problems/${slug}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Code2 className="w-3.5 h-3.5 text-primary" />}
                            >
                              Solve in IDE
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* REBALANCE MODAL */}
        {activeSprint && (
          <RebalanceModal
            isOpen={isRebalanceModalOpen}
            onClose={() => setIsRebalanceModalOpen(false)}
            sprint={activeSprint}
            tasks={tasks}
            onRebalanced={async () => {
              await fetchSprintData();
              setFeedbackMsg('✨ Schedule adaptively rebalanced! Core tasks preserved without burnout.');
              setTimeout(() => setFeedbackMsg(null), 5000);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};
export default SprintPlanView;
