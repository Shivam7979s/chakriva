import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import {
  CONTEST_FILTER_TABS,
  CONTESTS_CATALOG,
  formatCountdown,
  formatScheduleCountdown,
  getNextScheduledStartMs,
  getRemainingSeconds,
  resolveContestSummary,
} from '@/features/contests/data/contestsCatalog';
import {
  readActiveContestSession,
  readContestSavedIds,
  writeActiveContestSession,
  writeContestSavedIds,
} from '@/features/contests/utils/contestSessionStorage';
import type {
  ActiveContestSession,
  ContestFilterTabId,
} from '@/features/contests/types/contest';

interface TopRankEntry {
  rank: number;
  id: string;
  username: string;
  fullName: string;
  score: number;
  solvedCount: number;
}

function resolveTabQuery(raw: string | null): ContestFilterTabId {
  if (!raw) return 'all';
  const match = CONTEST_FILTER_TABS.find((t) => t.id === raw);
  return match ? match.id : 'all';
}

export const ContestsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTabQuery(searchParams.get('tab'));
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuth();
  const { problems } = useProblems();
  const { progressMap } = useUserProgress();

  const loadedUserRef = useRef<string>(user?.id || 'guest');

  const [registeredIds, setRegisteredIds] = useState<Record<string, boolean>>(() =>
    readContestSavedIds(user?.id)
  );
  const [activeSession, setActiveSession] = useState<ActiveContestSession | null>(() =>
    readActiveContestSession(user?.id)
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [topRankings, setTopRankings] = useState<TopRankEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState<boolean>(true);

  useEffect(() => {
    const nextUserKey = user?.id || 'guest';
    if (loadedUserRef.current !== nextUserKey) {
      loadedUserRef.current = nextUserKey;
      setRegisteredIds(readContestSavedIds(user?.id));
      setActiveSession(readActiveContestSession(user?.id));
    }
  }, [user?.id]);

  // 1-second timer tick for active virtual session, or 60-second refresh for schedule countdowns
  useEffect(() => {
    setNowMs(Date.now());
    const intervalMs = activeSession ? 1000 : 60_000;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [activeSession]);

  // Fetch top global engineers from Supabase profiles (mirroring LeaderboardView)
  useEffect(() => {
    let cancelled = false;
    async function loadTopRankings() {
      if (!isSupabaseConfigured()) {
        setTopRankings([]);
        setRankingsLoading(false);
        return;
      }
      try {
        setRankingsLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, score, problems_solved_count')
          .order('score', { ascending: false })
          .limit(7);

        if (!cancelled && !error && data) {
          setTopRankings(
            data.map((row: any, idx: number) => ({
              rank: idx + 1,
              id: row.id,
              username: row.username || 'engineer',
              fullName: row.full_name || row.username || 'Engineer',
              score: Number(row.score || 0),
              solvedCount: Number(row.problems_solved_count || 0),
            }))
          );
        }
      } catch {
        if (!cancelled) setTopRankings([]);
      } finally {
        if (!cancelled) setRankingsLoading(false);
      }
    }
    loadTopRankings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectTab = (tabId: ContestFilterTabId) => {
    const next = new URLSearchParams(searchParams);
    if (tabId === 'all') {
      next.delete('tab');
    } else {
      next.set('tab', tabId);
    }
    setSearchParams(next, { replace: true });
  };

  const resolvedContests = useMemo(
    () =>
      CONTESTS_CATALOG.map((contest) =>
        resolveContestSummary(contest, problems, progressMap)
      ),
    [problems, progressMap]
  );

  const featuredContests = useMemo(
    () => resolvedContests.filter((c) => c.definition.featured),
    [resolvedContests]
  );

  const tabCounts = useMemo(() => {
    const counts: Record<ContestFilterTabId, number> = {
      all: resolvedContests.length,
      featured: 0,
      virtual: 0,
      oa_sprint: 0,
      topic_drill: 0,
      my_contests: 0,
    };
    for (const item of resolvedContests) {
      const def = item.definition;
      if (def.featured) counts.featured += 1;
      counts[def.category] += 1;
      if (
        registeredIds[def.id] ||
        item.solvedCount > 0 ||
        item.attemptedCount > 0 ||
        activeSession?.contestId === def.id
      ) {
        counts.my_contests += 1;
      }
    }
    return counts;
  }, [resolvedContests, registeredIds, activeSession]);

  const filteredContests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resolvedContests.filter((entry) => {
      const def = entry.definition;
      if (activeTab === 'featured') {
        if (!def.featured) return false;
      } else if (activeTab === 'my_contests') {
        const participated =
          Boolean(registeredIds[def.id]) ||
          entry.solvedCount > 0 ||
          entry.attemptedCount > 0 ||
          activeSession?.contestId === def.id;
        if (!participated) return false;
      } else if (activeTab !== 'all' && def.category !== activeTab) {
        return false;
      }

      if (!q) return true;
      const problemTitles = entry.resolvedProblems.map((p) => p.problem.title).join(' ');
      const haystack = `${def.title} ${def.subtitle} ${def.description} ${problemTitles}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [resolvedContests, activeTab, registeredIds, activeSession, searchQuery]);

  const myStats = useMemo(() => {
    const uniqueSolved = new Set<string>();
    let registeredCount = 0;
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;

    for (const entry of resolvedContests) {
      if (registeredIds[entry.definition.id]) registeredCount += 1;
      totalPointsEarned += entry.earnedPoints;
      totalPointsPossible += entry.totalPoints;
      for (const prob of entry.resolvedProblems) {
        if (prob.status === 'solved') {
          uniqueSolved.add(prob.problem.id);
        }
      }
    }

    return {
      registeredCount,
      solvedProblems: uniqueSolved.size,
      totalPointsEarned,
      totalPointsPossible,
      completedRounds: resolvedContests.filter((c) => c.isCompleted).length,
    };
  }, [resolvedContests, registeredIds]);

  const activeContestSummary = useMemo(
    () =>
      activeSession
        ? resolvedContests.find((c) => c.definition.id === activeSession.contestId) || null
        : null,
    [activeSession, resolvedContests]
  );

  const remainingSeconds = useMemo(
    () => getRemainingSeconds(activeSession, nowMs),
    [activeSession, nowMs]
  );

  const handleToggleRegister = (contestId: string) => {
    const next = { ...registeredIds, [contestId]: !registeredIds[contestId] };
    setRegisteredIds(next);
    writeContestSavedIds(next, user?.id);
  };

  const handleStartVirtual = (contestId: string, durationMinutes: number, openRound = false) => {
    const session: ActiveContestSession = {
      contestId,
      startedAtMs: Date.now(),
      durationMinutes,
    };
    setNowMs(session.startedAtMs);
    setActiveSession(session);
    writeActiveContestSession(session, user?.id);
    if (openRound) {
      navigate(`/app/contests/${contestId}`);
    }
  };

  const handleEndSession = () => {
    setActiveSession(null);
    writeActiveContestSession(null, user?.id);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Contests' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        {/* Compact Header */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFF] tracking-tight">
                CHAKRIVA Contests
              </h1>
              <p className="text-xs sm:text-sm text-[#8E9BB3]">
                Weekly & Biweekly rounds — register for upcoming slots or start any round in virtual mode anytime.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/leaderboard"
                className="px-3.5 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:bg-[#141A29] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                to="/app/practice"
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors"
              >
                Practice
              </Link>
            </div>
          </div>

          {/* Active Virtual Session Banner (when running) */}
          {activeContestSummary && activeSession && (
            <div className="mt-5 pt-4 border-t border-[#171D2D]">
              <div className="rounded-xl border border-[#3B82F6]/40 bg-[#101C33] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-[#F8FAFF]">
                    Virtual Session: {activeContestSummary.definition.title}
                  </span>
                  <span className="font-mono font-semibold text-[#22D3EE] tabular-nums">
                    {remainingSeconds > 0 ? formatCountdown(remainingSeconds) : 'Time Expired'}
                  </span>
                  <span className="text-[#9BA8C2] tabular-nums">
                    {activeContestSummary.solvedCount}/{activeContestSummary.totalCount} solved •{' '}
                    {activeContestSummary.earnedPoints} pts
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/app/contests/${activeContestSummary.definition.id}`}
                    className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors"
                  >
                    Enter Round
                  </Link>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="px-3 py-1.5 rounded-lg border border-[#212B42] bg-[#0B0E16] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors cursor-pointer"
                  >
                    End
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* LeetCode-style Featured Weekly & Biweekly Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featuredContests.map((entry) => {
            const def = entry.definition;
            const isRegistered = Boolean(registeredIds[def.id]);
            const isRunningHere = activeSession?.contestId === def.id;
            const startsIn = def.scheduleCadence
              ? formatScheduleCountdown(getNextScheduledStartMs(def.scheduleCadence, nowMs), nowMs)
              : null;

            return (
              <div
                key={def.id}
                className={cn(
                  'rounded-2xl border bg-[#0F131D] p-5 sm:p-6 flex flex-col justify-between gap-5 transition-colors',
                  isRunningHere
                    ? 'border-[#3B82F6]/50'
                    : 'border-[#181F30] hover:border-[#26324B]'
                )}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#22D3EE] tabular-nums">
                      {startsIn ? `Starts in ${startsIn}` : `${def.durationMinutes} min`}
                    </span>
                    <span className="text-[#7C8BA6] tabular-nums">
                      {def.durationMinutes} mins • {entry.totalCount} problems • {entry.totalPoints} pts
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Link
                      to={`/app/contests/${def.id}`}
                      className="text-base sm:text-lg font-semibold text-[#F8FAFF] hover:text-[#93C5FD] transition-colors block"
                    >
                      {def.title}
                    </Link>
                    <p className="text-xs text-[#8E9BB3] leading-relaxed">
                      {def.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#171D2D]">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleRegister(def.id)}
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
                      <Link
                        to={`/app/contests/${def.id}`}
                        className="px-3.5 py-2 rounded-xl bg-[#152443] border border-[#3B82F6]/40 text-xs font-semibold text-[#F8FAFF] tabular-nums"
                      >
                        Resume ({formatCountdown(remainingSeconds)})
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartVirtual(def.id, def.durationMinutes, true)}
                        className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
                      >
                        Start Virtual
                      </button>
                    )}
                  </div>

                  <Link
                    to={`/app/contests/${def.id}`}
                    className="text-xs font-medium text-[#93C5FD] hover:text-[#F8FAFF] transition-colors"
                  >
                    Open Round
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main 2-Column Hub: Left Contest List, Right Global Ranking & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Primary Column: All / Past / OA Rounds */}
          <section className="lg:col-span-8 rounded-2xl border border-[#181F30] bg-[#0F131D] overflow-hidden">
            {/* Tabs & Search */}
            <div className="p-4 border-b border-[#181F30] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Contest Filters"
                className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 xl:pb-0"
              >
                {CONTEST_FILTER_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = tabCounts[tab.id] || 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSelectTab(tab.id)}
                      className={cn(
                        'relative px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5',
                        isActive ? 'text-[#F8FAFF]' : 'text-[#7C8BA6] hover:text-[#D5E1F7]'
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="contestsCategoryPill"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          className="absolute inset-0 rounded-xl bg-[#152443] border border-[#3B82F6]/35"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                      <span className="relative z-10 font-mono text-[10px] text-[#94A3B8] tabular-nums">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              <input
                id="contests-search-input"
                name="contests-search-input"
                type="text"
                aria-label="Search contests"
                placeholder="Search contests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full xl:w-56 bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl px-3.5 py-2 text-xs text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none transition-colors"
              />
            </div>

            {/* LeetCode-style Contest Table Rows */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${searchQuery}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="divide-y divide-[#171D2D]"
              >
                {filteredContests.length > 0 ? (
                  filteredContests.map((entry) => {
                    const def = entry.definition;
                    const isRunningHere = activeSession?.contestId === def.id;
                    return (
                      <div
                        key={def.id}
                        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#131A29]/70 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/app/contests/${def.id}`}
                              className="text-sm font-semibold text-[#F8FAFF] hover:text-[#93C5FD] transition-colors"
                            >
                              {def.title}
                            </Link>
                            {entry.isCompleted && (
                              <span className="text-[11px] font-medium text-[#22D3EE]">
                                Completed
                              </span>
                            )}
                            {registeredIds[def.id] && !entry.isCompleted && (
                              <span className="text-[11px] text-[#93C5FD]">Registered</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#7C8BA6]">
                            <span>{def.subtitle}</span>
                            <span>•</span>
                            <span className="tabular-nums">{def.durationMinutes} min</span>
                            <span>•</span>
                            <span>{def.difficultyLevel}</span>
                            {entry.solvedCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-[#22D3EE] tabular-nums">
                                  {entry.solvedCount}/{entry.totalCount} solved ({entry.earnedPoints}/
                                  {entry.totalPoints} pts)
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isRunningHere ? (
                            <Link
                              to={`/app/contests/${def.id}`}
                              className="px-3 py-1.5 rounded-lg bg-[#152443] border border-[#3B82F6]/40 text-xs font-medium text-[#F8FAFF] tabular-nums"
                            >
                              {formatCountdown(remainingSeconds)}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartVirtual(def.id, def.durationMinutes, true)}
                              className="px-3 py-1.5 rounded-lg bg-[#0B0E16] border border-[#212B42] hover:border-[#3B82F6]/45 text-xs font-medium text-[#D5E1F7] transition-colors cursor-pointer"
                            >
                              Virtual
                            </button>
                          )}

                          <Link
                            to={`/app/contests/${def.id}`}
                            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors"
                          >
                            Enter
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-sm font-medium text-[#F8FAFF]">
                      No contests match this filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTab('all');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
                    >
                      Show All Contests
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          {/* Right Rail: Global Ranking & My Contest Stats */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Global Ranking Card */}
            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#F8FAFF]">Global Ranking</h2>
                <Link
                  to="/leaderboard"
                  className="text-xs font-medium text-[#93C5FD] hover:text-[#F8FAFF] transition-colors"
                >
                  View all
                </Link>
              </div>

              {rankingsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((row) => (
                    <div
                      key={row}
                      className="h-11 rounded-xl bg-[#0B0E16] border border-[#171D2D]"
                    />
                  ))}
                </div>
              ) : topRankings.length > 0 ? (
                <div className="space-y-1.5">
                  {topRankings.map((entry) => {
                    const isCurrentUser = Boolean(user?.id && entry.id === user.id);
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          'rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3',
                          isCurrentUser
                            ? 'bg-[#121D34]/75 border-[#3B82F6]/40'
                            : 'bg-[#0B0E16] border-[#171D2D]'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              'text-xs font-mono w-5 tabular-nums shrink-0',
                              entry.rank <= 3 ? 'text-[#22D3EE] font-semibold' : 'text-[#7C8BA6]'
                            )}
                          >
                            {entry.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#F8FAFF] truncate">
                              {entry.fullName}
                            </div>
                            <div className="text-[11px] text-[#7C8BA6] truncate">
                              @{entry.username}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-semibold text-[#93C5FD] tabular-nums">
                            {entry.score}
                          </div>
                          <div className="text-[10px] text-[#64748B] tabular-nums">
                            {entry.solvedCount} solved
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-[#171D2D] bg-[#0B0E16] p-4 space-y-2">
                  <p className="text-xs text-[#8E9BB3]">
                    Connect Supabase or sign in to view live standings.
                  </p>
                  <Link
                    to="/leaderboard"
                    className="inline-block text-xs font-medium text-[#93C5FD] hover:text-[#F8FAFF]"
                  >
                    Open Leaderboard
                  </Link>
                </div>
              )}
            </section>

            {/* My Contest Summary Card */}
            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#F8FAFF]">My Contest Summary</h2>

              <div className="space-y-2">
                <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#8E9BB3]">Registered Rounds</span>
                  <span className="font-mono font-semibold text-[#F8FAFF] tabular-nums">
                    {myStats.registeredCount}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#8E9BB3]">Contest Points Earned</span>
                  <span className="font-mono font-semibold text-[#22D3EE] tabular-nums">
                    {myStats.totalPointsEarned} / {myStats.totalPointsPossible}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#8E9BB3]">Problems Solved</span>
                  <span className="font-mono font-semibold text-[#93C5FD] tabular-nums">
                    {myStats.solvedProblems}
                  </span>
                </div>
                <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#8E9BB3]">Completed Contests</span>
                  <span className="font-mono font-semibold text-[#F8FAFF] tabular-nums">
                    {myStats.completedRounds} / {resolvedContests.length}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContestsView;
