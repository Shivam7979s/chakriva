import React, { useState, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Search,
  Shuffle,
  ChevronsUpDown,
  BookOpen,
  Code2,
  Bookmark,
  FileText,
  Play,
  Compass,
  ShieldCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
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
import { TrackEmblem } from './TrackEmblem';
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

  // URL-persisted expanded module IDs (?open=...) — defaults to first 2 modules open
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
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) {
      navigate(`/app/learn/${track.slug}/${picked.slug}`);
    }
  };

  const stats = learnProgressService.getTrackCompletion(track, progress);
  const firstPendingLesson =
    track.lessons.find((l) => !progress.completedLessonIds[l.id]) || track.lessons[0];

  const quizCount = track.lessons.filter((l) => Boolean(l.microCheck)).length;
  const interactiveCount = track.lessons.filter((l) => Boolean(l.interactiveTrace)).length;

  // Difficulty breakdown
  const difficultyBreakdown = useMemo(() => {
    const counts = {
      foundation: { total: 0, done: 0 },
      intermediate: { total: 0, done: 0 },
      advanced: { total: 0, done: 0 },
    };
    for (const l of track.lessons) {
      counts[l.difficulty].total += 1;
      if (progress.completedLessonIds[l.id]) counts[l.difficulty].done += 1;
    }
    return counts;
  }, [track.lessons, progress.completedLessonIds]);

  const problemBySlug = useMemo(() => {
    const map = new Map<string, (typeof CANONICAL_CATALOG_PROBLEMS)[number]>();
    for (const p of CANONICAL_CATALOG_PROBLEMS) map.set(p.slug, p);
    return map;
  }, []);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules
      .map((mod) => {
        const filteredLessons = mod.lessons.filter((l) => {
          const isDone = Boolean(progress.completedLessonIds[l.id]);
          const isSaved = Boolean(progress.bookmarkedLessonIds[l.id]);
          if (statusFilter === 'pending' && isDone) return false;
          if (statusFilter === 'completed' && !isDone) return false;
          if (statusFilter === 'bookmarked' && !isSaved) return false;
          if (!q) return true;
          return `${l.title} ${l.summary} ${l.keyInvariant}`.toLowerCase().includes(q);
        });
        return { ...mod, lessons: filteredLessons };
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
        {/* Top Breadcrumb Back Link + Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={categoryBackUrl}
              className="inline-flex items-center gap-1.5 text-xs text-[#8592A8] hover:text-[#F3F6FF] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                Prep Hub / {LEARN_CATEGORY_LABELS[track.category]} /{' '}
                <strong className="text-[#F3F6FF] font-medium">{track.shortTitle}</strong>
              </span>
            </Link>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#152443] text-[#60A5FA]">
              {track.levelBadge}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <TrackEmblem iconKey={track.iconKey} size="lg" />
              <div className="space-y-1.5 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F8FAFF]">
                  {track.title}
                </h1>
                <p className="text-xs sm:text-sm text-[#8592A8] max-w-2xl leading-relaxed">
                  {track.subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-[#7C8BA6]">
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
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatMinutesLabel(track.totalMinutes)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/app/learn/${track.slug}/${firstPendingLesson.slug}`}
                className="px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.22)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Focus Mode</span>
              </Link>
              <Link
                to="/app/roadmap"
                className="px-3.5 py-2 rounded-xl border border-[#1B2234] bg-[#0F131D] hover:border-[#2B3754] text-xs font-medium text-[#C3CEE0] hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[#00B8A3]" />
                <span>Plan in Roadmap</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Overall Progress + Difficulty Breakdown Strip (Planly/Prep-Hub style, zero white lines) */}
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
                    className="px-2.5 py-1 rounded-lg border border-[#171D2D] bg-[#0B0E16] text-[11px] capitalize"
                  >
                    <span
                      className={
                        tier === 'foundation'
                          ? 'text-[#34D399]'
                          : tier === 'intermediate'
                          ? 'text-[#FBBF24]'
                          : 'text-[#F87171]'
                      }
                    >
                      {tier}
                    </span>{' '}
                    <span className="text-[#8592A8]">
                      {d.done}/{d.total}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-[#141A29] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]"
              initial={false}
              animate={{ width: `${stats.percent}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        {/* Syllabus Filter & Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6D7B94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sheet topics..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#192033] bg-[#0F131D] text-xs text-[#F3F6FF] placeholder:text-[#5B6882] focus:outline-none focus:border-[#3B82F6] w-52 sm:w-64"
              />
            </div>

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
                'px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors cursor-pointer',
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
              className="px-2.5 py-1.5 rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#2B3754] text-[11px] text-[#A8B4CA] hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pick random topic"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Pick Random</span>
            </button>
            <button
              type="button"
              onClick={handleToggleAll}
              className="px-2.5 py-1.5 rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#2B3754] text-[11px] text-[#A8B4CA] hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>{expandedModuleIds.size === modules.length ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        </div>

        {/* Hierarchical Module Accordions */}
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
                  onClick={() => toggleModule(mod.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#131928] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.18 }}
                      className="text-[#7C8BA6] shrink-0"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
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
                        className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]"
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
                                  className="mt-0.5 sm:mt-0 shrink-0 cursor-pointer text-[#5B6882] hover:text-[#00B8A3] transition-colors"
                                  aria-label={`Mark ${lesson.title} complete`}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>

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
                                      <span
                                        className={cn(
                                          'px-2 py-0.5 rounded text-[10px] font-mono capitalize',
                                          lesson.difficulty === 'foundation'
                                            ? 'bg-[#0E2822] text-[#34D399]'
                                            : lesson.difficulty === 'intermediate'
                                            ? 'bg-[#291E0B] text-[#FBBF24]'
                                            : 'bg-[#2B1419] text-[#F87171]'
                                        )}
                                      >
                                        {lesson.difficulty}
                                      </span>
                                    )}

                                    {lesson.microCheck && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1B1633] text-[#C4B5FD] text-[10px] font-mono">
                                        <HelpCircle className="w-2.5 h-2.5" />
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

                              {/* Multi-Modal Row Action Strip (Prep Hub inspired) */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <Link
                                  to={`/app/learn/${track.slug}/${lesson.slug}`}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#243B6B] bg-[#152443] hover:bg-[#1C3159] text-[11px] font-medium text-[#E2E8F5] inline-flex items-center gap-1 transition-colors"
                                  title="Open Lesson in Focus Mode"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-[#60A5FA]" />
                                  <span>Editorial</span>
                                </Link>

                                {linkedProblem && (
                                  <Link
                                    to={`/app/practice/${linkedProblem.slug}`}
                                    className="px-2.5 py-1.5 rounded-lg border border-[#193A38] bg-[#0D2120] hover:bg-[#12302E] text-[11px] font-medium text-[#5EEAD4] inline-flex items-center gap-1 transition-colors"
                                    title={`Solve ${linkedProblem.verniqProblemId}`}
                                  >
                                    <Code2 className="w-3.5 h-3.5" />
                                    <span>Solve</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                )}

                                <Link
                                  to="/app/notespace"
                                  className="p-1.5 rounded-lg border border-[#181F30] bg-[#0B0E16] hover:border-[#2B3754] text-[#7C8BA6] hover:text-white transition-colors"
                                  title="Open NoteSpace"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setProgress(learnProgressService.toggleBookmark(lesson.id))
                                  }
                                  className={cn(
                                    'p-1.5 rounded-lg border transition-colors cursor-pointer',
                                    isSaved
                                      ? 'border-[#F59E0B]/40 bg-[#291E0B] text-[#FBBF24]'
                                      : 'border-[#181F30] bg-[#0B0E16] text-[#7C8BA6] hover:text-white hover:border-[#2B3754]'
                                  )}
                                  title="Bookmark topic"
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
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
            <ShieldCheck className="w-7 h-7 text-[#6D7B94] mx-auto" />
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

