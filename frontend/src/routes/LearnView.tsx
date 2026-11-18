import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import {
  LEARN_TRACKS,
  PREP_HUB_TABS,
  resolveCategoryFromQuery,
  getQuerySlugForCategory,
  groupTrackModules,
  getLearnTrackBySlug,
  getLessonInTrack,
  formatMinutesLabel,
} from '@/features/learn/data/learnCatalog';
import {
  learnProgressService,
  resolveLearnHrefForTask,
} from '@/features/learn/services/learnProgressService';
import { adaptiveRoadmapService } from '@/features/roadmap/services/adaptiveRoadmapService';
import type { LearnTrack, LearnTrackCategory } from '@/features/learn/types/learn';
import { cn } from '@/lib/utils';

export const LearnView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory: LearnTrackCategory = resolveCategoryFromQuery(
    searchParams.get('open')
  );

  const learnState = useMemo(() => learnProgressService.getState(), []);
  const activeRoadmap = useMemo(() => adaptiveRoadmapService.getActiveRoadmap(), []);

  const handleSelectTab = (cat: LearnTrackCategory) => {
    const next = new URLSearchParams(searchParams);
    next.set('open', getQuerySlugForCategory(cat));
    setSearchParams(next, { replace: true });
  };

  const sectionGroups = useMemo(() => {
    const inTab = LEARN_TRACKS.filter((t) => t.category === activeCategory);
    const map = new Map<
      string,
      { label: string; badge?: string; tracks: LearnTrack[] }
    >();
    for (const track of inTab) {
      const existing = map.get(track.sectionLabel);
      if (existing) {
        existing.tracks.push(track);
      } else {
        map.set(track.sectionLabel, {
          label: track.sectionLabel,
          badge: track.sectionBadge,
          tracks: [track],
        });
      }
    }
    return Array.from(map.values());
  }, [activeCategory]);

  const dailyPlanner = useMemo(() => {
    if (!activeRoadmap) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    let matchedWeek = activeRoadmap.weeks[0];
    let matchedDay = matchedWeek?.days.find((d) => !d.isRestDay) || matchedWeek?.days[0];

    for (const week of activeRoadmap.weeks) {
      const exact = week.days.find((d) => d.date === todayStr);
      if (exact) {
        matchedWeek = week;
        matchedDay = exact;
        break;
      }
    }

    if (!matchedDay) return null;
    return {
      planTitle: activeRoadmap.title,
      weekNumber: matchedWeek?.weekNumber || 1,
      day: matchedDay,
    };
  }, [activeRoadmap]);

  const resumeLesson = useMemo(() => {
    if (!learnState.lastVisitedTrackSlug) return null;
    const track = getLearnTrackBySlug(learnState.lastVisitedTrackSlug);
    if (!track) return null;
    const lesson = getLessonInTrack(track, learnState.lastVisitedLessonSlug);
    return { track, lesson };
  }, [learnState]);

  const roadmapSubjectIds = useMemo(
    () => new Set(activeRoadmap?.profile?.selectedSubjects || []),
    [activeRoadmap]
  );

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Prep Hub' },
      ]}
    >
      <div className="max-w-7xl mx-auto text-left text-white">
        {/* Visible Page Header (H1) */}
        <div className="mb-6 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Prep Hub
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Structured curriculum, algorithmic problem patterns, and core CS fundamentals.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT / MAIN CATALOG COLUMN */}
          <div className="xl:col-span-8 space-y-6">
            <div
              role="tablist"
              aria-label="Prep Hub Categories"
              className="flex items-center gap-1.5 border-b border-white/[0.08] pb-2.5 overflow-x-auto no-scrollbar"
            >
              {PREP_HUB_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectTab(tab.id)}
                    className={cn(
                      'relative px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer shrink-0',
                      isActive
                        ? 'text-[#00d2ff] font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="prepHubCategoryPill"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-[#002B36] border border-[#00d2ff]/30 shadow-[0_0_12px_rgba(0,210,255,0.15)]"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Tab Panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                role="tabpanel"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-7"
              >
                {sectionGroups.map((group) => {
                  const gridColsClass =
                    group.tracks.length === 1
                      ? 'grid-cols-1'
                      : group.tracks.length >= 3
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      : 'grid-cols-1 md:grid-cols-2';

                  return (
                    <section key={group.label} className="space-y-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          {group.label}
                        </h2>
                      </div>

                      <div className={cn('grid gap-4', gridColsClass)}>
                        {group.tracks.map((track) => {
                          const modules = groupTrackModules(track);
                          const quizCount = track.lessons.filter((l) => Boolean(l.microCheck)).length;
                          const inActivePlan = Boolean(
                            track.subjectId && roadmapSubjectIds.has(track.subjectId)
                          );

                          return (
                            <Link
                              key={track.id}
                              to={`/app/learn/${track.slug}`}
                              className={cn(
                                'group rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-150',
                                inActivePlan
                                  ? 'border-blue-500/30 bg-gradient-to-b from-[#101728] to-[#0A0E17] hover:border-blue-500/50'
                                  : 'border-white/[0.08] bg-[#0A0E17] hover:bg-[#101522] hover:border-white/20'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                                    {track.title}
                                  </h3>
                                </div>

                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all shrink-0">
                                  <span>Explore</span>
                                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-zinc-400 pt-2.5 border-t border-white/[0.06]">
                                <span>{modules.length} Modules</span>
                                <span>·</span>
                                <span>{track.lessons.length} Topics</span>
                                {quizCount > 0 && (
                                  <>
                                    <span>·</span>
                                    <span>{quizCount} Quizzes</span>
                                  </>
                                )}
                                <span>·</span>
                                <span className="text-zinc-300">
                                  {formatMinutesLabel(track.totalMinutes)}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT UTILITY RAIL */}
          <aside className="xl:col-span-4 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A0E17] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h2 className="text-sm font-bold text-white tracking-tight">Daily Planner</h2>
                <Link
                  to="/app/roadmap"
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium shrink-0"
                  title="Open full roadmap"
                >
                  <span>Open Roadmap</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>

              {dailyPlanner && dailyPlanner.day.tasks.length > 0 && !dailyPlanner.day.isRestDay ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-mono text-zinc-400">
                    Week {dailyPlanner.weekNumber} · {dailyPlanner.day.date}
                  </div>
                  <div className="space-y-2">
                    {dailyPlanner.day.tasks.slice(0, 4).map((task) => {
                      const done = task.status === 'completed';
                      const href =
                        task.taskType === 'problem' && task.problemSlug
                          ? `/app/practice/${task.problemSlug}?fromRoadmap=adaptive`
                          : resolveLearnHrefForTask(task);
                      return (
                        <Link
                          key={task.id}
                          to={href}
                          className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-[#0D121F]/80 hover:bg-[#131A2B] hover:border-cyan-500/30 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full shrink-0',
                                done ? 'bg-emerald-400' : 'bg-zinc-600'
                              )}
                            />
                            <span
                              className={cn(
                                'truncate font-medium',
                                done ? 'line-through text-zinc-500' : 'text-zinc-200'
                              )}
                            >
                              {task.title}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-cyan-400 shrink-0">
                            {task.estimatedMinutes}m
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <Link
                    to="/app/roadmap/adaptive"
                    className="w-full py-2.5 rounded-xl border border-white/10 bg-[#0F172A]/60 hover:bg-[#152443] text-xs font-medium text-cyan-300 hover:text-white flex items-center justify-center transition-all"
                  >
                    Manage Adaptive Schedule
                  </Link>
                </div>
              ) : (
                <div className="py-5 px-4 rounded-xl border border-white/[0.06] bg-[#0D121F]/60 text-center space-y-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-white">No tasks for today</div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Add tracks or build an Adaptive Roadmap to schedule daily coding &amp; study tasks here.
                    </p>
                  </div>
                  <Link
                    to="/app/roadmap"
                    className="w-full py-2.5 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-[#0A0E17] hover:bg-white/[0.06] text-xs font-medium text-zinc-300 hover:text-white inline-flex items-center justify-center transition-all"
                  >
                    Add tasks
                  </Link>
                </div>
              )}
            </div>

            {resumeLesson && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0A0E17] p-5 space-y-3.5">
                <div>
                  <span className="text-xs text-zinc-400">{resumeLesson.track.shortTitle}</span>
                  <h3 className="text-base font-semibold text-white mt-0.5 line-clamp-2 tracking-tight">
                    {resumeLesson.lesson.title}
                  </h3>
                </div>
                <Link
                  to={`/app/learn/${resumeLesson.track.slug}/${resumeLesson.lesson.slug}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all"
                >
                  <span>Continue Lesson</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LearnView;
