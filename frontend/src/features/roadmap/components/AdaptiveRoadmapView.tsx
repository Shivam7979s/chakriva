import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  ExternalLink,
  SlidersHorizontal,
  X,
  MoreVertical,
  CheckCircle2,
  Circle,
  Check,
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  Brain,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import type {
  AdaptiveRoadmap,
  DayOfWeek,
  ScheduleRecalculationProposal,
  WeeklyAvailability,
} from '../types/adaptive';
import { adaptiveRoadmapService } from '../services/adaptiveRoadmapService';
import { resolveLearnHrefForTask } from '@/features/learn/services/learnProgressService';
import { TodayActionableCard } from './TodayActionableCard';
import { Card, CardContent } from '@/components/ui/data/Card';
import { Button } from '@/components/ui/actions/Button';
import { cn } from '@/lib/utils';

export interface AdaptiveRoadmapViewProps {
  roadmap: AdaptiveRoadmap;
  onRoadmapUpdated: (updated: AdaptiveRoadmap) => void;
  onCreateNew: () => void;
  onBackToOverview?: () => void;
  onToggleStatus?: (roadmapId: string, nextStatus: 'active' | 'paused') => void;
  onDeletePlan?: (roadmapId: string) => void;
}

type SectionTab = 'overview' | 'sprints' | 'progress';

