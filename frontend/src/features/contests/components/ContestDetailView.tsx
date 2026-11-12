import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
import { cn } from '@/lib/utils';
import {
  formatCountdown,
  getContestById,
  getNextScheduledStartMs,
  getRemainingSeconds,
  formatScheduleCountdown,
  resolveContestSummary,
} from '../data/contestsCatalog';
import {
  readActiveContestSession,
  readContestSavedIds,
  writeActiveContestSession,
  writeContestSavedIds,
} from '../utils/contestSessionStorage';
import type { ActiveContestSession } from '../types/contest';

export const ContestDetailView: React.FC = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const { user } = useAuth();
  const { problems } = useProblems();
  const { progressMap } = useUserProgress();

  const contest = useMemo(() => getContestById(contestId), [contestId]);

  const [savedIds, setSavedIds] = useState<Record<string, boolean>>(() =>
    readContestSavedIds(user?.id)
  );
  const [activeSession, setActiveSession] = useState<ActiveContestSession | null>(() =>
    readActiveContestSession(user?.id)
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setSavedIds(readContestSavedIds(user?.id));
    setActiveSession(readActiveContestSession(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!activeSession) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const summary = useMemo(
    () => (contest ? resolveContestSummary(contest, problems, progressMap) : null),
    [contest, problems, progressMap]
  );

  if (!contest || !summary) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: 'CHAKRIVA', href: '/app/home' },
          { label: 'Contests', href: '/app/contests' },
          { label: 'Not Found' },
        ]}
      >
        <div className="max-w-5xl mx-auto rounded-2xl border border-[#181F30] bg-[#0F131D] p-8 space-y-3 text-left">
          <h1 className="text-lg font-semibold text-[#F8FAFF]">Contest Not Found</h1>
          <p className="text-xs sm:text-sm text-[#8E9BB3]">
            This contest round does not exist or may have moved.
          </p>
          <Link
            to="/app/contests"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors"
          >
            Back to Contests
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isRunningHere = activeSession?.contestId === contest.id;
  const isRegistered = Boolean(savedIds[contest.id]);
  const remainingSeconds = isRunningHere ? getRemainingSeconds(activeSession, nowMs) : 0;
  const progressPercent =
    summary.totalCount > 0 ? Math.round((summary.solvedCount / summary.totalCount) * 100) : 0;
  const nextUnsolved = summary.resolvedProblems.find((p) => p.status !== 'solved');

  const scheduledStartsIn = contest.scheduleCadence
    ? formatScheduleCountdown(getNextScheduledStartMs(contest.scheduleCadence, nowMs), nowMs)
    : null;

  const handleToggleRegister = () => {
    const next = { ...savedIds, [contest.id]: !savedIds[contest.id] };
    setSavedIds(next);
    writeContestSavedIds(next, user?.id);
  };

  const handleStartVirtual = () => {
    const session: ActiveContestSession = {
      contestId: contest.id,
      startedAtMs: Date.now(),
      durationMinutes: contest.durationMinutes,
    };
    setNowMs(session.startedAtMs);
    setActiveSession(session);
    writeActiveContestSession(session, user?.id);
  };

  const handleEndVirtual = () => {
    setActiveSession(null);
    writeActiveContestSession(null, user?.id);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Contests', href: '/app/contests' },
        { label: contest.title },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-5 text-left text-[#F3F6FF]">
        <div>
          <Link
            to="/app/contests"
            className="text-xs font-medium text-[#7C8BA6] hover:text-[#F8FAFF] transition-colors"
          >
            Back to Contests
          </Link>
        </div>

        {/* Contest Header */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFF] tracking-tight">
                  {contest.title}
                </h1>
                <span className="text-xs font-mono text-[#93C5FD] px-2.5 py-0.5 rounded-full bg-[#0B0E16] border border-[#1B2234] tabular-nums">
                  {contest.durationMinutes} min
                </span>
                {scheduledStartsIn && (
                  <span className="text-xs font-mono text-[#7C8BA6] tabular-nums">
                    Next live window in {scheduledStartsIn}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#8E9BB3] max-w-2xl leading-relaxed">
                {contest.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleRegister}
                className={cn(
                  'px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer',
                  isRegistered
                    ? 'bg-[#10203A] border-[#22D3EE]/35 text-[#22D3EE]'
                    : 'bg-[#0B0E16] border-[#212B42] text-[#D5E1F7] hover:border-[#3B82F6]/40'
                )}
              >
                {isRegistered ? 'Registered' : 'Register'}
              </button>

              {isRunningHere ? (
                <button
                  type="button"
                  onClick={handleEndVirtual}
                  className="px-4 py-2 rounded-xl bg-[#152443] border border-[#3B82F6]/45 text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer tabular-nums"
                >
                  {remainingSeconds > 0
                    ? `Virtual Active (${formatCountdown(remainingSeconds)}) • End`
                    : 'Time Expired • End'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartVirtual}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
                >
                  Start Virtual Contest
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Main 2-Column Round Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LeetCode-style Problems Table */}
          <section className="lg:col-span-8 rounded-2xl border border-[#181F30] bg-[#0F131D] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#181F30] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#F8FAFF]">Problem List</h2>
              <span className="text-xs font-mono text-[#7C8BA6] tabular-nums">
                {summary.totalCount} problems • {summary.totalPoints} pts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#171D2D] text-[11px] font-medium text-[#7C8BA6]">
                    <th className="py-3 pl-5 pr-3 w-14">#</th>
                    <th className="py-3 px-3">Title</th>
                    <th className="py-3 px-3 hidden sm:table-cell">Difficulty</th>
                    <th className="py-3 px-3 text-right">Score</th>
                    <th className="py-3 px-3 text-right">Status</th>
                    <th className="py-3 pl-3 pr-5 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#171D2D]">
                  {summary.resolvedProblems.map((item) => {
                    const topic = item.problem.tags?.[0] || item.problem.domain || 'Algorithms';
                    return (
                      <tr
                        key={item.problem.slug}
                        className="hover:bg-[#131A29] transition-colors"
                      >
                        <td className="py-3.5 pl-5 pr-3 text-xs font-mono text-[#60A5FA]">
                          {item.label}
                        </td>
                        <td className="py-3.5 px-3">
                          <Link
                            to={`/app/practice/${item.problem.slug}`}
                            className="text-xs sm:text-sm font-medium text-[#F8FAFF] hover:text-[#93C5FD] transition-colors block"
                          >
                            {item.problem.title}
                          </Link>
                          <span className="text-[11px] text-[#7C8BA6]">{topic}</span>
                        </td>
                        <td className="py-3.5 px-3 hidden sm:table-cell text-xs capitalize text-[#9BA8C2]">
                          {item.problem.difficulty}
                        </td>
                        <td className="py-3.5 px-3 text-right text-xs font-mono text-[#D5E1F7] tabular-nums">
                          {item.points}
                        </td>
                        <td className="py-3.5 px-3 text-right text-xs font-medium">
                          <span
                            className={cn(
                              item.status === 'solved'
                                ? 'text-[#22D3EE]'
                                : item.status === 'attempted'
                                ? 'text-[#93C5FD]'
                                : 'text-[#64748B]'
                            )}
                          >
                            {item.status === 'solved'
                              ? 'Solved'
                              : item.status === 'attempted'
                              ? 'Attempted'
                              : 'Todo'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <Link
                            to={`/app/practice/${item.problem.slug}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0B0E16] border border-[#1F273B] hover:border-[#3B82F6]/45 text-[11px] font-medium text-[#D5E1F7] transition-colors"
                          >
                            {item.status === 'solved' ? 'Review' : 'Solve'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Rail: Score & Contest Rules */}
          <aside className="lg:col-span-4 space-y-4">
            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#F8FAFF]">Round Progress</h2>
                <span className="text-xs font-mono font-semibold text-[#22D3EE] tabular-nums">
                  {summary.earnedPoints} / {summary.totalPoints} pts
                </span>
              </div>

              <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-[#9BA8C2]">Problems Solved</span>
                  <span className="font-mono font-semibold text-[#F8FAFF]">
                    {summary.solvedCount} / {summary.totalCount}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#171D2D] overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {nextUnsolved ? (
                <Link
                  to={`/app/practice/${nextUnsolved.problem.slug}`}
                  className="block text-center w-full px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors"
                >
                  Next Problem: {nextUnsolved.label} ({nextUnsolved.points} pts)
                </Link>
              ) : (
                <Link
                  to="/leaderboard"
                  className="block text-center w-full px-4 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors"
                >
                  View Leaderboard
                </Link>
              )}
            </section>

            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#F8FAFF]">Scoring & Rules</h2>
              <ul className="space-y-2 text-xs text-[#8E9BB3] leading-relaxed">
                <li>• Problems carry scaled point values (3, 4, 5, 6 pts) based on difficulty.</li>
                <li>• Virtual sessions run a strict {contest.durationMinutes}-minute countdown timer.</li>
                <li>• Points are credited automatically once your submission passes the code judge.</li>
                <li>• Re-open any solved problem later for complexity optimization or mentor review.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContestDetailView;

