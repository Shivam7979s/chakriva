import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Coffee,
  Sparkles,
  CheckCircle2,
  Circle,
  GitBranch,
  Timer,
} from 'lucide-react';
import type { AdaptiveRoadmap } from '../types/adaptive';
import { Button } from '@/components/ui/actions/Button';
import { cn } from '@/lib/utils';

export interface RoadmapLandingViewProps {
  activeRoadmap: AdaptiveRoadmap | null;
  savedRoadmaps?: AdaptiveRoadmap[];
  onCreateRoadmap: () => void;
  onAdjustPlan: () => void;
  onViewRoadmap: (roadmapId?: string) => void;
  onToggleRoadmapStatus?: (roadmapId: string, nextStatus: 'active' | 'paused') => void;
  onDeleteRoadmap?: (roadmapId: string) => void;
}

const PREVIEW_STEPS = [
  { id: 'about', label: 'About you', caption: 'Your answers become a clear direction.' },
  {
    id: 'goals',
    label: 'Understanding your goals',
    caption: 'Prerequisite order mapped around your skill gaps.',
  },
  {
    id: 'sprints',
    label: 'Personalised weekly sprints',
    caption: 'Focused weekly sprints matched to your schedule.',
  },
  {
    id: 'solve',
    label: 'Solve & Practice',
    caption: 'Daily time-boxed tasks linked directly to the judge.',
  },
  {
    id: 'time',
    label: 'Track your time',
    caption: 'Less guessing. More honest time spent learning.',
  },
  {
    id: 'progress',
    label: 'Progress tracker',
    caption: 'Every task becomes visible momentum.',
  },
  {
    id: 'missed',
    label: 'Missed a Day/Task?',
    caption: 'Adjust forward or pause anytime without losing progress.',
  },
] as const;