const DAY_KEYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function formatHoursMinutes(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hrs <= 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const AdaptiveRoadmapView: React.FC<AdaptiveRoadmapViewProps> = ({
  roadmap,
  onRoadmapUpdated,
  onCreateNew,
  onBackToOverview,
  onToggleStatus,
  onDeletePlan,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { initialWeekIdx, initialDayIdx } = useMemo(() => {
    for (let wIdx = 0; wIdx < roadmap.weeks.length; wIdx++) {
      const dIdx = roadmap.weeks[wIdx].days.findIndex((d) => d.date === todayStr);
      if (dIdx >= 0) {
        return { initialWeekIdx: wIdx, initialDayIdx: dIdx };
      }
    }
    const firstActiveDayIdx = roadmap.weeks[0]?.days.findIndex((d) => !d.isRestDay) ?? 0;
    return { initialWeekIdx: 0, initialDayIdx: Math.max(0, firstActiveDayIdx) };
  }, [roadmap, todayStr]);

  const [sectionTab, setSectionTab] = useState<SectionTab>('overview');
  const [selectedSprintIdx, setSelectedSprintIdx] = useState<number>(initialWeekIdx);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(initialDayIdx);
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [proposal, setProposal] = useState<ScheduleRecalculationProposal | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [expandedSprints, setExpandedSprints] = useState<Record<number, boolean>>(() => ({
    [roadmap.weeks[initialWeekIdx]?.weekNumber || 1]: true,
  }));
  const [expandedSprintDays, setExpandedSprintDays] = useState<Record<string, boolean>>(() => ({
    [`${roadmap.weeks[initialWeekIdx]?.weekNumber || 1}-${initialDayIdx}`]: true,
  }));

  useEffect(() => {
    setSelectedSprintIdx(initialWeekIdx);
    setSelectedDayIdx(initialDayIdx);
  }, [roadmap.id, initialWeekIdx, initialDayIdx]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    }
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreMenuOpen]);

  // Adjust Schedule / Preferences Modal State
  const [isAdjustPlanOpen, setIsAdjustPlanOpen] = useState(false);
  const [editRole, setEditRole] = useState(roadmap.profile.targetRole);
  const [editWeeklyHours, setEditWeeklyHours] = useState<WeeklyAvailability>(
    roadmap.profile.weeklyAvailability
  );
  const [editTimelineWeeks, setEditTimelineWeeks] = useState(roadmap.profile.timelineWeeks);
  const [isSavingAdjust, setIsSavingAdjust] = useState(false);

  useEffect(() => {
    setEditRole(roadmap.profile.targetRole);
    setEditWeeklyHours(roadmap.profile.weeklyAvailability);
    setEditTimelineWeeks(roadmap.profile.timelineWeeks);
  }, [roadmap.id]);

  const activeSprint = roadmap.weeks[selectedSprintIdx] || roadmap.weeks[0] || null;
  const activeDay = activeSprint?.days[selectedDayIdx] || activeSprint?.days[0] || null;

  const {
    completedSprints,
    totalMinutes,
    completedMinutes,
    problemsSolved,
    totalProblems,
    conceptsLearned,
    totalConcepts,
    topicBreakdown,
    allTopics,
    estCompletionDate,
  } = useMemo(() => {
    let compSprints = 0;
    let totalMins = 0;
    let doneMins = 0;
    let probSolved = 0;
    let probTotal = 0;
    let conLearned = 0;
    let conTotal = 0;

    const topicsMap: Record<string, { total: number; completed: number; problems: number }> = {};

    for (const week of roadmap.weeks) {
      let wTotal = 0;
      let wDone = 0;
      for (const day of week.days) {
        for (const task of day.tasks) {
          wTotal++;
          totalMins += task.estimatedMinutes || 0;
          if (task.status === 'completed') {
            wDone++;
            doneMins += task.estimatedMinutes || 0;
          }

          const isProb = Boolean(
            (task.taskType === 'problem' || task.taskType === 'practice') &&
              (task.problemSlug || task.verniqProblemId)
          );
          if (isProb) {
            probTotal++;
            if (task.status === 'completed') probSolved++;
          } else {
            conTotal++;
            if (task.status === 'completed') conLearned++;
          }

          const topicKey = task.topic || 'General';
          if (!topicsMap[topicKey]) {
            topicsMap[topicKey] = { total: 0, completed: 0, problems: 0 };
          }
          topicsMap[topicKey].total++;
          if (task.status === 'completed') topicsMap[topicKey].completed++;
          if (isProb) topicsMap[topicKey].problems++;
        }
      }
      if (wTotal > 0 && wDone === wTotal) {
        compSprints++;
      }
    }

    const lastWeek = roadmap.weeks[roadmap.weeks.length - 1];
    const lastDay = lastWeek?.days[lastWeek.days.length - 1];

    return {
      completedSprints: compSprints,
      totalMinutes: totalMins,
      completedMinutes: doneMins,
      problemsSolved: probSolved,
      totalProblems: probTotal,
      conceptsLearned: conLearned,
      totalConcepts: conTotal,
      topicBreakdown: topicsMap,
      allTopics: Object.keys(topicsMap),
      estCompletionDate: lastDay?.date || '',
    };
  }, [roadmap]);

  const handleToggleTask = (taskId: string) => {
    const updated = adaptiveRoadmapService.toggleTaskCompleted(roadmap, taskId);
    onRoadmapUpdated(updated);
    adaptiveRoadmapService.saveServerRoadmap(updated).catch((err) => {
      console.warn('[AdaptiveRoadmapView] Task toggle sync to server deferred:', err);
    });
  };

  const handleCheckRecalculation = () => {
    const prop = adaptiveRoadmapService.getMissedTaskProposal(roadmap, todayStr);
    setProposal(prop);
  };

  const handleApplyRecalculation = async () => {
    if (!proposal) return;
    try {
      const updated = await adaptiveRoadmapService.rescheduleOnServer(roadmap, proposal);
      setProposal(null);
      onRoadmapUpdated(updated);
    } catch (err) {
      console.warn('Server rescheduling failed, applied locally:', err);
      const updated = adaptiveRoadmapService.acceptScheduleProposal(roadmap, proposal);
      setProposal(null);
      onRoadmapUpdated(updated);
    }
  };

  const handleSavePlanAdjustment = async () => {
    setIsSavingAdjust(true);
    const updatedDraft = {
      ...roadmap.profile,
      targetRole: editRole,
      weeklyAvailability: editWeeklyHours,
      timelineWeeks: editTimelineWeeks,
      targetDeadline: new Date(Date.now() + editTimelineWeeks * 7 * 86400000)
        .toISOString()
        .split('T')[0],
      personalizationMode:
        roadmap.profile.personalizationMode || (roadmap.explanation ? 'personalized' : undefined),
    };

    try {
      const updated = await adaptiveRoadmapService.updatePreferencesOnServer(
        roadmap,
        updatedDraft
      );
      setIsAdjustPlanOpen(false);
      onRoadmapUpdated(updated);
    } catch (err) {
      console.warn('Server plan adjustment failed, applied locally:', err);
      const newRoadmap = adaptiveRoadmapService.createRoadmapFromDraft(
        updatedDraft,
        roadmap.userId,
        { mode: updatedDraft.personalizationMode }
      );

      const completedKeys = new Set(
        roadmap.weeks
          .flatMap((w) => w.days.flatMap((d) => d.tasks))
          .filter((t) => t.status === 'completed')
          .flatMap((t) => [t.verniqProblemId, t.problemSlug, t.id].filter(Boolean))
      );

      let recomputedCompleted = 0;
      const reconciledWeeks = newRoadmap.weeks.map((week) => ({
        ...week,
        days: week.days.map((day) => ({
          ...day,
          tasks: day.tasks.map((task) => {
            if (
              (task.verniqProblemId && completedKeys.has(task.verniqProblemId)) ||
              (task.problemSlug && completedKeys.has(task.problemSlug)) ||
              completedKeys.has(task.id)
            ) {
              recomputedCompleted++;
              return {
                ...task,
                status: 'completed' as const,
                completedAt: task.completedAt || new Date().toISOString(),
              };
            }
            return task;
          }),
        })),
      }));

      const finalRoadmap: AdaptiveRoadmap = {
        ...newRoadmap,
        id: roadmap.id,
        title: roadmap.title,
        weeks: reconciledWeeks,
        completedTasks: recomputedCompleted,
        progressPercent:
          newRoadmap.totalTasks > 0
            ? Math.round((recomputedCompleted / newRoadmap.totalTasks) * 100)
            : 0,
      };

      adaptiveRoadmapService.saveActiveRoadmap(finalRoadmap);
      setIsAdjustPlanOpen(false);
      onRoadmapUpdated(finalRoadmap);
    } finally {
      setIsSavingAdjust(false);
    }
  };

  const isPaused = roadmap.status === 'paused';
  const nextPendingTask = (activeDay?.tasks || []).find((t) => t.status !== 'completed');
  const continueHref = nextPendingTask
    ? nextPendingTask.problemSlug
      ? `/app/practice/${nextPendingTask.problemSlug}?fromRoadmap=adaptive`
      : resolveLearnHrefForTask(nextPendingTask)
    : null;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (roadmap.progressPercent / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto py-3 sm:py-5 space-y-5 text-left text-[#EEF2FF]">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="px-3 py-1.5 rounded-xl border border-[#1B2234] bg-[#0F131D] text-xs text-[#94A3B8] hover:text-white hover:border-[#2C3752] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Plans</span>
            </button>
          )}

          {/* Sliding Tab Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl border border-[#192033] bg-[#0F131D]">
            {(
              [
                { id: 'overview', label: 'Daily Bento' },
                { id: 'sprints', label: 'Weekly Sprints' },
                { id: 'progress', label: 'Analytics & Rationale' },
              ] as { id: SectionTab; label: string }[]
            ).map((tab) => {
              const isSelected = sectionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSectionTab(tab.id)}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    isSelected ? 'text-[#F8FAFC]' : 'text-[#7C869E] hover:text-[#CBD5E1]'
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="roadmapSubTab"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-[#1A2236] border border-[#28334E]"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {isPaused && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
              Paused
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 relative" ref={moreMenuRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateNew}
            className="border-[#1F273B] bg-[#111623] hover:bg-[#161D2E] hover:border-[#3B82F6]/45 text-[#E2E8F0]"
          >
            Generate another plan
          </Button>

          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            aria-label="More plan options"
            className="p-2 rounded-xl border border-[#1B2234] bg-[#0F131D] text-[#94A3B8] hover:text-white hover:border-[#2C3752] cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {isMoreMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-11 w-52 rounded-xl border border-[#1F273B] bg-[#141927] shadow-2xl z-30 py-1.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsAdjustPlanOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-xs text-left text-[#CBD5E1] hover:text-white hover:bg-[#1B2234] flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Edit hours &amp; target role</span>
                </button>
                {onToggleStatus && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleStatus(roadmap.id, isPaused ? 'active' : 'paused');
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left text-[#CBD5E1] hover:text-white hover:bg-[#1B2234] flex items-center gap-2 cursor-pointer"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-[#00B8A3]" />
                        <span>Resume plan</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 text-[#FBBF24]" />
                        <span>Take a break (Pause)</span>
                      </>
                    )}
                  </button>
                )}
                {onDeletePlan && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDelete) {
                        onDeletePlan(roadmap.id);
                        setConfirmDelete(false);
                        setIsMoreMenuOpen(false);
                      } else {
                        setConfirmDelete(true);
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left text-[#FF375F] hover:bg-[#FF375F]/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{confirmDelete ? 'Click again to delete' : 'Delete roadmap'}</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Missed a Day / Task Recovery Strip */}
      {(roadmap.missedTasks > 0 || isPaused) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#F59E0B]/25 bg-[#17130C] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <div>
              <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#FBBF24] text-[11px] font-medium mr-2">
                {isPaused ? 'On break' : 'Slightly behind'}
              </span>
              <span className="text-[#CBD5E1]">
                {isPaused
                  ? 'Your progress is saved. Resume anytime to continue without losing history.'
                  : `${roadmap.missedTasks} overdue task${
                      roadmap.missedTasks > 1 ? 's' : ''
                    }. Adjust your plan forward or pause without losing progress.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {roadmap.missedTasks > 0 && (
              <Button variant="secondary" size="sm" onClick={handleCheckRecalculation}>
                Adjust plan
              </Button>
            )}
            {onToggleStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(roadmap.id, isPaused ? 'active' : 'paused')}
                className="border-[#292214] hover:border-[#F59E0B]/45"
              >
                {isPaused ? 'Resume plan' : 'Take a break'}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Proposal Confirmation Banner */}
      <AnimatePresence>
        {proposal && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-[#3B82F6]/35 bg-[#121D34] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="font-medium text-[#EEF2FF]">Schedule Recalculation Ready</div>
              <p className="text-[#94A3B8]">
                {proposal.explanation ||
                  `Moves ${proposal.rescheduledTasks.length} overdue tasks cleanly into upcoming free capacity.`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setProposal(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyRecalculation}>
                Confirm reschedule
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* TAB 1: DAILY BENTO OVERVIEW                                        */}
      {/* ================================================================== */}
      <AnimatePresence mode="wait">
        {sectionTab === 'overview' && (
          <motion.div
            key="tab-overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-[#192033] bg-gradient-to-b from-[#111623] to-[#0D1018] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            {/* Card Header */}
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#171D2D] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFC]">
                  {roadmap.title || `${roadmap.profile.targetRole} Plan`}
                </h1>
                <p className="text-xs text-[#64748B]">
                  Started on:{' '}
                  <span className="text-[#94A3B8]">
                    {formatShortDate(roadmap.startDate || roadmap.createdAt?.split('T')[0])}
                  </span>{' '}
                  · Currently on:{' '}
                  <span className="text-[#60A5FA]">Sprint {activeSprint?.weekNumber || 1}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSectionTab('sprints')}
                className="px-3.5 py-1.5 rounded-lg border border-[#1E2638] bg-[#141A29] hover:bg-[#192134] hover:border-[#3B82F6]/45 text-xs font-medium text-[#E2E8F0] transition-all cursor-pointer"
              >
                View full sprint plan
              </button>
            </div>

            {/* Top 2-Column Row: Overall Progress + 7-Day Sprint Progress Nodes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#171D2D] border-b border-[#171D2D]">
              {/* OVERALL PROGRESS */}
              <div className="p-5 sm:px-6 space-y-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
                  Overall progress
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke="#182032"
                        strokeWidth="7"
                      />
                      <motion.circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke="url(#adaptiveRingGrad)"
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: strokeOffset }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="adaptiveRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#00B8A3" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-semibold tabular-nums text-[#F8FAFC]">
                        {roadmap.progressPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>Sprints</span>
                      <span className="font-mono text-[#E2E8F0] tabular-nums">
                        {completedSprints} / {roadmap.weeks.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>Topics &amp; Tasks</span>
                      <span className="font-mono text-[#E2E8F0] tabular-nums">
                        {roadmap.completedTasks} / {roadmap.totalTasks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span>Est. time completed</span>
                      <span className="font-mono text-[#00B8A3] tabular-nums">
                        {formatHoursMinutes(completedMinutes)} / {formatHoursMinutes(totalMinutes)}
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
                      disabled={selectedSprintIdx <= 0}
                      onClick={() => {
                        setSelectedSprintIdx((i) => Math.max(0, i - 1));
                        setSelectedDayIdx(0);
                      }}
                      className="p-1 rounded-md hover:bg-[#182032] disabled:opacity-30 cursor-pointer"
                      aria-label="Previous sprint"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-medium text-[#E2E8F0] tabular-nums">
                      Sprint {activeSprint?.weekNumber || 1}
                    </span>
                    <button
                      type="button"
                      disabled={selectedSprintIdx >= roadmap.weeks.length - 1}
                      onClick={() => {
                        setSelectedSprintIdx((i) => Math.min(roadmap.weeks.length - 1, i + 1));
                        setSelectedDayIdx(0);
                      }}
                      className="p-1 rounded-md hover:bg-[#182032] disabled:opacity-30 cursor-pointer"
                      aria-label="Next sprint"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-1">
                  {(activeSprint?.days || []).slice(0, 7).map((day, idx) => {
                    const done =
                      !day.isRestDay &&
                      day.tasks.length > 0 &&
                      day.tasks.every((t) => t.status === 'completed');
                    const isSelected = idx === selectedDayIdx;
                    return (
                      <button
                        key={day.dayOfWeek + idx}
                        type="button"
                        onClick={() => setSelectedDayIdx(idx)}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                      >
                        <motion.span
                          whileHover={{ scale: 1.07 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium border transition-colors',
                            done
                              ? 'bg-[#00B8A3]/20 border-[#00B8A3]/60 text-[#00B8A3]'
                              : isSelected
                              ? 'border-[#3B82F6] text-[#60A5FA] bg-[#162647] shadow-[0_0_18px_-2px_rgba(59,130,246,0.55)]'
                              : day.isRestDay
                              ? 'border-[#151A26] bg-[#0B0E16] text-[#475569]'
                              : 'border-[#1C2334] bg-[#131826] text-[#94A3B8] group-hover:border-[#3B82F6]/45 group-hover:text-white'
                          )}
                        >
                          {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </motion.span>
                        <span
                          className={cn(
                            'text-[11px] transition-colors',
                            isSelected ? 'text-[#60A5FA] font-medium' : 'text-[#64748B]'
                          )}
                        >
                          {day.isRestDay ? 'Off' : `Day ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-[#64748B] truncate">
                  Focus: <span className="text-[#94A3B8]">{activeSprint?.title}</span> ·{' '}
                  <span>{formatShortDate(activeDay?.date)}</span>
                </div>
              </div>
            </div>

            {/* Bottom 2-Column Row: Today's Task + Today's Progress */}
            <TodayActionableCard todayDay={activeDay} onToggleComplete={handleToggleTask} />

            {/* Bento Card Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-[#171D2D] bg-[#0B0E16]/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <Calendar className="w-3.5 h-3.5 text-[#7C869E]" />
                <span>Est. completion on: {formatShortDate(estCompletionDate)}</span>
              </div>

              {continueHref ? (
                <Link
                  to={continueHref}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] shadow-[0_8px_22px_-6px_rgba(59,130,246,0.55)] text-white text-xs font-medium transition-all"
                >
                  <span>Continue where you left off</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  onClick={() => setSectionTab('sprints')}
                >
                  Explore sprint schedule
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: WEEKLY SPRINTS DRILL-DOWN                                   */}
        {/* ================================================================== */}
        {sectionTab === 'sprints' && (
          <motion.div
            key="tab-sprints"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Filter Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#7C869E]">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="bg-[#0F131D] border border-[#1B2234] rounded-xl px-3 py-1.5 text-xs text-[#E2E8F0] focus:outline-none focus:border-[#3B82F6]/50"
                >
                  <option value="all">All topics ({allTopics.length})</option>
                  {allTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#7C869E]">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<number, boolean> = {};
                    roadmap.weeks.forEach((w) => {
                      next[w.weekNumber] = true;
                    });
                    setExpandedSprints(next);
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedSprints({})}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Stacked Sprint Accordions */}
            <div className="space-y-3">
              {roadmap.weeks.map((week) => {
                const allWTasks = week.days.flatMap((d) => d.tasks);
                if (
                  topicFilter !== 'all' &&
                  !allWTasks.some((t) => (t.topic || 'General') === topicFilter)
                ) {
                  return null;
                }
                const wDone = allWTasks.filter((t) => t.status === 'completed').length;
                const wTotal = allWTasks.length;
                const wMins = allWTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
                const statusLabel =
                  wTotal > 0 && wDone === wTotal
                    ? 'Completed'
                    : wDone > 0 || week.weekNumber === (activeSprint?.weekNumber || 1)
                    ? 'In progress'
                    : 'Upcoming';
                const isExpanded = Boolean(expandedSprints[week.weekNumber]);

                return (
                  <div
                    key={week.weekNumber}
                    className="rounded-2xl border border-[#192033] bg-[#0F131D] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSprints((prev) => ({
                          ...prev,
                          [week.weekNumber]: !prev[week.weekNumber],
                        }))
                      }
                      className="w-full px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-[#141A29] transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-lg border border-[#1F273B] bg-[#141A29] text-xs font-mono text-[#94A3B8] shrink-0">
                          Sprint {week.weekNumber}
                        </span>
                        <span className="text-sm font-medium text-[#F1F5F9] truncate">
                          {week.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                            statusLabel === 'Completed'
                              ? 'bg-[#00B8A3]/15 text-[#00B8A3]'
                              : statusLabel === 'In progress'
                              ? 'bg-[#3B82F6]/15 text-[#60A5FA]'
                              : 'bg-[#161C2C] text-[#64748B]'
                          )}
                        >
                          • {statusLabel}
                        </span>
                        <span className="font-mono text-[#7C869E]">
                          Est. {formatHoursMinutes(wMins)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#7C869E]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#7C869E]" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-[#171D2D]"
                        >
                          <div className="px-5 pb-4 pt-3 space-y-2 bg-[#0A0D15]">
                            {week.days.map((day, dIdx) => {
                              const dayKey = `${week.weekNumber}-${dIdx}`;
                              const visibleTasks =
                                topicFilter === 'all'
                                  ? day.tasks
                                  : day.tasks.filter(
                                      (t) => (t.topic || 'General') === topicFilter
                                    );
                              if (topicFilter !== 'all' && visibleTasks.length === 0) return null;

                              const dayMins = visibleTasks.reduce(
                                (s, t) => s + (t.estimatedMinutes || 0),
                                0
                              );
                              const isDayOpen =
                                expandedSprintDays[dayKey] ?? day.date === todayStr;
                              const isToday = day.date === todayStr;

                              return (
                                <div
                                  key={dayKey}
                                  className="rounded-xl border border-[#181F30] bg-[#101420] overflow-hidden"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedSprintDays((prev) => ({
                                        ...prev,
                                        [dayKey]: !isDayOpen,
                                      }))
                                    }
                                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#151B2B] cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-medium text-[#E2E8F0]">
                                        Day {dIdx + 1}
                                      </span>
                                      <span className="text-[#64748B]">
                                        {formatShortDate(day.date)}
                                      </span>
                                      {isToday && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#3B82F6]/15 text-[#60A5FA]">
                                          Today
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[#7C869E] font-mono">
                                      <span>
                                        {day.isRestDay
                                          ? 'Day off'
                                          : `Est. ${formatHoursMinutes(dayMins)}`}
                                      </span>
                                      {!day.isRestDay &&
                                        (isDayOpen ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        ))}
                                    </div>
                                  </button>

                                  {isDayOpen && !day.isRestDay && (
                                    <div className="px-4 pb-3 pt-2 border-t border-[#161C2C] space-y-1.5">
                                      {visibleTasks.map((task) => {
                                        const isDone = task.status === 'completed';
                                        const isJudge = Boolean(
                                          (task.taskType === 'problem' ||
                                            task.taskType === 'practice') &&
                                            task.problemSlug
                                        );
                                        return (
                                          <div
                                            key={task.id}
                                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#0B0E16] border border-[#161C2C] text-xs"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              {isJudge ? (
                                                isDone ? (
                                                  <CheckCircle2 className="w-4 h-4 text-[#00B8A3] shrink-0" />
                                                ) : (
                                                  <Circle className="w-4 h-4 text-[#475569] shrink-0" />
                                                )
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleTask(task.id)}
                                                  className="cursor-pointer shrink-0"
                                                >
                                                  {isDone ? (
                                                    <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                                                  ) : (
                                                    <Circle className="w-4 h-4 text-[#475569]" />
                                                  )}
                                                </button>
                                              )}
                                              <span
                                                className={cn(
                                                  'truncate',
                                                  isDone
                                                    ? 'line-through text-[#64748B]'
                                                    : 'text-[#E2E8F0]'
                                                )}
                                              >
                                                {task.title}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                              <span className="font-mono text-[#64748B]">
                                                {task.estimatedMinutes} min
                                              </span>
                                              {isJudge ? (
                                                <Link
                                                  to={`/app/practice/${task.problemSlug}?fromRoadmap=adaptive`}
                                                  className="text-[#60A5FA] hover:underline inline-flex items-center gap-0.5"
                                                >
                                                  <span>{isDone ? 'Review' : 'Solve'}</span>
                                                  <ChevronRight className="w-3 h-3" />
                                                </Link>
                                              ) : (
                                                <div className="flex items-center gap-2.5">
                                                  <Link
                                                    to={resolveLearnHrefForTask(task)}
                                                    className="text-[#A78BFA] hover:underline inline-flex items-center gap-0.5"
                                                  >
                                                    <span>Study</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                  </Link>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleTask(task.id)}
                                                    className="text-[#94A3B8] hover:text-white cursor-pointer"
                                                  >
                                                    {isDone ? 'Done' : 'Mark done'}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: ANALYTICS & RATIONALE                                       */}
        {/* ================================================================== */}
        {sectionTab === 'progress' && (
          <motion.div
            key="tab-progress"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-4 space-y-1">
                <div className="text-xs text-[#7C869E]">Problems Solved</div>
                <div className="text-2xl font-semibold text-[#F8FAFC] tabular-nums">
                  {problemsSolved}
                  <span className="text-xs text-[#64748B] font-normal"> / {totalProblems}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-4 space-y-1">
                <div className="text-xs text-[#7C869E]">Concept &amp; Study Modules</div>
                <div className="text-2xl font-semibold text-[#F8FAFC] tabular-nums">
                  {conceptsLearned}
                  <span className="text-xs text-[#64748B] font-normal"> / {totalConcepts}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-4 space-y-1">
                <div className="text-xs text-[#7C869E]">Estimated Hours Done</div>
                <div className="text-2xl font-semibold text-[#00B8A3] tabular-nums">
                  {Math.round(completedMinutes / 60)}h
                  <span className="text-xs text-[#64748B] font-normal">
                    {' '}
                    / {Math.round(totalMinutes / 60)}h
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-4 space-y-1">
                <div className="text-xs text-[#7C869E]">Overdue Tasks</div>
                <div className="text-2xl font-semibold text-[#FBBF24] tabular-nums">
                  {roadmap.missedTasks}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#F1F5F9]">
                Topic Coverage &amp; Mastery Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {allTopics.map((topic) => {
                  const stat = topicBreakdown[topic];
                  const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                  return (
                    <div
                      key={topic}
                      className="p-3.5 rounded-xl border border-[#181F30] bg-[#0B0E16] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#E2E8F0]">{topic}</span>
                        <span className="font-mono text-[#94A3B8] tabular-nums">
                          {stat.completed} / {stat.total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#151B2B] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3] rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00B8A3]" />
                  <h3 className="text-sm font-semibold text-[#F1F5F9]">
                    Plan Rationale &amp; Track Transparency
                  </h3>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {roadmap.explanation?.goalAlignmentSummary || roadmap.feasibility.recommendation}
                </p>
                {roadmap.explanation?.contentGaps && roadmap.explanation.contentGaps.length > 0 && (
                  <ul className="space-y-1 text-[11px] text-[#64748B] list-disc pl-4">
                    {roadmap.explanation.contentGaps.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="text-sm font-semibold text-[#F1F5F9]">Chakriva AI Companion</h3>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Use Chakriva Mentor inside coding problems or open the Learner Intelligence view
                  for invariant hints and Socratic reasoning.
                </p>
                <div className="pt-1">
                  <Link to="/app/chakriva">
                    <Button
                      variant="secondary"
                      size="sm"
                      rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Open Chakriva AI
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* ADJUST PREFERENCES MODAL                                           */}
      {/* ================================================================== */}
      {isAdjustPlanOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <Card variant="elevated" className="w-full max-w-lg border-[#1E2638] bg-[#101420] shadow-none">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#181F30] pb-3">
                <h3 className="text-base font-semibold text-[#F8FAFC]">
                  Edit Weekly Availability &amp; Role
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdjustPlanOpen(false)}
                  className="text-[#64748B] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[#94A3B8]">Target Role</label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0E16] border border-[#1B2234] text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#94A3B8]">
                    Timeline ({editTimelineWeeks} weeks)
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    value={editTimelineWeeks}
                    onChange={(e) => setEditTimelineWeeks(Number(e.target.value))}
                    className="w-full accent-[#3B82F6] cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[#94A3B8]">Daily Study Hours (0h = Day off)</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_KEYS.map((d) => (
                      <div key={d} className="space-y-1 text-center">
                        <span className="text-[10px] font-mono uppercase text-[#64748B]">{d}</span>
                        <input
                          type="number"
                          min={0}
                          max={12}
                          value={editWeeklyHours[d] || 0}
                          onChange={(e) =>
                            setEditWeeklyHours((prev) => ({
                              ...prev,
                              [d]: Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                            }))
                          }
                          className="w-full px-1 py-1.5 rounded-lg bg-[#0B0E16] border border-[#1B2234] text-center font-mono text-[#F1F5F9]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B]">
                  Completed tasks and execution judge verdicts are preserved when regenerating dates.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#181F30]">
                <Button variant="ghost" size="sm" onClick={() => setIsAdjustPlanOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSavingAdjust}
                  onClick={handleSavePlanAdjustment}
                >
                  Save &amp; Update Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
