import type { Problem, ProblemStatus } from '@/types';
import { EXTENDED_CATALOG_PROBLEMS } from '../../roadmap/utils/catalogRegistry.ts';
import type {
  ResolvedSheetProblem,
  ResolvedSheetStep,
  ResolvedSheetSummary,
  SheetCategory,
  SheetDefinition,
  SheetStepDefinition,
} from '../types/sheet';

export const SHEET_CATEGORY_TABS: Array<{
  id: 'all' | SheetCategory;
  label: string;
}> = [
  { id: 'all', label: 'All Sheets' },
  { id: 'chakriva', label: 'Chakriva Flagship' },
  { id: 'company', label: 'Company Packs' },
  { id: 'topic', label: 'Topic Mastery' },
  { id: 'goal', label: 'Time Sprints' },
  { id: 'beginner', label: 'Zero to One' },
];

export const SHEETS_CATALOG: SheetDefinition[] = [
  {
    id: 'chakriva-core-150',
    category: 'chakriva',
    title: 'Chakriva Core 150 Invariants',
    subtitle: 'Canonical Master Algorithmic Syllabus',
    description:
      'Complete pattern progression ordered from array invariants and monotonic windows up to graphs, tries, and multidimensional dynamic programming.',
    badge: 'Flagship 150',
    estHours: '65 hrs',
    accentHex: '#22D3EE',
    recommendedFor: 'End-to-end SDE interview preparation',
    steps: [
      {
        id: 'core-arrays-hashing',
        stepNumber: 1,
        title: 'Arrays, Hashing & Prefix Bounds',
        focus: 'Complement maps, in-place frequency buckets, and O(n) sequence heads.',
        targetCount: 22,
        prioritySlugs: [
          'two-sum',
          'best-time-to-buy-and-sell-stock',
          'valid-anagram',
          'group-anagrams',
          'longest-consecutive-sequence',
        ],
        topicKeywords: ['array', 'hash', 'prefix', 'matrix', 'string'],
      },
      {
        id: 'core-two-pointers',
        stepNumber: 2,
        title: 'Two Pointers & Sliding Windows',
        focus: 'Convergent boundaries, sorted anchors, and monotonic window contraction.',
        targetCount: 20,
        prioritySlugs: [
          '3sum',
          'container-with-most-water',
          'longest-substring-without-repeating-characters',
          'trapping-rain-water',
        ],
        topicKeywords: ['two pointer', 'sliding window', 'subarray', 'window'],
      },
      {
        id: 'core-binary-search',
        stepNumber: 3,
        title: 'Binary Search & Predicate Spaces',
        focus: 'Half-space monotonicity in rotated arrays and feasibility bisection.',
        targetCount: 16,
        prioritySlugs: ['search-in-rotated-sorted-array', 'koko-eating-bananas'],
        topicKeywords: ['binary search', 'search', 'bisect'],
      },
      {
        id: 'core-stacks-heaps',
        stepNumber: 4,
        title: 'Stacks, Queues, Heaps & Design',
        focus: 'LIFO delimiters, monotonic extrema, bounded k-heaps, and composite LRU caches.',
        targetCount: 22,
        prioritySlugs: [
          'valid-parentheses',
          'lru-cache',
          'top-k-frequent-elements',
          'kth-largest-element-in-an-array',
          'merge-intervals',
        ],
        topicKeywords: ['stack', 'queue', 'heap', 'priority', 'interval', 'design', 'linked list'],
      },
      {
        id: 'core-trees',
        stepNumber: 5,
        title: 'Binary Trees, BSTs & Recursion',
        focus: 'Subtree invariants, depth bounds, and structural recursive transformations.',
        targetCount: 22,
        prioritySlugs: ['maximum-depth-of-binary-tree', 'invert-binary-tree'],
        topicKeywords: ['tree', 'bst', 'trie', 'recursion', 'backtrack'],
      },
      {
        id: 'core-graphs',
        stepNumber: 6,
        title: 'Graphs, BFS Diffusion & Topo Sort',
        focus: 'Connected components, multi-source wavefront BFS, and Kahn cycle detection.',
        targetCount: 22,
        prioritySlugs: ['number-of-islands', 'rotting-oranges', 'course-schedule'],
        topicKeywords: ['graph', 'bfs', 'dfs', 'topological', 'union find', 'shortest'],
      },
      {
        id: 'core-dp',
        stepNumber: 7,
        title: 'Dynamic Programming & Greedy',
        focus: 'Kadane prefix recovery, center expansion, knapsack states, and DAG transitions.',
        targetCount: 26,
        prioritySlugs: ['maximum-subarray', 'longest-palindromic-substring'],
        topicKeywords: ['dynamic programming', 'dp', 'greedy', 'memoization', 'bitmask'],
      },
    ],
  },
  {
    id: 'sde-foundations-75',
    category: 'chakriva',
    title: 'SDE High-Yield 75',
    subtitle: 'High-Frequency Interview Essentials',
    description:
      'Tight, non-redundant 75-problem core designed for fast recall across online assessments and technical screening rounds.',
    badge: 'High Yield',
    estHours: '32 hrs',
    accentHex: '#00B8A3',
    recommendedFor: 'Rapid revision before screening rounds',
    steps: [
      {
        id: 'hy-arrays',
        stepNumber: 1,
        title: 'Hashing, Arrays & Pointers',
        focus: 'Fast complement tests, sorted triplets, and greedy container sweeps.',
        targetCount: 18,
        prioritySlugs: [
          'two-sum',
          'best-time-to-buy-and-sell-stock',
          'group-anagrams',
          '3sum',
          'container-with-most-water',
        ],
        topicKeywords: ['array', 'hash', 'two pointer'],
      },
      {
        id: 'hy-windows-search',
        stepNumber: 2,
        title: 'Windows, Stacks & Binary Search',
        focus: 'Dynamic character windows, bracket grammars, and rotated array splits.',
        targetCount: 18,
        prioritySlugs: [
          'longest-substring-without-repeating-characters',
          'valid-parentheses',
          'search-in-rotated-sorted-array',
          'merge-intervals',
        ],
        topicKeywords: ['sliding window', 'stack', 'binary search', 'interval'],
      },
      {
        id: 'hy-trees-graphs',
        stepNumber: 3,
        title: 'Trees, Heaps & Graph Traversals',
        focus: 'Top-k heaps, tree depth recursion, and grid BFS components.',
        targetCount: 20,
        prioritySlugs: [
          'maximum-depth-of-binary-tree',
          'invert-binary-tree',
          'top-k-frequent-elements',
          'number-of-islands',
          'course-schedule',
        ],
        topicKeywords: ['tree', 'heap', 'graph', 'bfs', 'dfs'],
      },
      {
        id: 'hy-dp',
        stepNumber: 4,
        title: 'Subarray & State Space DP',
        focus: 'Optimal subproblem states and linear prefix recovery.',
        targetCount: 19,
        prioritySlugs: ['maximum-subarray', 'longest-palindromic-substring'],
        topicKeywords: ['dynamic programming', 'greedy', 'dp'],
      },
    ],
  },
  {
    id: 'company-google',
    category: 'company',
    title: 'Google SDE Readiness',
    subtitle: 'Deep Algorithmic Rigor & Proofs',
    description:
      'Calibrated around Google-style ambiguity reduction: answer-space binary search, monotonic structures, graphs, and multi-dimensional DP.',
    badge: 'Company Pack',
    estHours: '30 hrs',
    accentHex: '#60A5FA',
    recommendedFor: 'Google L3 / L4 & tier-1 product rounds',
    steps: [
      {
        id: 'goog-search-intervals',
        stepNumber: 1,
        title: 'Monotonic Search & Intervals',
        focus: 'Feasibility predicates, rotated search invariants, and sweep merges.',
        targetCount: 18,
        prioritySlugs: [
          'koko-eating-bananas',
          'search-in-rotated-sorted-array',
          'merge-intervals',
          'trapping-rain-water',
        ],
        topicKeywords: ['binary search', 'interval', 'monotonic', 'two pointer'],
        difficulties: ['medium', 'hard'],
      },
      {
        id: 'goog-graphs-design',
        stepNumber: 2,
        title: 'Graphs, Dependencies & Caching',
        focus: 'Topological ordering, islands, and composite O(1) data structure design.',
        targetCount: 22,
        prioritySlugs: [
          'course-schedule',
          'number-of-islands',
          'lru-cache',
          'longest-consecutive-sequence',
        ],
        topicKeywords: ['graph', 'design', 'trie', 'union find', 'tree'],
        difficulties: ['medium', 'hard'],
      },
      {
        id: 'goog-dp',
        stepNumber: 3,
        title: 'State Transitions & Optimization',
        focus: 'Recurrence proofs and palindrome/interval DP structures.',
        targetCount: 25,
        prioritySlugs: ['longest-palindromic-substring', 'maximum-subarray'],
        topicKeywords: ['dynamic programming', 'dp', 'greedy', 'backtrack'],
        difficulties: ['medium', 'hard'],
      },
    ],
  },
  {
    id: 'company-amazon',
    category: 'company',
    title: 'Amazon OA & Onsite Rounds',
    subtitle: 'High-Volume Systems & Patterns',
    description:
      'Focused on Amazon campus and SDE-1/2 rounds: multi-source BFS, OOD structures like LRU Cache, sliding windows, and priority queues.',
    badge: 'Assessment Prep',
    estHours: '24 hrs',
    accentHex: '#FBBF24',
    recommendedFor: 'Amazon OA1/OA2 and virtual onsite loops',
    steps: [
      {
        id: 'amzn-arrays-windows',
        stepNumber: 1,
        title: 'Arrays, Windows & Hash Maps',
        focus: 'Fast hash complements, stock profit tracking, and substring windows.',
        targetCount: 16,
        prioritySlugs: [
          'two-sum',
          'best-time-to-buy-and-sell-stock',
          'group-anagrams',
          'longest-substring-without-repeating-characters',
          'container-with-most-water',
        ],
        topicKeywords: ['array', 'hash', 'sliding window', 'string'],
      },
      {
        id: 'amzn-bfs-heaps',
        stepNumber: 2,
        title: 'Multi-Source BFS, Heaps & Design',
        focus: 'Wavefront simulation, top-k heaps, and cache eviction invariants.',
        targetCount: 18,
        prioritySlugs: [
          'rotting-oranges',
          'number-of-islands',
          'top-k-frequent-elements',
          'kth-largest-element-in-an-array',
          'lru-cache',
        ],
        topicKeywords: ['bfs', 'heap', 'design', 'graph', 'queue'],
      },
      {
        id: 'amzn-trees-dp',
        stepNumber: 3,
        title: 'Trees, Intervals & Core DP',
        focus: 'Tree depth checks, interval consolidation, and linear DP.',
        targetCount: 16,
        prioritySlugs: ['maximum-depth-of-binary-tree', 'merge-intervals', 'maximum-subarray'],
        topicKeywords: ['tree', 'interval', 'dynamic programming'],
      },
    ],
  },
  {
    id: 'topic-dp',
    category: 'topic',
    title: 'Dynamic Programming Invariants',
    subtitle: 'Optimal Substructure & State Transitions',
    description:
      'Demystify DP by treating every recurrence as a topological traversal over DAG state spaces.',
    badge: 'Topic Mastery',
    estHours: '22 hrs',
    accentHex: '#A78BFA',
    recommendedFor: 'Turning DP intuition into repeatable state tables',
    steps: [
      {
        id: 'dp-1d',
        stepNumber: 1,
        title: '1D Linear & Prefix Recurrences',
        focus: 'Kadane subarrays, stock state machines, and Fibonacci transitions.',
        targetCount: 15,
        prioritySlugs: ['maximum-subarray', 'best-time-to-buy-and-sell-stock'],
        topicKeywords: ['dynamic programming', 'dp', 'greedy', 'array'],
      },
      {
        id: 'dp-2d-strings',
        stepNumber: 2,
        title: '2D Grid, Strings & Subsequences',
        focus: 'Center expansion tables, LCS, and edit-distance grid invariants.',
        targetCount: 18,
        prioritySlugs: ['longest-palindromic-substring'],
        topicKeywords: ['dynamic programming', 'string', 'matrix'],
        difficulties: ['medium', 'hard'],
      },
      {
        id: 'dp-advanced',
        stepNumber: 3,
        title: 'Partition, Knapsack & Optimization',
        focus: 'Bounded subset sums, decision trees, and hard state compression.',
        targetCount: 12,
        prioritySlugs: [],
        topicKeywords: ['dynamic programming', 'bitmask', 'memoization'],
        difficulties: ['medium', 'hard'],
      },
    ],
  },
  {
    id: 'topic-binary-search',
    category: 'topic',
    title: 'Monotonic Search & Two Pointers',
    subtitle: 'Bounds, Bisection & Contraction',
    description:
      'Eliminate off-by-one bugs by locking loop invariants on [low, high] and [left, right] pointer intervals.',
    badge: 'Invariant Focus',
    estHours: '14 hrs',
    accentHex: '#38BDF8',
    recommendedFor: 'Mastering exact binary search and pointer bounds',
    steps: [
      {
        id: 'bs-sorted-rotated',
        stepNumber: 1,
        title: '1D Bisection & Rotated Spaces',
        focus: 'Half-space elimination invariants on sorted and pivoted arrays.',
        targetCount: 15,
        prioritySlugs: ['search-in-rotated-sorted-array', 'koko-eating-bananas'],
        topicKeywords: ['binary search', 'search', 'sorting'],
      },
      {
        id: 'bs-two-pointers',
        stepNumber: 2,
        title: 'Bidirectional Pointer Contraction',
        focus: 'Shrinking envelopes and multi-pointer deduplication.',
        targetCount: 15,
        prioritySlugs: [
          '3sum',
          'container-with-most-water',
          'trapping-rain-water',
          'longest-substring-without-repeating-characters',
        ],
        topicKeywords: ['two pointer', 'sliding window', 'monotonic'],
      },
    ],
  },
  {
    id: 'goal-30-day-sprint',
    category: 'goal',
    title: '30-Day Intensive Sprint',
    subtitle: 'Time-Boxed 4-Week Placement Ramp',
    description:
      'Balanced 4-week sequence moving from core arrays and pointers to graphs, heaps, and high-yield dynamic programming.',
    badge: '30-Day Sprint',
    estHours: '28 hrs',
    accentHex: '#34D399',
    recommendedFor: 'Upcoming campus placement or onsite in 4 weeks',
    steps: [
      {
        id: 'sprint-w1',
        stepNumber: 1,
        title: 'Week 1: Hashing, Pointers & Windows',
        focus: 'Build speed on O(n) hash scans and sliding window mechanics.',
        targetCount: 15,
        prioritySlugs: [
          'two-sum',
          'best-time-to-buy-and-sell-stock',
          '3sum',
          'longest-substring-without-repeating-characters',
        ],
        topicKeywords: ['array', 'hash', 'two pointer', 'sliding window'],
      },
      {
        id: 'sprint-w2',
        stepNumber: 2,
        title: 'Week 2: Binary Search, Stacks & Heaps',
        focus: 'Search invariants, delimiter grammars, and top-k priority queues.',
        targetCount: 15,
        prioritySlugs: [
          'valid-parentheses',
          'search-in-rotated-sorted-array',
          'top-k-frequent-elements',
          'merge-intervals',
        ],
        topicKeywords: ['binary search', 'stack', 'heap', 'interval'],
      },
      {
        id: 'sprint-w3',
        stepNumber: 3,
        title: 'Week 3: Trees, Design & Graph BFS',
        focus: 'Subtree recursion, LRU structures, and BFS/DFS traversals.',
        targetCount: 15,
        prioritySlugs: [
          'maximum-depth-of-binary-tree',
          'lru-cache',
          'number-of-islands',
          'rotting-oranges',
        ],
        topicKeywords: ['tree', 'graph', 'bfs', 'design'],
      },
      {
        id: 'sprint-w4',
        stepNumber: 4,
        title: 'Week 4: Topo Sort, DP & Hard Traps',
        focus: 'DAG cycles, Kadane/palindrome DP, and envelope stack classics.',
        targetCount: 15,
        prioritySlugs: [
          'course-schedule',
          'maximum-subarray',
          'longest-palindromic-substring',
          'trapping-rain-water',
        ],
        topicKeywords: ['dynamic programming', 'graph', 'monotonic'],
      },
    ],
  },
  {
    id: 'beginner-foundations',
    category: 'beginner',
    title: 'Algorithmic Zero-to-One',
    subtitle: 'Beginner Pathway & Core Fluency',
    description:
      'Gentle launchpad building confidence with easy and foundational medium problems across hash maps, pointers, stacks, and trees.',
    badge: 'Beginner 0→1',
    estHours: '18 hrs',
    accentHex: '#38BDF8',
    recommendedFor: 'First-time DSA learners building daily momentum',
    steps: [
      {
        id: 'beg-basics',
        stepNumber: 1,
        title: 'Warmups, Strings & Hash Lookups',
        focus: 'Constant-time complement tests and anagram canonical keys.',
        targetCount: 14,
        prioritySlugs: ['two-sum', 'best-time-to-buy-and-sell-stock', 'group-anagrams'],
        topicKeywords: ['array', 'hash', 'string', 'math'],
        difficulties: ['easy'],
      },
      {
        id: 'beg-pointers-stacks',
        stepNumber: 2,
        title: 'Pointers, Stacks & Basic Search',
        focus: 'Bracket matching, sorted intervals, and rotated binary search.',
        targetCount: 14,
        prioritySlugs: [
          'valid-parentheses',
          'container-with-most-water',
          'search-in-rotated-sorted-array',
        ],
        topicKeywords: ['stack', 'two pointer', 'binary search', 'sorting'],
        difficulties: ['easy', 'medium'],
      },
      {
        id: 'beg-trees-dp',
        stepNumber: 3,
        title: 'First Trees & Subarray Recurrence',
        focus: 'Recursive tree depth, mirroring, and Kadane subarray tracking.',
        targetCount: 12,
        prioritySlugs: ['maximum-depth-of-binary-tree', 'invert-binary-tree', 'maximum-subarray'],
        topicKeywords: ['tree', 'recursion', 'dynamic programming'],
        difficulties: ['easy', 'medium'],
      },
    ],
  },
];

