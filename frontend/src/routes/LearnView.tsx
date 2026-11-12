import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
      <div className="max-w-7xl mx-auto text-left text-[#F3F6FF]">
        <h1 className="sr-only">Prep Hub — CHAKRIVA Structured Learning Catalog</h1>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT / MAIN CATALOG COLUMN */}
          <div className="xl:col-span-8 space-y-6">
            <div
              role="tablist"
              aria-label="Prep Hub Categories"
              className="flex items-center gap-1.5 border-b border-[#171D2D] pb-2.5 overflow-x-auto no-scrollbar"
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
                        ? 'text-[#F8FAFF]'
                        : 'text-[#7C8BA6] hover:text-[#D5E1F7]'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="prepHubCategoryPill"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-[#152443] border border-[#3B82F6]/35"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Tab Panel (Matches CHAKRIVA Palette, Zero Card Icons) */}
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
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-sm sm:text-base font-semibold text-[#E2E8F5] tracking-tight">
                          {group.label}
                        </h2>
                        {group.badge && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#152443] text-[#60A5FA] border border-[#243B6B]">
                            {group.badge}
                          </span>
                        )}
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
                                  ? 'border-[#253A63] bg-gradient-to-b from-[#101728] to-[#0B0E16] hover:border-[#3B82F6]/50'
                                  : 'border-[#181F30] bg-[#0F131D] hover:bg-[#131928] hover:border-[#29344E]'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <h3 className="text-sm sm:text-base font-semibold text-[#F8FAFF] group-hover:text-[#93C5FD] transition-colors leading-snug">
                                    {track.title}
                                  </h3>
                                  {inActivePlan && (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#0C2629] text-[#22D3EE]">
                                      Active Roadmap Subject
                                    </span>
                                  )}
                                </div>

                                <span className="px-3 py-1 rounded-full border border-[#212B42] bg-[#0B0E16] group-hover:bg-[#152443] group-hover:border-[#3B82F6]/45 text-[11px] font-medium text-[#C3CEE0] group-hover:text-white transition-colors shrink-0">
                                  Explore
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-[#7C8BA6] pt-2.5 border-t border-[#171D2D]">
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
                                <span className="text-[#94A1B8]">
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

          {/* RIGHT UTILITY RAIL (Zero Card Icons) */}
          <aside className="xl:col-span-4 space-y-4">
            <div className="rounded-2xl border border-[#181F30] bg-[#0B0E16] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#F8FAFF]">Daily Planner</h2>
                <Link
                  to="/app/roadmap"
                  className="text-[11px] font-mono text-[#60A5FA] hover:underline"
                >
                  Open Roadmap
                </Link>
              </div>

              {dailyPlanner && dailyPlanner.day.tasks.length > 0 && !dailyPlanner.day.isRestDay ? (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono text-[#7C8BA6]">
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
                          className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border border-[#171D2D] bg-[#0F131D] hover:border-[#3B82F6]/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full shrink-0',
                                done ? 'bg-[#00B8A3]' : 'bg-[#475569]'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs truncate',
                                done ? 'line-through text-[#6D7B94]' : 'text-[#E2E8F5]'
                              )}
                            >
                              {task.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#60A5FA] shrink-0">
                            {task.estimatedMinutes}m
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <Link
                    to="/app/roadmap/adaptive"
                    className="w-full py-2 rounded-xl border border-dashed border-[#243B6B] bg-[#0F172A]/60 hover:bg-[#152443] text-xs font-medium text-[#93C5FD] flex items-center justify-center transition-colors"
                  >
                    Manage Adaptive Schedule
                  </Link>
                </div>
              ) : (
                <div className="py-5 px-4 rounded-xl border border-[#171D2D] bg-[#0F131D] text-center space-y-3">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-[#E2E8F5]">No tasks for today</div>
                    <p className="text-[11px] text-[#7C8BA6] leading-relaxed">
                      Add tracks or build an Adaptive Roadmap to schedule daily coding &amp; study tasks here.
                    </p>
                  </div>
                  <Link
                    to="/app/roadmap"
                    className="w-full py-2 rounded-xl border border-dashed border-[#253352] hover:border-[#3B82F6]/60 bg-[#0B0E16] hover:bg-[#131B2E] text-xs font-medium text-[#C3CEE0] hover:text-white inline-flex items-center justify-center transition-colors"
                  >
                    Add tasks
                  </Link>
                </div>
              )}
            </div>

            {resumeLesson && (
              <div className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#101522] to-[#0B0E16] p-5 space-y-3">
                <div className="text-[11px] font-mono text-[#22D3EE]">Resume Focus Mode</div>
                <div>
                  <div className="text-[11px] text-[#7C8BA6]">{resumeLesson.track.shortTitle}</div>
                  <div className="text-sm font-medium text-[#F8FAFF] mt-0.5 line-clamp-2">
                    {resumeLesson.lesson.title}
                  </div>
                </div>
                <Link
                  to={`/app/learn/${resumeLesson.track.slug}/${resumeLesson.lesson.slug}`}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#243B6B] bg-[#152443] hover:bg-[#1C3159] text-xs font-medium text-[#F3F6FF] inline-flex items-center justify-center transition-colors"
                >
                  Continue Lesson
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
