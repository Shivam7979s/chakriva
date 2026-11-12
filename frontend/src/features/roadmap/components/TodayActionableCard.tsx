import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Circle,
  Coffee,
  ChevronRight,
  Clock,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import type { AdaptiveDay } from '../types/adaptive';
import { resolveLearnHrefForTask } from '@/features/learn/services/learnProgressService';
import { cn } from '@/lib/utils';

export interface TodayActionableCardProps {
  todayDay?: AdaptiveDay | null;
  currentWeekNumber?: number;
  currentWeekTitle?: string;
  weekCompletedTasks?: number;
  weekTotalTasks?: number;
  onToggleComplete: (taskId: string) => void;
}

export const TodayActionableCard: React.FC<TodayActionableCardProps> = ({
  todayDay,
  onToggleComplete,
}) => {
  if (!todayDay) {
    return null;
  }

  const { isRestDay, tasks, availableHours, date } = todayDay;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const completedMinutes = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#171D2D]">
      {/* Left: TODAY'S TASK */}
      <div className="p-5 sm:px-6 space-y-3.5 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
            Today&apos;s task
          </span>
          <span className="text-xs font-mono text-[#7C869E] tabular-nums">
            <span className="text-[#00B8A3]">{completedCount}</span> / {tasks.length} topics
          </span>
        </div>

        {isRestDay ? (
          <motion.div
            key={`rest-${date}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="py-6 px-4 rounded-xl bg-[#0D111B] border border-[#192032] flex items-center gap-3 text-xs text-[#94A3B8]"
          >
            <span className="w-8 h-8 rounded-lg bg-[#151C2C] flex items-center justify-center text-[#3B82F6] shrink-0">
              <Coffee className="w-4 h-4" />
            </span>
            <div>
              <div className="font-medium text-[#E2E8F0]">Scheduled Day off</div>
              <div className="text-[11px] text-[#64748B]">Recovery day — no tasks queued.</div>
            </div>
          </motion.div>
        ) : tasks.length === 0 ? (
          <div className="py-5 text-xs text-[#64748B]">No tasks scheduled for this day.</div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, idx) => {
              const isDone = task.status === 'completed';
              const isJudgeBacked = Boolean(
                (task.taskType === 'problem' || task.taskType === 'practice') && task.problemSlug
              );
              const practiceUrl = isJudgeBacked
                ? `/app/practice/${task.problemSlug}?fromRoadmap=adaptive`
                : null;

              return (
                <motion.div
                  key={`${date}-${task.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.04, 0.2) }}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all duration-150',
                    isDone
                      ? 'border-[#00B8A3]/20 bg-[#0B1517]/70'
                      : 'border-[#1B2234] bg-[#121724] hover:bg-[#161D2E] hover:border-[#3B82F6]/35'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isJudgeBacked ? (
                      <span
                        title="Verified automatically upon accepted judge submission"
                        className="shrink-0"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#475569]" />
                        )}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onToggleComplete(task.id)}
                        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                        className="shrink-0 text-[#475569] hover:text-[#00B8A3] transition-colors cursor-pointer"
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <div className="min-w-0">
                      <div
                        className={cn(
                          'text-xs sm:text-[13px] truncate transition-colors',
                          isDone ? 'line-through text-[#64748B]' : 'text-[#EEF2FF] font-medium'
                        )}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                        <span className="truncate">{task.topic}</span>
                        {isJudgeBacked ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3B82F6]/10 text-[#60A5FA] text-[10px]">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Judge</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8B5CF6]/10 text-[#A78BFA] text-[10px]">
                            <BookOpen className="w-2.5 h-2.5" />
                            <span>Study</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[11px] font-mono text-[#7C869E] tabular-nums hidden sm:inline">
                      Est. {task.estimatedMinutes}m
                    </span>
                    {practiceUrl ? (
                      <Link
                        to={practiceUrl}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-all',
                          isDone
                            ? 'bg-[#122625] text-[#00B8A3] border border-[#00B8A3]/25 hover:bg-[#173230]'
                            : 'bg-[#162647] hover:bg-[#1E335E] border border-[#3B82F6]/35 text-[#93C5FD] hover:text-white'
                        )}
                      >
                        <span>{isDone ? 'Review' : 'Solve'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={resolveLearnHrefForTask(task)}
                          className="px-2.5 py-1 rounded-lg border border-[#243B6B] bg-[#152443] hover:bg-[#1C3159] text-xs font-medium text-[#93C5FD] hover:text-white inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Study</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onToggleComplete(task.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                            isDone
                              ? 'border-[#00B8A3]/25 bg-[#0F2422] text-[#00B8A3]'
                              : 'border-[#1E2638] bg-[#141A29] text-[#94A3B8] hover:text-white hover:border-[#3B82F6]/40'
                          )}
                        >
                          {isDone ? 'Done' : 'Complete'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: TODAY'S PROGRESS */}
      <div className="p-5 sm:px-6 space-y-4 text-left flex flex-col justify-between bg-[#0C101A]/40">
        <div className="space-y-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C869E]">
            Today&apos;s progress
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[#94A3B8] py-1">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Topics</span>
              </span>
              <span className="font-mono text-[#E2E8F0] tabular-nums">
                {completedCount} / {tasks.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8] py-1">
              <span className="inline-flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#00B8A3]" />
                <span>Time completed</span>
              </span>
              <span className="font-mono text-[#E2E8F0] tabular-nums">
                {completedMinutes} min
              </span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8] py-1">
              <span>Scheduled</span>
              <span className="font-mono text-[#E2E8F0] tabular-nums">
                {isRestDay ? 'Day off' : `${availableHours}h`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8] py-1">
              <span>Completion</span>
              <span className="font-mono text-[#00B8A3] font-semibold tabular-nums">
                {progressPct}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="w-full h-2 rounded-full bg-[#151B2B] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
