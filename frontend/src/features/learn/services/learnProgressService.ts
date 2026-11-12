import { LEARN_TRACKS, getLearnTrackBySlug, getLearnTrackBySubjectId } from '../data/learnCatalog.ts';
import type { LearnProgressState, LearnTrack } from '../types/learn';
import type { AdaptiveTask, SubjectId } from '@/features/roadmap/types/adaptive';

const LEARN_PROGRESS_KEY = 'chakriva_learn_progress_v1';

const DEFAULT_PROGRESS: LearnProgressState = {
  completedLessonIds: {},
  bookmarkedLessonIds: {},
  quizAnswers: {},
};

function readState(): LearnProgressState {
  try {
    const raw = localStorage.getItem(LEARN_PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<LearnProgressState>;
    return {
      completedLessonIds: parsed.completedLessonIds || {},
      bookmarkedLessonIds: parsed.bookmarkedLessonIds || {},
      quizAnswers: parsed.quizAnswers || {},
      lastVisitedTrackSlug: parsed.lastVisitedTrackSlug,
      lastVisitedLessonSlug: parsed.lastVisitedLessonSlug,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function writeState(next: LearnProgressState): void {
  try {
    localStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export const learnProgressService = {
  getState(): LearnProgressState {
    return readState();
  },

  markVisited(trackSlug: string, lessonSlug: string): LearnProgressState {
    const cur = readState();
    const next: LearnProgressState = {
      ...cur,
      lastVisitedTrackSlug: trackSlug,
      lastVisitedLessonSlug: lessonSlug,
    };
    writeState(next);
    return next;
  },

  toggleLessonCompleted(lessonId: string, forceValue?: boolean): LearnProgressState {
    const cur = readState();
    const nextVal = forceValue !== undefined ? forceValue : !cur.completedLessonIds[lessonId];
    const next: LearnProgressState = {
      ...cur,
      completedLessonIds: {
        ...cur.completedLessonIds,
        [lessonId]: nextVal,
      },
    };
    writeState(next);
    return next;
  },

  toggleBookmark(lessonId: string): LearnProgressState {
    const cur = readState();
    const next: LearnProgressState = {
      ...cur,
      bookmarkedLessonIds: {
        ...cur.bookmarkedLessonIds,
        [lessonId]: !cur.bookmarkedLessonIds[lessonId],
      },
    };
    writeState(next);
    return next;
  },

  saveQuizAnswer(lessonId: string, optionIndex: number): LearnProgressState {
    const cur = readState();
    const next: LearnProgressState = {
      ...cur,
      quizAnswers: {
        ...cur.quizAnswers,
        [lessonId]: optionIndex,
      },
    };
    writeState(next);
    return next;
  },

  getTrackCompletion(track: LearnTrack, state: LearnProgressState = readState()): {
    completed: number;
    total: number;
    percent: number;
  } {
    const total = track.lessons.length;
    const completed = track.lessons.filter((l) => Boolean(state.completedLessonIds[l.id])).length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },
};

/**
 * Resolves any Adaptive Roadmap study/concept/revision task to a real Lesson Studio route.
 */
export function resolveLearnHrefForTask(task: AdaptiveTask): string {
  const params = new URLSearchParams({
    taskId: task.id,
    fromRoadmap: 'adaptive',
  });

  const subjectTrack = task.subject ? getLearnTrackBySubjectId(task.subject as SubjectId) : undefined;
  const topicLower = `${task.topic || ''} ${task.title || ''}`.toLowerCase();

  let matchedTrack = subjectTrack;
  if (!matchedTrack) {
    if (topicLower.includes('system design') || topicLower.includes('hld') || topicLower.includes('lld')) {
      matchedTrack = getLearnTrackBySlug('system-design');
    } else if (topicLower.includes('dbms') || topicLower.includes('mvcc') || topicLower.includes('b+ tree')) {
      matchedTrack = getLearnTrackBySlug('dbms');
    } else if (topicLower.includes('operating system') || topicLower.includes('virtual memory') || topicLower.includes('deadlock')) {
      matchedTrack = getLearnTrackBySlug('os');
    } else if (topicLower.includes('network') || topicLower.includes('tcp') || topicLower.includes('dns')) {
      matchedTrack = getLearnTrackBySlug('cn');
    } else if (topicLower.includes('oop') || topicLower.includes('polymorphism')) {
      matchedTrack = getLearnTrackBySlug('oop');
    } else if (topicLower.includes('sql') || topicLower.includes('window')) {
      matchedTrack = getLearnTrackBySlug('sql');
    } else {
      matchedTrack = getLearnTrackBySlug('dsa-patterns') || LEARN_TRACKS[0];
    }
  }

  const lessonMatch =
    matchedTrack?.lessons.find((l) =>
      topicLower
        .split(/\s+/)
        .some((w) => w.length > 3 && `${l.title} ${l.summary}`.toLowerCase().includes(w))
    ) || matchedTrack?.lessons[0];

  const trackSlug = matchedTrack?.slug || 'dsa-patterns';
  const lessonSlug = lessonMatch?.slug;

  return lessonSlug
    ? `/app/learn/${trackSlug}/${lessonSlug}?${params.toString()}`
    : `/app/learn/${trackSlug}?${params.toString()}`;
}
