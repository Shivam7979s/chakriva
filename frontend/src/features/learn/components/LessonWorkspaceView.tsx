import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Code2,
  AlertTriangle,
  Sparkles,
  Check,
  Copy,
  ShieldCheck,
  FileText,
  Brain,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import {
  getLearnTrackBySlug,
  getLessonInTrack,
  LEARN_TRACKS,
  formatMinutesLabel,
} from '../data/learnCatalog';
import { learnProgressService } from '../services/learnProgressService';
import { InteractiveTraceStepper } from './InteractiveTraceStepper';
import { CANONICAL_CATALOG_PROBLEMS } from '@/features/roadmap/utils/adaptiveEngine';
import { adaptiveRoadmapService } from '@/features/roadmap/services/adaptiveRoadmapService';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import { classifySocraticQuery } from '@/lib/socraticClassifier';
import type { CodeLanguage, LearnProgressState } from '../types/learn';
import { cn } from '@/lib/utils';

export const LessonWorkspaceView: React.FC = () => {
  const { trackSlug, lessonSlug } = useParams<{ trackSlug: string; lessonSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roadmapTaskId = searchParams.get('taskId');
  const fromRoadmap = searchParams.get('fromRoadmap');

  const track = useMemo(() => getLearnTrackBySlug(trackSlug) || LEARN_TRACKS[0], [trackSlug]);
  const lesson = useMemo(() => getLessonInTrack(track, lessonSlug), [track, lessonSlug]);
  const lessonIndex = track.lessons.findIndex((l) => l.id === lesson.id);

  const [progress, setProgress] = useState<LearnProgressState>(() =>
    learnProgressService.getState()
  );
  const [outlineQuery, setOutlineQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>('python');
  const [copiedCode, setCopiedCode] = useState(false);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorReply, setTutorReply] = useState<string | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  const { user } = useAuth();
  const { progressMap } = useUserProgress();

  useEffect(() => {
    const next = learnProgressService.markVisited(track.slug, lesson.slug);
    setProgress(next);
    setTutorReply(null);
    setTutorQuery('');
    if (lesson.codeTemplates?.length) {
      setSelectedLang(lesson.codeTemplates[0].language);
    }
  }, [track.slug, lesson.slug, lesson.codeTemplates]);

  const trackStats = learnProgressService.getTrackCompletion(track, progress);
  const isLessonDone = Boolean(progress.completedLessonIds[lesson.id]);
  const selectedQuizAnswer = progress.quizAnswers[lesson.id];

  const linkedProblems = useMemo(() => {
    if (!lesson.linkedProblemSlugs?.length) return [];
    const slugSet = new Set(lesson.linkedProblemSlugs);
    return CANONICAL_CATALOG_PROBLEMS.filter((p) => slugSet.has(p.slug));
  }, [lesson.linkedProblemSlugs]);

  const activeCodeSnippet = useMemo(() => {
    if (!lesson.codeTemplates?.length) return undefined;
    return (
      lesson.codeTemplates.find((t) => t.language === selectedLang) || lesson.codeTemplates[0]
    );
  }, [lesson.codeTemplates, selectedLang]);

  const handleToggleLessonDone = () => {
    const updated = learnProgressService.toggleLessonCompleted(lesson.id);
    setProgress(updated);
  };

  const handleAnswerQuiz = (optionIndex: number) => {
    const updated = learnProgressService.saveQuizAnswer(lesson.id, optionIndex);
    setProgress(updated);
  };

  const handleCopyCode = async () => {
    if (!activeCodeSnippet) return;
    try {
      await navigator.clipboard.writeText(activeCodeSnippet.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1600);
    } catch {
      // Ignore clipboard rejection
    }
  };

  const handleAskTutor = (questionText: string) => {
    const clean = questionText.trim();
    if (!clean) return;
    setTutorQuery(clean);
    const classified = classifySocraticQuery(`${lesson.title}: ${clean}`);
    setTutorReply(classified.guidance);
  };

  const handleCompleteRoadmapTaskAndReturn = async () => {
    setIsCompletingTask(true);
    try {
      const updated = learnProgressService.toggleLessonCompleted(lesson.id, true);
      setProgress(updated);
      if (roadmapTaskId) {
        const activePlan = adaptiveRoadmapService.getActiveRoadmap();
        if (activePlan) {
          const targetTask = activePlan.weeks
            .flatMap((w) => w.days.flatMap((d) => d.tasks))
            .find((t) => t.id === roadmapTaskId);
          if (targetTask && targetTask.status !== 'completed') {
            const updatedPlan = adaptiveRoadmapService.toggleTaskCompleted(activePlan, roadmapTaskId);
            if (user) {
              try {
                await adaptiveRoadmapService.saveServerRoadmap(updatedPlan);
              } catch {
                // Local roadmap state is already updated via toggleTaskCompleted
              }
            }
          }
        }
      }
      navigate('/app/roadmap/adaptive');
    } finally {
      setIsCompletingTask(false);
    }
  };

  const prevLesson = lessonIndex > 0 ? track.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < track.lessons.length - 1
      ? track.lessons[lessonIndex + 1]
      : null;

  const lessonRoute = (targetLessonSlug: string) => {
    const qs = searchParams.toString();
    return qs ? `/app/learn/${track.slug}/${targetLessonSlug}?${qs}` : `/app/learn/${track.slug}/${targetLessonSlug}`;
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Learn', href: '/app/learn' },
        { label: track.shortTitle },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-5 text-left text-[#F3F6FF]">
        {/* Top Studio Control Header */}
        <div className="rounded-2xl border border-[#181F30] bg-[#0B0E16] px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={fromRoadmap ? '/app/roadmap/adaptive' : `/app/learn/${track.slug}`}
              className="px-2.5 py-1.5 rounded-lg border border-[#1B2234] bg-[#0F131D] hover:border-[#2B3754] text-xs text-[#A8B4CA] hover:text-white inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{fromRoadmap ? 'Back to Roadmap' : 'Back to Syllabus'}</span>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#7C8BA6]">
                <span className="text-[#60A5FA]">{track.levelBadge}</span>
                <span>·</span>
                <span>{formatMinutesLabel(track.totalMinutes)} curriculum</span>
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-[#F8FAFF] truncate">
                {track.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-[11px] font-mono text-[#8592A8]">
                  <strong className="text-[#00B8A3]">{trackStats.completed}</strong> /{' '}
                  {trackStats.total} lessons
                </div>
                <div className="w-28 h-1.5 rounded-full bg-[#141A29] overflow-hidden mt-1">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]"
                    initial={false}
                    animate={{ width: `${trackStats.percent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {roadmapTaskId && (
              <button
                type="button"
                disabled={isCompletingTask}
                onClick={handleCompleteRoadmapTaskAndReturn}
                className="px-3.5 py-2 rounded-xl bg-[#0E2828] hover:bg-[#133636] border border-[#00B8A3]/40 text-xs font-medium text-[#5EEAD4] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isCompletingTask ? 'Syncing...' : 'Complete Task & Return'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Column Studio Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Col 1 (3 cols): Module Outline */}
          <aside className="lg:col-span-3 rounded-2xl border border-[#181F30] bg-[#0B0E16] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#7C8BA6]">
                Syllabus Outline
              </span>
              <span className="text-[11px] font-mono text-[#00B8A3]">{trackStats.percent}%</span>
            </div>

            <div className="relative">
              <Search className="w-3 h-3 text-[#6D7B94] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={outlineQuery}
                onChange={(e) => setOutlineQuery(e.target.value)}
                placeholder="Search syllabus..."
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-[#192033] bg-[#0F131D] text-[11px] text-[#F3F6FF] placeholder:text-[#5B6882] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-1.5">
              {track.lessons
                .filter(
                  (item) =>
                    !outlineQuery.trim() ||
                    item.title.toLowerCase().includes(outlineQuery.trim().toLowerCase())
                )
                .map((item, idx) => {
                const isActive = item.id === lesson.id;
                const done = Boolean(progress.completedLessonIds[item.id]);
                return (
                  <Link
                    key={item.id}
                    to={lessonRoute(item.slug)}
                    className={cn(
                      'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors',
                      isActive
                        ? 'bg-[#152443] border-[#3B82F6]/45 text-[#F8FAFF]'
                        : 'bg-[#0F131D] border-[#171D2D] text-[#94A1B8] hover:text-[#F3F6FF] hover:border-[#24304A]'
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                      ) : (
                        <Circle
                          className={cn(
                            'w-4 h-4',
                            isActive ? 'text-[#60A5FA]' : 'text-[#4B5873]'
                          )}
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-[#6D7B94]">
                        Lesson {idx + 1} · {item.estimatedMinutes}m
                      </div>
                      <div className="text-xs font-medium leading-snug line-clamp-2">
                        {item.title}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {track.prerequisites.length > 0 && (
              <div className="pt-3 border-t border-[#171D2D] space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#6D7B94]">
                  Prerequisites
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {track.prerequisites.map((pre) => (
                    <span
                      key={pre}
                      className="px-2 py-0.5 rounded-md bg-[#0F131D] border border-[#192033] text-[11px] text-[#8592A8]"
                    >
                      {pre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Col 2 (6 cols): Calm Obsidian Reader & Interactive Trace */}
          <main className="lg:col-span-6 space-y-5">
            <AnimatePresence mode="wait">
              <motion.article
                key={lesson.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="rounded-2xl border border-[#192033] bg-[#0F131D] p-5 sm:p-7 space-y-6"
              >
                {/* Lesson Meta & Title */}
                <div className="space-y-2.5 border-b border-[#171D2D] pb-5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-[#152443] text-[#60A5FA] capitalize">
                      {lesson.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#7C8BA6]">
                      <Clock className="w-3.5 h-3.5" />
                      {lesson.estimatedMinutes} min read
                    </span>
                    {track.isJudgeBacked ? (
                      <span className="inline-flex items-center gap-1 text-[#00B8A3]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Judge-Backed Practice
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#A78BFA]">
                        <BookOpen className="w-3.5 h-3.5" />
                        Concept Architecture
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F8FAFF]">
                    {lesson.title}
                  </h2>
                  <p className="text-sm text-[#9AB0D1] leading-relaxed">{lesson.summary}</p>
                </div>

                {/* Key Invariant & Mental Model Callout */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-[#1E2E4A] bg-[#0B1222] p-4 space-y-1.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#60A5FA] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Core Engineering Invariant
                    </div>
                    <p className="text-xs sm:text-sm text-[#E2E8F5] leading-relaxed">
                      {lesson.keyInvariant}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#182B2B] bg-[#0B1617] p-4 space-y-1.5">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#00B8A3]">
                      Intuition / Mental Model
                    </div>
                    <p className="text-xs sm:text-sm text-[#CBE7E3] leading-relaxed">
                      {lesson.mentalModel}
                    </p>
                  </div>
                </div>

                {/* Structured Reading Sections */}
                <div className="space-y-5">
                  {lesson.sections.map((sec) => (
                    <section key={sec.heading} className="space-y-2">
                      <h3 className="text-sm sm:text-base font-semibold text-[#F3F6FF]">
                        {sec.heading}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#A8B4CA] leading-7">{sec.body}</p>
                      {sec.bullets && sec.bullets.length > 0 && (
                        <ul className="space-y-1.5 pt-1">
                          {sec.bullets.map((b) => (
                            <li
                              key={b}
                              className="flex items-start gap-2.5 text-xs sm:text-sm text-[#B8C2D4] leading-relaxed"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-2 shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>

                {/* Interactive Visual Trace Stepper */}
                {lesson.interactiveTrace && (
                  <InteractiveTraceStepper
                    title={lesson.interactiveTrace.title}
                    subtitle={lesson.interactiveTrace.subtitle}
                    steps={lesson.interactiveTrace.steps}
                  />
                )}

                {/* Code Template Switcher */}
                {lesson.codeTemplates && activeCodeSnippet && (
                  <div className="rounded-2xl border border-[#192033] bg-[#0B0E16] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#0F131D] border-b border-[#171D2D] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {lesson.codeTemplates.map((tpl) => {
                          const active = tpl.language === activeCodeSnippet.language;
                          return (
                            <button
                              key={tpl.language}
                              type="button"
                              onClick={() => setSelectedLang(tpl.language)}
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer',
                                active
                                  ? 'bg-[#152443] text-[#60A5FA] font-medium'
                                  : 'text-[#7C8BA6] hover:text-[#E2E8F5]'
                              )}
                            >
                              {tpl.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-[#00B8A3]">
                          {activeCodeSnippet.complexity}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="p-1.5 rounded-lg border border-[#1B2234] text-[#8592A8] hover:text-white cursor-pointer transition-colors"
                          title="Copy template"
                        >
                          {copiedCode ? (
                            <Check className="w-3.5 h-3.5 text-[#00B8A3]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <pre className="p-4 text-xs font-mono text-[#D5E1F7] overflow-x-auto leading-relaxed">
                      <code>{activeCodeSnippet.code}</code>
                    </pre>
                  </div>
                )}

                {/* Interview Pitfalls */}
                {lesson.pitfalls && lesson.pitfalls.length > 0 && (
                  <div className="rounded-xl border border-[#3B2A12] bg-[#171209] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FBBF24]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Common Interview Pitfalls</span>
                    </div>
                    <ul className="space-y-1.5">
                      {lesson.pitfalls.map((pit) => (
                        <li key={pit} className="text-xs text-[#E7D3AE] leading-relaxed">
                          • {pit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Comprehension Micro-Check */}
                {lesson.microCheck && (
                  <div className="rounded-2xl border border-[#192033] bg-[#0B0E16] p-4 sm:p-5 space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#A78BFA]">
                      Quick Comprehension Check
                    </div>
                    <div className="text-sm font-medium text-[#F3F6FF]">
                      {lesson.microCheck.prompt}
                    </div>
                    <div className="space-y-2">
                      {lesson.microCheck.options.map((opt, idx) => {
                        const chosen = selectedQuizAnswer === idx;
                        const hasAnswered = selectedQuizAnswer !== undefined;
                        const isCorrect = idx === lesson.microCheck!.correctIndex;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswerQuiz(idx)}
                            className={cn(
                              'w-full px-3.5 py-2.5 rounded-xl border text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer',
                              !hasAnswered
                                ? 'bg-[#0F131D] border-[#1A2133] text-[#C3CEE0] hover:border-[#3B82F6]/45'
                                : isCorrect
                                ? 'bg-[#0C2422] border-[#00B8A3]/45 text-[#5EEAD4]'
                                : chosen
                                ? 'bg-[#291216] border-[#EF4444]/45 text-[#FCA5A5]'
                                : 'bg-[#0F131D] border-[#171D2D] text-[#6D7B94]'
                            )}
                          >
                            <span>{opt}</span>
                            {hasAnswered && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-[#00B8A3] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedQuizAnswer !== undefined && (
                      <div className="text-xs text-[#9AB0D1] bg-[#0F131D] border border-[#171D2D] rounded-xl p-3 leading-relaxed">
                        <strong className="text-[#00B8A3] mr-1">Why:</strong>
                        {lesson.microCheck.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Lesson Footer Navigation & Completion */}
                <div className="pt-4 border-t border-[#171D2D] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleToggleLessonDone}
                    className={cn(
                      'px-4 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer',
                      isLessonDone
                        ? 'bg-[#0E2828] border-[#00B8A3]/45 text-[#5EEAD4]'
                        : 'bg-[#152443] border-[#3B82F6]/45 text-[#F3F6FF] hover:bg-[#1B3057]'
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isLessonDone ? 'Lesson Completed' : 'Mark Lesson Complete'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {prevLesson && (
                      <Link
                        to={lessonRoute(prevLesson.slug)}
                        className="px-3 py-2 rounded-xl border border-[#1B2234] bg-[#0B0E16] hover:border-[#2B3754] text-xs text-[#A8B4CA] hover:text-white inline-flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </Link>
                    )}
                    {nextLesson && (
                      <Link
                        to={lessonRoute(nextLesson.slug)}
                        className="px-3.5 py-2 rounded-xl border border-[#243B6B] bg-[#152443] hover:bg-[#1C3159] text-xs font-medium text-[#F3F6FF] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Next Lesson</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </main>

          {/* Col 3 (3 cols): Apply in Practice + Ask Chakriva Tutor */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Apply in Practice Card */}
            <div className="rounded-2xl border border-[#181F30] bg-[#0B0E16] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#7C8BA6] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Apply in Practice</span>
                </span>
                {linkedProblems.length > 0 && (
                  <span className="text-[11px] font-mono text-[#6D7B94]">
                    {linkedProblems.length} verified
                  </span>
                )}
              </div>

              {linkedProblems.length > 0 ? (
                <div className="space-y-2">
                  {linkedProblems.map((prob) => {
                    const isSolved = progressMap[prob.slug] === 'solved' || progressMap[prob.verniqProblemId] === 'solved';
                    return (
                      <Link
                        key={prob.verniqProblemId}
                        to={`/app/practice/${prob.slug}`}
                        className="block rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#3B82F6]/45 p-3 transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                          <span className="text-[#60A5FA]">{prob.verniqProblemId}</span>
                          <span
                            className={cn(
                              'capitalize',
                              isSolved
                                ? 'text-[#00B8A3]'
                                : prob.difficulty === 'easy'
                                ? 'text-[#34D399]'
                                : prob.difficulty === 'medium'
                                ? 'text-[#FBBF24]'
                                : 'text-[#F87171]'
                            )}
                          >
                            {isSolved ? 'Solved' : prob.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-xs font-medium text-[#F3F6FF] group-hover:text-[#93C5FD] transition-colors truncate">
                            {prob.title}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#6D7B94] group-hover:text-[#60A5FA] shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-[#171D2D] bg-[#0F131D] p-3 text-xs text-[#8592A8] leading-relaxed">
                  Architecture &amp; theory module — review concepts and test your grasp using the comprehension check or NoteSpace notes.
                </div>
              )}

              <Link
                to="/app/notespace"
                className="w-full px-3 py-2 rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#2B3754] text-xs text-[#A8B4CA] hover:text-white flex items-center justify-between transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>Open NoteSpace Journal</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Scoped Chakriva Concept Tutor */}
            <div className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#101522] to-[#0B0E16] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#F3F6FF] inline-flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-[#8B5CF6]" />
                  <span>Concept Tutor</span>
                </span>
                <Link
                  to="/app/chakriva"
                  className="text-[11px] font-mono text-[#60A5FA] hover:underline"
                >
                  Full Mentor
                </Link>
              </div>

              <div className="space-y-1.5">
                {[
                  `Why does ${lesson.title.split(':')[0]} avoid brute force?`,
                  'Walk me through an edge case that breaks this',
                ].map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    onClick={() => handleAskTutor(promptText)}
                    className="w-full text-left px-3 py-2 rounded-xl border border-[#192033] bg-[#0F131D] hover:border-[#3B82F6]/40 text-[11px] text-[#A8B4CA] hover:text-white transition-colors cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskTutor(tutorQuery);
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  value={tutorQuery}
                  onChange={(e) => setTutorQuery(e.target.value)}
                  placeholder="Ask about this concept..."
                  className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-[#1B2234] bg-[#0F131D] text-xs text-[#F3F6FF] placeholder:text-[#5B6882] focus:outline-none focus:border-[#3B82F6]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg bg-[#152443] border border-[#3B82F6]/40 text-xs text-[#93C5FD] hover:text-white cursor-pointer transition-colors"
                >
                  Ask
                </button>
              </form>

              {tutorReply && (
                <div className="rounded-xl border border-[#1E2E4A] bg-[#0B1222] p-3 text-[11px] text-[#C3CEE0] leading-relaxed">
                  {tutorReply}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};
