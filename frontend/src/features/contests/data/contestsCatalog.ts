import type { Problem, ProblemStatus } from '@/types';
import { EXTENDED_CATALOG_PROBLEMS } from '../../roadmap/utils/catalogRegistry.ts';
import type {
  ActiveContestSession,
  ContestDefinition,
  ContestFilterTabId,
  ContestScheduleCadence,
  ResolvedContestProblem,
  ResolvedContestSummary,
} from '../types/contest.ts';

export const CONTEST_FILTER_TABS: Array<{ id: ContestFilterTabId; label: string }> = [
  { id: 'all', label: 'All Contests' },
  { id: 'featured', label: 'Weekly & Biweekly' },
  { id: 'oa_sprint', label: 'Mock OA Sprints' },
  { id: 'topic_drill', label: 'Focused Drills' },
  { id: 'my_contests', label: 'My Contests' },
];

export const CONTESTS_CATALOG: ContestDefinition[] = [
  {
    id: 'weekly-contest-01',
    title: 'Weekly Contest 01',
    subtitle: 'Algorithmic Invariant Round',
    description:
      '4-problem standard weekly round spanning hash complements, sliding windows, rotated binary search, and envelope stacks.',
    category: 'virtual',
    durationMinutes: 90,
    difficultyLevel: 'Standard',
    featured: true,
    scheduleCadence: 'weekly',
    problems: [
      { label: 'Q1', slug: 'two-sum', points: 3 },
      { label: 'Q2', slug: 'longest-substring-without-repeating-characters', points: 4 },
      { label: 'Q3', slug: 'search-in-rotated-sorted-array', points: 5 },
      { label: 'Q4', slug: 'trapping-rain-water', points: 6 },
    ],
  },
  {
    id: 'biweekly-contest-01',
    title: 'Biweekly Contest 01',
    subtitle: 'Trees, Graphs & LRU Design',
    description:
      '90-minute engineering round testing binary tree recursion, connected components, topological cycle detection, and O(1) LRU design.',
    category: 'virtual',
    durationMinutes: 90,
    difficultyLevel: 'Advanced',
    featured: true,
    scheduleCadence: 'biweekly',
    problems: [
      { label: 'Q1', slug: 'maximum-depth-of-binary-tree', points: 3 },
      { label: 'Q2', slug: 'number-of-islands', points: 4 },
      { label: 'Q3', slug: 'course-schedule', points: 5 },
      { label: 'Q4', slug: 'lru-cache', points: 6 },
    ],
  },
  {
    id: 'oa-screening-sprint-01',
    title: 'OA Screening Round 01',
    subtitle: 'Stacks, Intervals & Priority Queues',
    description:
      'Timed 60-minute assessment modeled on product engineering screening rounds.',
    category: 'oa_sprint',
    durationMinutes: 60,
    difficultyLevel: 'Standard',
    problems: [
      { label: 'Q1', slug: 'valid-parentheses', points: 3 },
      { label: 'Q2', slug: 'merge-intervals', points: 4 },
      { label: 'Q3', slug: 'top-k-frequent-elements', points: 5 },
    ],
  },
  {
    id: 'oa-hashing-search-02',
    title: 'Hashing & Binary Search Round 02',
    subtitle: 'Arrays, Sets & Answer-Space Search',
    description:
      '60-minute mock round covering anagram hashing, consecutive sequences, and monotonic binary search on rates.',
    category: 'oa_sprint',
    durationMinutes: 60,
    difficultyLevel: 'Standard',
    problems: [
      { label: 'Q1', slug: 'group-anagrams', points: 3 },
      { label: 'Q2', slug: 'longest-consecutive-sequence', points: 4 },
      { label: 'Q3', slug: 'koko-eating-bananas', points: 5 },
    ],
  },
  {
    id: 'pointers-window-drill',
    title: 'Two Pointers & Prefix Drill',
    subtitle: '45-Minute Speed Verification',
    description:
      'Short speed drill covering running prefix minimum, greedy container contraction, and sorted 3Sum pointers.',
    category: 'topic_drill',
    durationMinutes: 45,
    difficultyLevel: 'Beginner',
    problems: [
      { label: 'Q1', slug: 'best-time-to-buy-and-sell-stock', points: 3 },
      { label: 'Q2', slug: 'container-with-most-water', points: 4 },
      { label: 'Q3', slug: '3sum', points: 5 },
    ],
  },
  {
    id: 'campus-warmup-00',
    title: 'Campus Warm-Up Round 00',
    subtitle: 'Arrays, Subarrays & Grid BFS',
    description:
      'Foundational timed round combining complement hashing, Kadane subarray DP, and multi-source BFS.',
    category: 'topic_drill',
    durationMinutes: 45,
    difficultyLevel: 'Beginner',
    problems: [
      { label: 'Q1', slug: 'two-sum', points: 3 },
      { label: 'Q2', slug: 'maximum-subarray', points: 4 },
      { label: 'Q3', slug: 'rotting-oranges', points: 5 },
    ],
  },
];

