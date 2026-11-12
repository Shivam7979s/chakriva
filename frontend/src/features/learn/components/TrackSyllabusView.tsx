import React, { useState, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import {
  LEARN_TRACKS,
  LEARN_CATEGORY_LABELS,
  getLearnTrackBySlug,
  getQuerySlugForCategory,
  groupTrackModules,
  formatMinutesLabel,
} from '../data/learnCatalog';
import { learnProgressService } from '../services/learnProgressService';
import { CANONICAL_CATALOG_PROBLEMS } from '@/features/roadmap/utils/adaptiveEngine';
import type { LearnProgressState } from '../types/learn';
import { cn } from '@/lib/utils';

export const TrackSyllabusView: React.FC = () => {
  const { trackSlug } = useParams<{ trackSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const track = useMemo(() => getLearnTrackBySlug(trackSlug) || LEARN_TRACKS[0], [trackSlug]);
  const modules = useMemo(() => groupTrackModules(track), [track]);

  const [progress, setProgress] = useState<LearnProgressState>(() =>
    learnProgressService.getState()
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'bookmarked'>('all');
  const [showDifficulty, setShowDifficulty] = useState(true);

  const openParam = searchParams.get('open');
  const expandedModuleIds = useMemo(() => {
    if (openParam === 'none') return new Set<string>();
    if (openParam === 'all') return new Set(modules.map((m) => m.id));
    if (openParam) return new Set(openParam.split(',').filter(Boolean));
    return new Set(modules.slice(0, 2).map((m) => m.id));
  }, [openParam, modules]);

  const setExpandedModules = (nextSet: Set<string>) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextSet.size === 0) {
      nextParams.set('open', 'none');
    } else if (nextSet.size === modules.length) {
      nextParams.set('open', 'all');
    } else {
      nextParams.set('open', Array.from(nextSet).join(','));
    }
    setSearchParams(nextParams, { replace: true });
  };

  const toggleModule = (modId: string) => {
    const next = new Set(expandedModuleIds);
    if (next.has(modId)) next.delete(modId);
    else next.add(modId);
    setExpandedModules(next);
  };

  const handleToggleAll = () => {
    if (expandedModuleIds.size === modules.length) {
      setExpandedModules(new Set());
    } else {
      setExpandedModules(new Set(modules.map((m) => m.id)));
    }
  };

  const handlePickRandom = () => {
    const pending = track.lessons.filter((l) => !progress.completedLessonIds[l.id]);
    const pool = pending.length > 0 ? pending : track.lessons;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      navigate(`/app/learn/${track.slug}/${pick.slug}`);
    }
  };

  const stats = useMemo(
    () => learnProgressService.getTrackCompletion(track, progress),
    [track, progress]
  );

  const difficultyBreakdown = useMemo(() => {
    const counts = {
      foundation: { total: 0, done: 0 },
      intermediate: { total: 0, done: 0 },
      advanced: { total: 0, done: 0 },
    };
    for (const lesson of track.lessons) {
      counts[lesson.difficulty].total += 1;
      if (progress.completedLessonIds[lesson.id]) {
        counts[lesson.difficulty].done += 1;
      }
    }
    return counts;
  }, [track, progress]);

  const quizCount = useMemo(
    () => track.lessons.filter((l) => Boolean(l.microCheck)).length,
    [track]
  );

  const interactiveCount = useMemo(
    () => track.lessons.filter((l) => Boolean(l.interactiveTrace)).length,
    [track]
  );

  const firstPendingLesson = useMemo(
    () => track.lessons.find((l) => !progress.completedLessonIds[l.id]) || track.lessons[0],
    [track, progress]
  );

  const problemBySlug = useMemo(() => {
    const map = new Map<string, (typeof CANONICAL_CATALOG_PROBLEMS)[number]>();
    for (const p of CANONICAL_CATALOG_PROBLEMS) map.set(p.slug, p);
    return map;
  }, []);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules
      .map((mod) => {
        const lessons = mod.lessons.filter((lesson) => {
          const isDone = Boolean(progress.completedLessonIds[lesson.id]);
          const isSaved = Boolean(progress.bookmarkedLessonIds[lesson.id]);
          if (statusFilter === 'pending' && isDone) return false;
          if (statusFilter === 'completed' && !isDone) return false;
          if (statusFilter === 'bookmarked' && !isSaved) return false;
          if (q) {
            const hay = `${lesson.title} ${lesson.summary} ${lesson.moduleTitle}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        return { ...mod, lessons };
      })
      .filter((mod) => mod.lessons.length > 0);
  }, [modules, search, statusFilter, progress]);

  const categoryBackUrl = `/app/learn?open=${getQuerySlugForCategory(track.category)}`;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Prep Hub', href: categoryBackUrl },
        { label: track.shortTitle },
      ]}
    >
      <div className="max-w-6xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        {/* Top Breadcrumb Back Link + Header (Zero Card Icons) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={categoryBackUrl}
              className="inline-flex items-center text-xs text-[#8592A8] hover:text-[#F3F6FF] transition-colors"
            >
              Prep Hub / {LEARN_CATEGORY_LABELS[track.category]} /{' '}
              <strong className="text-[#F3F6FF] font-medium ml-1">{track.shortTitle}</strong>
            </Link>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#152443] border border-[#243B6B] text-[#60A5FA]">
              {track.levelBadge}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F8FAFF]">
                {track.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#8592A8] max-w-2xl leading-relaxed">
                {track.subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] font-mono text-[#7C8BA6]">
                <span>{modules.length} Modules</span>
                <span>·</span>
                <span>{track.lessons.length} Topics</span>
                {quizCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{quizCount} Checks</span>
                  </>
                )}
                {interactiveCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[#60A5FA]">{interactiveCount} Interactive Traces</span>
                  </>
                )}
                <span>·</span>
                <span>{formatMinutesLabel(track.totalMinutes)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/app/learn/${track.slug}/${firstPendingLesson.slug}`}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-white text-xs font-semibold transition-colors"
              >
                Start Focus Mode
              </Link>
              <Link
                to="/app/roadmap"
                className="px-3.5 py-2 rounded-xl border border-[#1B2234] bg-[#0F131D] hover:border-[#2B3754] text-xs font-medium text-[#C3CEE0] hover:text-white transition-colors"
              >
                Plan in Roadmap
              </Link>
            </div>
          </div>
        </div>

        {/* Overall Progress Card */}
        <div className="rounded-2xl border border-[#192033] bg-[#0F131D] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-[#8592A8]">Overall Progress</div>
              <div className="text-lg font-semibold text-[#F8FAFF] tabular-nums">
                {stats.completed} / {stats.total}{' '}
                <span className="text-xs font-mono font-normal text-[#7C8BA6]">
                  ({stats.percent}% completed)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {(['foundation', 'intermediate', 'advanced'] as const).map((tier) => {
                const d = difficultyBreakdown[tier];
                if (d.total === 0) return null;
                return (
                  <span
                    key={tier}
                    className="px-2.5 py-1 rounded-lg border border-[#171D2D] bg-[#0B0E16] text-[11px] capitalize text-[#CBD5E1]"
                  >
                    {tier} <span className="text-[#8592A8]">{d.done}/{d.total}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[#141A29] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE]"
              initial={false}
              animate={{ width: `${stats.percent}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        {/* Syllabus Filter & Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="learn-syllabus-search"
              name="learn-syllabus-search"
              type="text"
              aria-label="Search sheet topics"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics..."
              className="px-3.5 py-1.5 rounded-xl border border-[#192033] bg-[#0F131D] text-xs text-[#F3F6FF] placeholder:text-[#5B6882] focus:outline-none focus:border-[#3B82F6] w-52 sm:w-64"
            />

            <div className="flex items-center gap-1 p-1 rounded-xl border border-[#181F30] bg-[#0B0E16]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'completed', label: 'Done' },
                  { id: 'bookmarked', label: 'Saved' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                    statusFilter === opt.id
                      ? 'bg-[#152443] text-[#F3F6FF]'
                      : 'text-[#7C8BA6] hover:text-[#E2E8F5]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDifficulty((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer',
                showDifficulty
                  ? 'border-[#243B6B] bg-[#152443] text-[#93C5FD]'
                  : 'border-[#192033] bg-[#0F131D] text-[#7C8BA6]'
              )}
            >
              Show Difficulty
            </button>
            <button
              type="button"
              onClick={handlePickRandom}
              className="px-3 py-1.5 rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#2B3754] text-[11px] font-medium text-[#A8B4CA] hover:text-white transition-colors cursor-pointer"
            >
              Pick Random
            </button>
            <button
              type="button"
              onClick={handleToggleAll}
              className="px-3 py-1.5 rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#2B3754] text-[11px] font-medium text-[#A8B4CA] hover:text-white transition-colors cursor-pointer"
            >
              {expandedModuleIds.size === modules.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Hierarchical Module Accordions (Zero Card Icons) */}
        <div className="space-y-3">
          {filteredModules.map((mod) => {
            const isOpen = expandedModuleIds.has(mod.id);
            const modDone = mod.lessons.filter((l) => Boolean(progress.completedLessonIds[l.id])).length;
            const modPct = Math.round((modDone / mod.lessons.length) * 100);

            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-[#192033] bg-[#0F131D] overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleModule(mod.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#131928] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-[#7C8BA6] w-4 text-center shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                    <span className="text-sm font-semibold text-[#F8FAFF] truncate">
                      {mod.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-[#8592A8] tabular-nums">
                      {modDone} / {mod.lessons.length}
                    </span>
                    <div className="hidden sm:block w-20 h-1.5 rounded-full bg-[#141A29] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE]"
                        style={{ width: `${modPct}%` }}
                      />
                    </div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 sm:p-4 border-t border-[#171D2D] bg-[#0B0E16] space-y-2">
                        {mod.lessons.map((lesson) => {
                          const isDone = Boolean(progress.completedLessonIds[lesson.id]);
                          const isSaved = Boolean(progress.bookmarkedLessonIds[lesson.id]);
                          const primarySlug = lesson.linkedProblemSlugs?.[0];
                          const linkedProblem = primarySlug ? problemBySlug.get(primarySlug) : undefined;

                          return (
                            <div
                              key={lesson.id}
                              className={cn(
                                'rounded-xl border px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                                isDone
                                  ? 'bg-[#0C1617] border-[#16302E]'
                                  : 'bg-[#0F131D] border-[#181F30] hover:border-[#29344E]'
                              )}
                            >
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProgress(learnProgressService.toggleLessonCompleted(lesson.id))
                                  }
                                  className={cn(
                                    'mt-1 sm:mt-0 w-3.5 h-3.5 rounded-full border shrink-0 cursor-pointer transition-colors',
                                    isDone
                                      ? 'bg-[#00B8A3] border-[#00B8A3]'
                                      : 'border-[#5B6882] hover:border-[#22D3EE]'
                                  )}
                                  aria-label={`Mark ${lesson.title} complete`}
                                />

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Link
                                      to={`/app/learn/${track.slug}/${lesson.slug}`}
                                      className={cn(
                                        'text-xs sm:text-sm font-medium hover:text-[#60A5FA] transition-colors truncate',
                                        isDone ? 'text-[#94A1B8]' : 'text-[#F3F6FF]'
                                      )}
                                    >
                                      {lesson.title}
                                    </Link>

                                    {showDifficulty && (
                                      <span className="px-2 py-0.5 rounded bg-[#0B0E16] border border-[#1B2234] text-[10px] font-mono capitalize text-[#94A3B8]">
                                        {lesson.difficulty}
                                      </span>
                                    )}

                                    {lesson.microCheck && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#152443] text-[#93C5FD] text-[10px] font-mono">
                                        Quiz
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7C8BA6] mt-0.5">
                                    <span>{lesson.estimatedMinutes} min read</span>
                                    {linkedProblem && (
                                      <>
                                        <span>·</span>
                                        <span className="font-mono text-[#60A5FA]">
                                          {linkedProblem.verniqProblemId}: {linkedProblem.title}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <Link
                                  to={`/app/learn/${track.slug}/${lesson.slug}`}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#243B6B] bg-[#152443] hover:bg-[#1C3159] text-[11px] font-medium text-[#E2E8F5] transition-colors"
                                >
                                  Editorial
                                </Link>

                                {linkedProblem && (
                                  <Link
                                    to={`/app/practice/${linkedProblem.slug}`}
                                    className="px-2.5 py-1.5 rounded-lg border border-[#22D3EE]/30 bg-[#0C2629] hover:bg-[#11353A] text-[11px] font-medium text-[#22D3EE] transition-colors"
                                  >
                                    Solve
                                  </Link>
                                )}

                                <Link
                                  to="/app/notespace"
                                  className="px-2.5 py-1.5 rounded-lg border border-[#181F30] bg-[#0B0E16] hover:border-[#2B3754] text-[11px] font-medium text-[#7C8BA6] hover:text-white transition-colors"
                                >
                                  Notes
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setProgress(learnProgressService.toggleBookmark(lesson.id))
                                  }
                                  className={cn(
                                    'px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer',
                                    isSaved
                                      ? 'border-[#3B82F6]/40 bg-[#152443] text-[#93C5FD]'
                                      : 'border-[#181F30] bg-[#0B0E16] text-[#7C8BA6] hover:text-white hover:border-[#2B3754]'
                                  )}
                                >
                                  {isSaved ? 'Saved' : 'Save'}
                                </button>
                              </div>
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

        {filteredModules.length === 0 && (
          <div className="py-10 text-center rounded-2xl border border-[#192033] bg-[#0F131D] space-y-2">
            <p className="text-sm text-[#8592A8]">No topics match your current filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="text-xs font-mono text-[#60A5FA] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TrackSyllabusView;