const INVARIANT_BY_SLUG = new Map<string, string>(
  EXTENDED_CATALOG_PROBLEMS.map((item) => [item.slug, item.keyInvariant])
);

const LAST_SHEET_STORAGE_KEY = 'chakriva_last_opened_sheet_v1';

export function getSavedLastSheetId(): string | null {
  try {
    return localStorage.getItem(LAST_SHEET_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLastSheetId(sheetId: string): void {
  try {
    localStorage.setItem(LAST_SHEET_STORAGE_KEY, sheetId);
  } catch {
    // ignore storage errors
  }
}

export function getSheetById(sheetId?: string | null): SheetDefinition | undefined {
  if (!sheetId) return undefined;
  return SHEETS_CATALOG.find((s) => s.id === sheetId);
}

export function resolveSheetCategoryQuery(raw: string | null): 'all' | SheetCategory {
  if (!raw) return 'all';
  const normalized = raw.toLowerCase().trim();
  if (normalized === 'chakriva' || normalized === 'flagship') return 'chakriva';
  if (normalized === 'company' || normalized === 'companies') return 'company';
  if (normalized === 'topic' || normalized === 'topics') return 'topic';
  if (normalized === 'goal' || normalized === 'sprint') return 'goal';
  if (normalized === 'beginner' || normalized === 'basics') return 'beginner';
  return 'all';
}

function resolveProblemStatus(
  problem: Problem,
  progressMap: Record<string, ProblemStatus>
): ProblemStatus {
  return (
    progressMap[problem.id] ||
    (problem.verniq_id ? progressMap[problem.verniq_id] : undefined) ||
    'todo'
  );
}

function difficultyRank(diff: Problem['difficulty']): number {
  if (diff === 'easy') return 0;
  if (diff === 'medium') return 1;
  return 2;
}

function matchesStepCriteria(
  problem: Problem,
  step: SheetStepDefinition
): boolean {
  if (step.difficulties && step.difficulties.length > 0 && !step.difficulties.includes(problem.difficulty)) {
    return false;
  }
  const haystack = `${problem.title} ${(problem.tags || []).join(' ')} ${problem.domain || ''}`.toLowerCase();
  return step.topicKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

/**
 * Resolves a SheetDefinition against the live Problem catalog & user progress.
 * Guarantees deterministic ordering, zero duplicate problems inside a sheet,
 * and strictly accurate counts grounded in resolved Problem records.
 */
export function resolveSheetSummary(
  sheet: SheetDefinition,
  problems: Problem[],
  progressMap: Record<string, ProblemStatus>,
  revisionMap: Record<string, boolean>
): ResolvedSheetSummary {
  const bySlug = new Map<string, Problem>();
  for (const p of problems) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, p);
  }

  // Sort candidate pool once: published first, then Easy -> Medium -> Hard, then verniq_id
  const sortedCandidates = [...problems].sort((a, b) => {
    const pubDiff = Number(Boolean(b.is_published)) - Number(Boolean(a.is_published));
    if (pubDiff !== 0) return pubDiff;
    const dDiff = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
    if (dDiff !== 0) return dDiff;
    return (a.verniq_id || a.slug).localeCompare(b.verniq_id || b.slug);
  });

  const usedSlugs = new Set<string>();
  const resolvedSteps: ResolvedSheetStep[] = [];

  for (const stepDef of sheet.steps) {
    const stepProblems: Problem[] = [];

    // 1. Add priority canonical slugs first (when present in loaded catalog)
    for (const slug of stepDef.prioritySlugs) {
      if (usedSlugs.has(slug)) continue;
      const found = bySlug.get(slug);
      if (found) {
        usedSlugs.add(slug);
        stepProblems.push(found);
      }
    }

    // 2. Fill remaining curated target slots with balanced difficulty distribution
    const matchingPool = sortedCandidates.filter(
      (candidate) => !usedSlugs.has(candidate.slug) && matchesStepCriteria(candidate, stepDef)
    );
    const remainingSlots = Math.max(0, stepDef.targetCount - stepProblems.length);

    if (remainingSlots > 0 && matchingPool.length > 0) {
      const allowedDiffs: Array<'easy' | 'medium' | 'hard'> =
        stepDef.difficulties && stepDef.difficulties.length > 0
          ? stepDef.difficulties
          : ['easy', 'medium', 'hard'];

      const ratios: Record<'easy' | 'medium' | 'hard', number> =
        allowedDiffs.length === 1
          ? { easy: 1, medium: 1, hard: 1 }
          : !allowedDiffs.includes('easy')
          ? { easy: 0, medium: 0.7, hard: 0.3 }
          : { easy: 0.3, medium: 0.5, hard: 0.2 };

      // Count already-picked priority problems per difficulty
      const alreadyByDiff = { easy: 0, medium: 0, hard: 0 };
      for (const p of stepProblems) {
        alreadyByDiff[p.difficulty] += 1;
      }

      const desiredTotal = stepProblems.length + remainingSlots;
      for (const diff of allowedDiffs) {
        const diffTarget = Math.max(
          0,
          Math.round(desiredTotal * ratios[diff]) - alreadyByDiff[diff]
        );
        let pickedForDiff = 0;
        for (const candidate of matchingPool) {
          if (stepProblems.length >= stepDef.targetCount || pickedForDiff >= diffTarget) break;
          if (usedSlugs.has(candidate.slug) || candidate.difficulty !== diff) continue;
          usedSlugs.add(candidate.slug);
          stepProblems.push(candidate);
          pickedForDiff += 1;
        }
      }

      // Top up any leftover slots (if a difficulty bucket had fewer items) in sorted candidate order
      for (const candidate of matchingPool) {
        if (stepProblems.length >= stepDef.targetCount) break;
        if (usedSlugs.has(candidate.slug)) continue;
        usedSlugs.add(candidate.slug);
        stepProblems.push(candidate);
      }

      // Present problems in canonical progression: Easy -> Medium -> Hard
      stepProblems.sort((a, b) => {
        const dDiff = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
        if (dDiff !== 0) return dDiff;
        return (a.verniq_id || a.slug).localeCompare(b.verniq_id || b.slug);
      });
    }

    const wrapped: ResolvedSheetProblem[] = stepProblems.map((prob) => ({
      problem: prob,
      status: resolveProblemStatus(prob, progressMap),
      isBookmarked: Boolean(revisionMap[prob.id]),
      keyInvariant: INVARIANT_BY_SLUG.get(prob.slug),
    }));

    const solvedCount = wrapped.filter((w) => w.status === 'solved').length;
    const attemptedCount = wrapped.filter((w) => w.status === 'attempted').length;

    resolvedSteps.push({
      definition: stepDef,
      problems: wrapped,
      solvedCount,
      attemptedCount,
      totalCount: wrapped.length,
    });
  }

  const allProblems = resolvedSteps.flatMap((s) => s.problems);
  const totalCount = allProblems.length;
  const solvedCount = allProblems.filter((p) => p.status === 'solved').length;
  const attemptedCount = allProblems.filter((p) => p.status === 'attempted').length;
  const bookmarkedCount = allProblems.filter((p) => p.isBookmarked).length;

  const difficultyCounts = {
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  };

  for (const item of allProblems) {
    const bucket = difficultyCounts[item.problem.difficulty];
    bucket.total += 1;
    if (item.status === 'solved') {
      bucket.solved += 1;
    }
  }

  return {
    definition: sheet,
    steps: resolvedSteps,
    allProblems,
    totalCount,
    solvedCount,
    attemptedCount,
    bookmarkedCount,
    completionPercent: totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0,
    difficultyCounts,
  };
}