function computePlanMetrics(plan: AdaptiveRoadmap) {
  let totalTasks = 0;
  let completedTasks = 0;
  let totalMinutes = 0;
  let completedMinutes = 0;
  let completedSprints = 0;

  for (const w of plan.weeks) {
    let weekTotal = 0;
    let weekDone = 0;
    for (const d of w.days) {
      for (const t of d.tasks) {
        totalTasks++;
        weekTotal++;
        totalMinutes += t.estimatedMinutes || 0;
        if (t.status === 'completed') {
          completedTasks++;
          weekDone++;
          completedMinutes += t.estimatedMinutes || 0;
        }
      }
    }
    if (weekTotal > 0 && weekDone === weekTotal) {
      completedSprints++;
    }
  }

  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalHours = Math.round(totalMinutes / 60);
  const completedHours = Math.round((completedMinutes / 60) * 10) / 10;

  const todayIso = new Date().toISOString().split('T')[0];
  let currentWeek = plan.weeks[0] || null;
  let todayDay = currentWeek?.days.find((d) => !d.isRestDay) || currentWeek?.days[0] || null;

  for (const w of plan.weeks) {
    const found = w.days.find((d) => d.date === todayIso);
    if (found) {
      currentWeek = w;
      todayDay = found;
      break;
    }
  }

  const lastWeek = plan.weeks[plan.weeks.length - 1];
  const lastDay = lastWeek?.days[lastWeek.days.length - 1];
  const estCompletion = lastDay?.date || '';

  return {
    totalTasks,
    completedTasks,
    totalMinutes,
    completedMinutes,
    totalHours,
    completedHours,
    completedSprints,
    totalSprints: plan.weeks.length,
    pct,
    currentWeek,
    todayDay,
    estCompletion,
  };
}

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const RoadmapLandingView: React.FC<RoadmapLandingViewProps> = ({
  activeRoadmap,
  savedRoadmaps = [],
  onCreateRoadmap,
  onViewRoadmap,
  onToggleRoadmapStatus,
  onDeleteRoadmap,
}) => {
  const [activePreviewIdx, setActivePreviewIdx] = useState<number>(0);
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [showOverviewShowcase, setShowOverviewShowcase] = useState<boolean>(false);
  const [planFilter, setPlanFilter] = useState<'active' | 'completed'>('active');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sprintIdxByPlan, setSprintIdxByPlan] = useState<Record<string, number>>({});

  const roadmapsList =
    savedRoadmaps.length > 0 ? savedRoadmaps : activeRoadmap ? [activeRoadmap] : [];

  useEffect(() => {
    if (!autoCycle) return;
    if (roadmapsList.length > 0 && !showOverviewShowcase) return;
    const timer = window.setInterval(() => {
      setActivePreviewIdx((prev) => (prev + 1) % PREVIEW_STEPS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoCycle, roadmapsList.length, showOverviewShowcase]);

  const filteredPlans = roadmapsList.filter((plan) => {
    const { pct } = computePlanMetrics(plan);
    const isCompletedPlan = plan.status === 'completed' || pct === 100;
    return planFilter === 'completed' ? isCompletedPlan : !isCompletedPlan;
  });

  const activeStep = PREVIEW_STEPS[activePreviewIdx];

  // ---------------------------------------------------------------------------
  // CASE 1: USER HAS EXISTING ROADMAPS (unless viewing showcase)
  // ---------------------------------------------------------------------------
  if (roadmapsList.length > 0 && !showOverviewShowcase) {
    return (
      <div className="max-w-6xl mx-auto py-3 sm:py-5 space-y-6 text-left text-[#EEF2FF]">
        {/* Top Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-xl border border-[#192033] bg-[#0F131D]">
            {(['active', 'completed'] as const).map((tab) => {
              const selected = planFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPlanFilter(tab)}
                  className={cn(
                    'relative px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer',
                    selected ? 'text-[#EEF2FF]' : 'text-[#7C869E] hover:text-[#CBD5E1]'
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="landingPlanFilterPill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-[#1A2236] border border-[#28334E]"
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowOverviewShowcase(true)}
              className="text-xs text-[#7C869E] hover:text-[#E2E8F0] px-3 py-1.5 rounded-lg hover:bg-[#131826] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={onCreateRoadmap}
              className="border-[#1F273B] bg-[#111623] hover:bg-[#161D2E] hover:border-[#3B82F6]/45 text-[#E2E8F0]"
            >
              Generate another plan
            </Button>
          </div>
        </div>

        {/* Plans List */}
        {filteredPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#181E2E] bg-[#0E121B] p-10 text-center space-y-3"
          >
            <p className="text-sm text-[#94A3B8]">
              {planFilter === 'completed'
                ? 'No completed roadmaps yet.'
                : 'No active roadmaps found.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={onCreateRoadmap}
            >
              Create my plan
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {filteredPlans.map((plan, pIdx) => {
              const metrics = computePlanMetrics(plan);
              const isPaused = plan.status === 'paused';
              const shownSprintOffset =
                sprintIdxByPlan[plan.id] ??
                (metrics.currentWeek ? metrics.currentWeek.weekNumber - 1 : 0);
              const shownWeek =
                plan.weeks[
                  Math.max(0, Math.min(plan.weeks.length - 1, shownSprintOffset))
                ] || plan.weeks[0];
              const todayTasks = metrics.todayDay?.tasks || [];
              const todayCompleted = todayTasks.filter((t) => t.status === 'completed').length;
              const todayMinutesDone = todayTasks
                .filter((t) => t.status === 'completed')
                .reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
              const todayPct =
                todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
              const nextTask = todayTasks.find((t) => t.status !== 'completed') || todayTasks[0];
              const nextTaskHref =
                nextTask?.problemSlug
                  ? `/app/practice/${nextTask.problemSlug}?fromRoadmap=adaptive`
                  : null;

              const radius = 34;
              const circumference = 2 * Math.PI * radius;
              const strokeOffset = circumference - (metrics.pct / 100) * circumference;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: pIdx * 0.05 }}
                  className={cn(
                    'rounded-2xl border bg-gradient-to-b from-[#111623] to-[#0D1018] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)] overflow-visible transition-colors',
                    isPaused ? 'border-[#F59E0B]/30' : 'border-[#192033]'
                  )}
                >
                  {/* Card Header */}
                  <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-[#171D2D]">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base sm:text-lg font-semibold text-[#F1F5F9] truncate">
                          {plan.title || `${plan.profile.targetRole} Roadmap`}
                        </h2>
                        {isPaused && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B]">
                        Started on:{' '}
                        <span className="text-[#94A3B8]">
                          {formatShortDate(plan.startDate || plan.createdAt?.split('T')[0])}
                        </span>{' '}
                        · Currently on:{' '}
                        <span className="text-[#60A5FA]">
                          Sprint {metrics.currentWeek?.weekNumber || 1}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 relative">
                      <button
                        type="button"
                        onClick={() => onViewRoadmap(plan.id)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#1E2638] bg-[#141A29] hover:bg-[#192134] hover:border-[#3B82F6]/45 text-xs font-medium text-[#E2E8F0] transition-all cursor-pointer"
                      >
                        View your plan
                      </button>

                      <button
                        type="button"
                        aria-label="Plan actions"
                        onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                        className="p-1.5 rounded-lg text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#161D2E] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {openMenuId === plan.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -4 }}
                            transition={{ duration: 0.14 }}
                            className="absolute right-0 top-10 w-44 rounded-xl border border-[#1F273B] bg-[#141927] shadow-2xl z-20 py-1.5"
                          >
                            {onToggleRoadmapStatus && (
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleRoadmapStatus(plan.id, isPaused ? 'active' : 'paused');
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-left text-[#CBD5E1] hover:text-white hover:bg-[#1B2234] flex items-center gap-2 cursor-pointer"
                              >
                                {isPaused ? (
                                  <>
                                    <Play className="w-3.5 h-3.5 text-[#00B8A3]" />
                                    <span>Resume plan</span>
                                  </>
                                ) : (
                                  <>
                                    <Pause className="w-3.5 h-3.5 text-[#FBBF24]" />
                                    <span>Pause / Take a break</span>
                                  </>
                                )}
                              </button>
                            )}
                            {onDeleteRoadmap && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirmDeleteId === plan.id) {
                                    onDeleteRoadmap(plan.id);
                                    setConfirmDeleteId(null);
                                    setOpenMenuId(null);
                                  } else {
                                    setConfirmDeleteId(plan.id);
                                  }
                                }}
                                className="w-full px-3 py-2 text-xs text-left text-[#FF375F] hover:bg-[#FF375F]/10 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>
                                  {confirmDeleteId === plan.id ? 'Confirm delete?' : 'Delete plan'}
                                </span>
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Top 2-Column Bento Row: Overall Progress + 7-Day Sprint Progress */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#171D2D] border-b border-[#171D2D]">
                    {/* OVERALL PROGRESS */}
                    <div className="p-5 sm:px-6 space-y-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
                        Overall progress
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              fill="none"
                              stroke="#182032"
                              strokeWidth="6"
                            />
                            <motion.circle
                              cx="40"
                              cy="40"
                              r={radius}
                              fill="none"
                              stroke="url(#landingRingGrad)"
                              strokeWidth="6"
                              strokeDasharray={circumference}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset: strokeOffset }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              strokeLinecap="round"
                            />
                            <defs>
                              <linearGradient id="landingRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#00B8A3" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-base font-semibold tabular-nums text-[#F1F5F9]">
                              {metrics.pct}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[#94A3B8]">
                            <span>Sprints</span>
                            <span className="font-mono text-[#E2E8F0] tabular-nums">
                              {metrics.completedSprints} / {metrics.totalSprints}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#94A3B8]">
                            <span>Topics &amp; Tasks</span>
                            <span className="font-mono text-[#E2E8F0] tabular-nums">
                              {metrics.completedTasks} / {metrics.totalTasks}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[#94A3B8]">
                            <span>Time</span>
                            <span className="font-mono text-[#E2E8F0] tabular-nums">
                              {metrics.completedHours}h / {metrics.totalHours}h
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SPRINT PROGRESS */}
                    <div className="p-5 sm:px-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
                          Sprint progress
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                          <button
                            type="button"
                            onClick={() =>
                              setSprintIdxByPlan((prev) => ({
                                ...prev,
                                [plan.id]: Math.max(0, (shownWeek?.weekNumber || 1) - 2),
                              }))
                            }
                            disabled={(shownWeek?.weekNumber || 1) <= 1}
                            className="p-1 rounded-md hover:bg-[#182032] disabled:opacity-30 cursor-pointer"
                            aria-label="Previous sprint"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-medium text-[#E2E8F0] tabular-nums">
                            Sprint {shownWeek?.weekNumber || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSprintIdxByPlan((prev) => ({
                                ...prev,
                                [plan.id]: Math.min(
                                  plan.weeks.length - 1,
                                  shownWeek?.weekNumber || 1
                                ),
                              }))
                            }
                            disabled={(shownWeek?.weekNumber || 1) >= plan.weeks.length}
                            className="p-1 rounded-md hover:bg-[#182032] disabled:opacity-30 cursor-pointer"
                            aria-label="Next sprint"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-2 pt-1">
                        {(shownWeek?.days || []).slice(0, 7).map((d, idx) => {
                          const done =
                            !d.isRestDay &&
                            d.tasks.length > 0 &&
                            d.tasks.every((t) => t.status === 'completed');
                          const isToday = d.date === metrics.todayDay?.date;
                          return (
                            <button
                              key={d.dayOfWeek + idx}
                              type="button"
                              onClick={() => onViewRoadmap(plan.id)}
                              className="flex flex-col items-center gap-1.5 group cursor-pointer"
                            >
                              <span
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-all',
                                  done
                                    ? 'bg-[#00B8A3]/20 border-[#00B8A3]/60 text-[#00B8A3]'
                                    : isToday
                                    ? 'border-[#3B82F6] text-[#60A5FA] bg-[#162647] shadow-[0_0_16px_-2px_rgba(59,130,246,0.55)]'
                                    : d.isRestDay
                                    ? 'border-[#151A26] bg-[#0B0E16] text-[#475569]'
                                    : 'border-[#1C2334] bg-[#131826] text-[#94A3B8] group-hover:border-[#3B82F6]/50 group-hover:text-white'
                                )}
                              >
                                {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                              </span>
                              <span className="text-[11px] text-[#64748B]">
                                {d.isRestDay ? 'Off' : `Day ${idx + 1}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bottom 2-Column Bento Row: Today's Task + Today's Progress */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#171D2D]">
                    {/* TODAY'S TASK */}
                    <div className="p-5 sm:px-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
                          Today&apos;s task
                        </span>
                        <span className="text-xs font-mono text-[#7C869E] tabular-nums">
                          <span className="text-[#00B8A3]">{todayCompleted}</span> /{' '}
                          {todayTasks.length} topics
                        </span>
                      </div>

                      {metrics.todayDay?.isRestDay ? (
                        <div className="py-4 flex items-center gap-2.5 text-xs text-[#94A3B8]">
                          <Coffee className="w-4 h-4 text-[#3B82F6]" />
                          <span>Scheduled rest day — recovery day.</span>
                        </div>
                      ) : todayTasks.length === 0 ? (
                        <p className="py-4 text-xs text-[#64748B]">
                          No tasks scheduled for today.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {todayTasks.slice(0, 3).map((t) => {
                            const isDone = t.status === 'completed';
                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg bg-[#0D111B]/70 border border-[#161C2C] text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#00B8A3] shrink-0" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-[#475569] shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      'truncate',
                                      isDone ? 'line-through text-[#64748B]' : 'text-[#E2E8F0]'
                                    )}
                                  >
                                    {t.title}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-[#64748B] shrink-0 tabular-nums">
                                  Est. {t.estimatedMinutes}m
                                </span>
                              </div>
                            );
                          })}
                          {todayTasks.length > 3 && (
                            <button
                              type="button"
                              onClick={() => onViewRoadmap(plan.id)}
                              className="text-xs text-[#60A5FA] hover:underline pt-1 cursor-pointer"
                            >
                              View all ({todayTasks.length})
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* TODAY'S PROGRESS */}
                    <div className="p-5 sm:px-6 space-y-3 bg-[#0C101A]/40">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
                        Today&apos;s progress
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[#94A3B8]">
                          <span>Tasks</span>
                          <span className="font-mono text-[#E2E8F0] tabular-nums">
                            {todayCompleted} / {todayTasks.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#94A3B8]">
                          <span>Time completed</span>
                          <span className="font-mono text-[#E2E8F0] tabular-nums">
                            {todayMinutesDone} min
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#94A3B8]">
                          <span>Scheduled</span>
                          <span className="font-mono text-[#E2E8F0] tabular-nums">
                            {metrics.todayDay?.availableHours || 0}h
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#94A3B8]">
                          <span>Progress</span>
                          <span className="font-mono text-[#00B8A3] tabular-nums">
                            {todayPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 sm:px-6 py-3.5 border-t border-[#171D2D] bg-[#0B0E16]/80 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <Calendar className="w-3.5 h-3.5 text-[#7C869E]" />
                      <span>Est. completion on: {formatShortDate(metrics.estCompletion)}</span>
                    </div>

                    {nextTaskHref ? (
                      <Link
                        to={nextTaskHref}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] text-white text-xs font-medium transition-all"
                      >
                        <span>Continue where you left off</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                        onClick={() => onViewRoadmap(plan.id)}
                      >
                        Open roadmap
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quiet Track Reference Links */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B] border-t border-[#151B2B]">
          <span>Also available on CHAKRIVA:</span>
          <div className="flex items-center gap-4">
            <Link to="/roadmaps/dsa-mastery" className="hover:text-[#E2E8F0] transition-colors">
              DSA Interview Mastery Track
            </Link>
            <Link
              to="/roadmaps/dsa-problem-solving"
              className="hover:text-[#E2E8F0] transition-colors"
            >
              Topic Graph Index (A2Z)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CASE 2: PLANLY-INSPIRED 7-STEP ANIMATED SHOWCASE (Empty State / How It Works)
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-6 space-y-6 text-left text-[#EEF2FF]">
      {/* Header Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div className="space-y-1.5">
          {showOverviewShowcase && roadmapsList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOverviewShowcase(false)}
              className="inline-flex items-center gap-1 text-xs text-[#60A5FA] hover:underline mb-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to my plans</span>
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F8FAFC]">
            Get a preparation roadmap built around your{' '}
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#00B8A3] bg-clip-text text-transparent">
              goals
            </span>
          </h1>
          <p className="text-sm text-[#8F96A8] max-w-2xl">
            Answer a few questions, and CHAKRIVA will build a personalised daily study plan based on
            your target role, current skills, subjects, and weekly availability.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#1B2336] bg-[#101522] text-xs text-[#94A3B8] shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Prerequisite DAG · Judge-Verified</span>
        </div>
      </motion.div>

      {/* Main Split Showcase Container */}
      <div className="relative rounded-2xl border border-[#181F30] bg-gradient-to-br from-[#0F131E] via-[#0C1018] to-[#090C12] p-5 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[440px] overflow-hidden shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]">
        {/* Ambient corner glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#3B82F6]/10 blur-3xl"
        />

        {/* Left Pane: 7-Step Vertical Interactive Timeline */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center py-2 relative z-10">
          <div className="flex flex-col items-center">
            {PREVIEW_STEPS.map((step, idx) => {
              const isActive = idx === activePreviewIdx;
              const isPast = idx < activePreviewIdx;
              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && (
                    <div
                      className={cn(
                        'w-[2px] h-5 rounded-full transition-colors duration-300',
                        isPast || isActive
                          ? 'bg-gradient-to-b from-[#3B82F6] to-[#00B8A3]'
                          : 'bg-[#192033]'
                      )}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAutoCycle(false);
                      setActivePreviewIdx(idx);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-4 py-1 text-center transition-all duration-200 cursor-pointer',
                      isActive
                        ? 'text-[#F8FAFC] font-medium text-base scale-[1.03]'
                        : isPast
                        ? 'text-[#94A3B8] text-sm hover:text-[#E2E8F0]'
                        : 'text-[#525E75] text-sm hover:text-[#8F96A8]'
                    )}
                  >
                    <span>{step.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="timelineActiveDot"
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shadow-[0_0_16px_4px_rgba(59,130,246,0.6)] mt-0.5"
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Animated Live Miniature Preview */}
        <div className="lg:col-span-7 relative z-10">
          <div className="rounded-2xl border border-[#1A2134] bg-[#0B0E16]/95 p-5 sm:p-6 min-h-[360px] flex flex-col justify-between shadow-inner">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="flex-1 flex flex-col justify-between"
              >
                <div className="text-center text-xs italic text-[#7C869E] mb-4">
                  {activeStep.caption}
                </div>

                {/* Stage 0: About you */}
                {activeStep.id === 'about' && (
                  <div className="rounded-xl border border-[#192033] bg-[#101420] p-4 space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <div className="text-[#94A3B8]">1. Which role are you preparing for?</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-[#64748B]">
                          SDE Intern
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-[#3B82F6]/45 bg-[#152443] text-[#EEF2FF] font-medium">
                          Software Engineer
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[#94A3B8]">2. How much experience do you have?</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-lg border border-[#3B82F6]/45 bg-[#152443] text-[#EEF2FF] font-medium">
                          0–2 years
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-[#64748B]">
                          2–5 years
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-[#64748B]">
                          5+ years
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-[#94A3B8]">
                        3. What kind of interviews are you targeting?
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-[#64748B]">
                          Startups
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-[#3B82F6]/45 bg-[#152443] text-[#EEF2FF] font-medium">
                          FAANG / Big Tech
                        </span>
                        <span className="px-2.5 py-1 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-[#64748B]">
                          Product-Based
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 1: Understanding your goals */}
                {activeStep.id === 'goals' && (
                  <div className="rounded-xl border border-[#192033] bg-[#101420] p-5 max-w-md mx-auto w-full space-y-3">
                    <div className="text-center space-y-1">
                      <div className="text-sm font-medium text-[#F1F5F9]">
                        Creating your{' '}
                        <span className="italic text-[#60A5FA]">personalised</span> roadmap
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        Calibrating prerequisite graph...
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-[#CBD5E1] px-2.5 py-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                        <span>Understanding your goals</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#CBD5E1] px-2.5 py-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                        <span>Estimating preparation time</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#EEF2FF] px-2.5 py-1.5 rounded-lg border border-[#3B82F6]/40 bg-[#152443]">
                        <GitBranch className="w-4 h-4 text-[#60A5FA]" />
                        <span>Ordering topics topologically</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748B] px-2.5 py-1.5">
                        <Circle className="w-4 h-4" />
                        <span>Organising into weekly sprints</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748B] px-2.5 py-1.5">
                        <Circle className="w-4 h-4" />
                        <span>Selecting judge-verified problems</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 2: Personalised weekly sprints */}
                {activeStep.id === 'sprints' && (
                  <div className="space-y-2 text-xs">
                    {[
                      { n: 1, title: 'Arrays, Strings & Hashing', status: 'Completed', hrs: '12h' },
                      { n: 2, title: 'Sorting & Binary Search', status: 'Completed', hrs: '13h 30m' },
                      {
                        n: 3,
                        title: 'Linked Lists, Stacks & Queues',
                        status: 'In progress',
                        hrs: '15h',
                      },
                      { n: 4, title: 'Trees & Binary Search Trees', status: 'Upcoming', hrs: '16h' },
                      { n: 5, title: 'Graphs & Dynamic Programming', status: 'Upcoming', hrs: '18h' },
                    ].map((s) => (
                      <div
                        key={s.n}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[#192033] bg-[#101420]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-[#161D2E] border border-[#222B42] text-[11px] font-mono text-[#94A3B8] shrink-0">
                            Sprint {s.n}
                          </span>
                          <span className="text-[#E2E8F0] truncate">{s.title}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium',
                              s.status === 'Completed'
                                ? 'bg-[#00B8A3]/15 text-[#00B8A3]'
                                : s.status === 'In progress'
                                ? 'bg-[#3B82F6]/15 text-[#60A5FA]'
                                : 'bg-[#161C2C] text-[#64748B]'
                            )}
                          >
                            • {s.status}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            Est. {s.hrs}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stage 3: Solve & Practice */}
                {activeStep.id === 'solve' && (
                  <div className="rounded-xl border border-[#192033] bg-[#101420] p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#171D2D]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#E2E8F0]">Day 1</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#3B82F6]/15 text-[#60A5FA]">
                          Today
                        </span>
                      </div>
                      <span className="font-mono text-[#64748B]">Est. 2h 15m</span>
                    </div>
                    {[
                      { label: 'Learn hashing frequency patterns', min: '30 min' },
                      { label: 'Solve Two Sum (VRQ-000001)', min: '25 min' },
                      { label: 'Subarray Sum Equals K (VRQ-000560)', min: '40 min' },
                      { label: 'Review edge cases and save notes', min: '20 min' },
                    ].map((t) => (
                      <div
                        key={t.label}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B0E16] border border-[#161C2C]"
                      >
                        <div className="flex items-center gap-2 text-[#E2E8F0] truncate">
                          <Circle className="w-3.5 h-3.5 text-[#475569] shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#60A5FA] shrink-0">
                          {t.min} &gt;
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-1.5 text-[#64748B]">
                      <span>Day 3</span>
                      <span>Day off</span>
                    </div>
                  </div>
                )}

                {/* Stage 4: Track your time */}
                {activeStep.id === 'time' && (
                  <div className="rounded-xl border border-[#192033] bg-[#101420] p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#1B2234] bg-[#0B0E16]">
                      <span className="font-medium text-[#E2E8F0]">
                        Practice Workspace · Task 2 / 4
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[#00B8A3]">
                        <Timer className="w-3.5 h-3.5" />
                        <span>18:07</span>
                        <Pause className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#1B2234] bg-[#0B0E16] p-3 space-y-2 max-w-sm ml-auto">
                      <div className="text-[11px] text-[#64748B]">Today&apos;s task</div>
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00B8A3]" />
                          Prefix sums — concept review
                        </span>
                        <span className="font-mono">22m</span>
                      </div>
                      <div className="flex items-center justify-between text-[#E2E8F0] px-2.5 py-1.5 rounded-lg bg-[#141A29] border border-[#3B82F6]/35">
                        <span>Subarray Sum Equals K</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#00B8A3]/15 text-[#00B8A3] text-[10px]">
                          In progress
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 5: Progress tracker */}
                {activeStep.id === 'progress' && (
                  <div className="rounded-xl border border-[#192033] bg-[#101420] p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#F1F5F9]">SDE Interview Preparation</div>
                        <div className="text-[11px] text-[#60A5FA]">Currently on: Sprint 3</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg border border-[#1E2638] bg-[#141A29] text-[11px] text-[#CBD5E1]">
                        View your plan
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 rounded-lg border border-[#181F30] bg-[#0B0E16] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-4 border-[#00B8A3] flex items-center justify-center font-semibold text-[#F1F5F9]">
                          46%
                        </div>
                        <div className="space-y-0.5 text-[11px] text-[#94A3B8]">
                          <div>Sprints: 2 / 6</div>
                          <div>Topics: 62 / 148</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-[#181F30] bg-[#0B0E16] flex items-center justify-between">
                        {[1, 2, 3, 4, 5].map((d) => (
                          <span
                            key={d}
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] border',
                              d <= 3
                                ? 'bg-[#00B8A3]/20 border-[#00B8A3]/50 text-[#00B8A3]'
                                : d === 4
                                ? 'border-[#3B82F6] bg-[#162647] text-[#60A5FA]'
                                : 'border-[#1B2234] text-[#475569]'
                            )}
                          >
                            {d <= 3 ? '✓' : d}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="px-3 py-1.5 rounded-lg bg-[#3B82F6] text-white text-[11px] font-medium">
                        Continue where you left off &gt;
                      </span>
                    </div>
                  </div>
                )}

                {/* Stage 6: Missed a Day/Task */}
                {activeStep.id === 'missed' && (
                  <div className="rounded-xl border border-[#192033] bg-[#101420] p-4 space-y-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#FBBF24] text-[10px] font-medium">
                          Slightly behind
                        </span>
                        <div className="text-[#94A3B8]">
                          Rebalance missed tasks forward or pause cleanly without losing progress.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1.5 rounded-lg border border-[#1E2638] bg-[#141A29] text-[#E2E8F0]">
                          Adjust plan
                        </span>
                        <span className="px-2.5 py-1.5 rounded-lg border border-[#3B82F6]/45 bg-[#152443] text-[#93C5FD]">
                          Take a break
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg border border-[#181F30] bg-[#0B0E16]">
                        <div className="text-[10px] text-[#64748B]">Overall Progress</div>
                        <div className="text-sm font-semibold text-[#00B8A3] mt-0.5">42%</div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-[#181F30] bg-[#0B0E16]">
                        <div className="text-[10px] text-[#64748B]">Sprints completed</div>
                        <div className="text-sm font-semibold text-[#E2E8F0] mt-0.5">2 of 6</div>
                      </div>
                      <div className="p-2.5 rounded-lg border border-[#181F30] bg-[#0B0E16]">
                        <div className="text-[10px] text-[#64748B]">Est. completion</div>
                        <div className="text-sm font-semibold text-[#60A5FA] mt-0.5">Next Month</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Bottom Step Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4 pt-2">
              {PREVIEW_STEPS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Preview ${s.label}`}
                  onClick={() => {
                    setAutoCycle(false);
                    setActivePreviewIdx(idx);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                    idx === activePreviewIdx
                      ? 'w-6 bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]'
                      : 'w-1.5 bg-[#1E2638] hover:bg-[#2F3B57]'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-[#64748B]">
          <Link to="/roadmaps/dsa-mastery" className="hover:text-[#E2E8F0] transition-colors">
            DSA Interview Mastery
          </Link>
          <span className="text-[#263047]">•</span>
          <Link
            to="/roadmaps/dsa-problem-solving"
            className="hover:text-[#E2E8F0] transition-colors"
          >
            Topic Graph Index (A2Z)
          </Link>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Button
            variant="primary"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={onCreateRoadmap}
            className="shadow-[0_12px_28px_-8px_rgba(59,130,246,0.55)]"
          >
            Create my plan
          </Button>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
            <Clock className="w-3.5 h-3.5" />
            <span>Takes less than 3 minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