export function getContestById(contestId?: string): ContestDefinition | undefined {
  if (!contestId) return undefined;
  return CONTESTS_CATALOG.find((c) => c.id === contestId);
}

export function getFeaturedContests(): ContestDefinition[] {
  return CONTESTS_CATALOG.filter((c) => c.featured);
}

function catalogFallbackProblem(slug: string): Problem | null {
  const entry = EXTENDED_CATALOG_PROBLEMS.find((item) => item.slug === slug);
  if (!entry) return null;
  return {
    id: entry.verniqProblemId,
    verniq_id: entry.verniqProblemId,
    title: entry.title,
    slug: entry.slug,
    difficulty: entry.difficulty,
    acceptance_rate: entry.acceptanceRate,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: entry.isPublished,
    domain: 'DSA',
    tags: [entry.topic],
  };
}

function resolveStatus(
  problem: Problem,
  progressMap: Record<string, ProblemStatus>
): ProblemStatus {
  return (
    progressMap[problem.id] ||
    (problem.verniq_id ? progressMap[problem.verniq_id] : undefined) ||
    progressMap[problem.slug] ||
    problem.status ||
    'todo'
  );
}

export function resolveContestSummary(
  definition: ContestDefinition,
  problems: Problem[],
  progressMap: Record<string, ProblemStatus>
): ResolvedContestSummary {
  const bySlug = new Map<string, Problem>();
  for (const p of problems) {
    bySlug.set(p.slug, p);
  }

  const resolvedProblems: ResolvedContestProblem[] = [];
  for (const spec of definition.problems) {
    const matched = bySlug.get(spec.slug) || catalogFallbackProblem(spec.slug);
    if (!matched) continue;
    resolvedProblems.push({
      label: spec.label,
      points: spec.points,
      problem: matched,
      status: resolveStatus(matched, progressMap),
    });
  }

  let solvedCount = 0;
  let attemptedCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;

  for (const item of resolvedProblems) {
    totalPoints += item.points;
    if (item.status === 'solved') {
      solvedCount += 1;
      earnedPoints += item.points;
    } else if (item.status === 'attempted') {
      attemptedCount += 1;
    }
  }

  return {
    definition,
    resolvedProblems,
    solvedCount,
    attemptedCount,
    totalCount: resolvedProblems.length,
    earnedPoints,
    totalPoints,
    isCompleted: resolvedProblems.length > 0 && solvedCount === resolvedProblems.length,
  };
}

export function getRemainingSeconds(
  session: ActiveContestSession | null,
  nowMs: number = Date.now()
): number {
  if (!session) return 0;
  const endMs = session.startedAtMs + session.durationMinutes * 60_000;
  return Math.max(0, Math.floor((endMs - nowMs) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Computes the next recurring UTC timestamp for weekly (Sunday 02:30 UTC / 08:00 IST)
 * or biweekly (Saturday 14:30 UTC / 20:00 IST) windows relative to nowMs.
 */
export function getNextScheduledStartMs(
  cadence: ContestScheduleCadence,
  nowMs: number = Date.now()
): number {
  const targetDay = cadence === 'weekly' ? 0 : 6; // 0 = Sunday, 6 = Saturday
  const targetUtcHour = cadence === 'weekly' ? 2 : 14;
  const targetUtcMinute = 30;

  const base = new Date(nowMs);
  const currentDay = base.getUTCDay();
  const daysAhead = (targetDay - currentDay + 7) % 7;

  const candidate = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + daysAhead,
      targetUtcHour,
      targetUtcMinute,
      0,
      0
    )
  );

  if (candidate.getTime() <= nowMs) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  return candidate.getTime();
}

export function formatScheduleCountdown(
  targetMs: number,
  nowMs: number = Date.now()
): string {
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}
