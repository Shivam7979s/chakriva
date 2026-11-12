/**
 * CHAKRIVA Canonical Catalog Registry
 * ===================================
 * Single source of truth for problem selection, curriculum topic binding,
 * and execution readiness invariants.
 *
 * All records strictly map to master dataset `verniq_all_3392_with_topics.csv`
 * and Supabase DB tables.
 *
 * INVARIANT: Never fabricate identifiers, slugs, or test readiness.
 * Distinguishes educational relevance from execution availability and judge readiness.
 */

export interface CatalogProblemItem {
  verniqProblemId: string;
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  acceptanceRate: number;
  estimatedMinutes: number;
  keyInvariant: string;
  isPublished: boolean;
  isJudgeReady: boolean;
  workflowStatus: 'published' | 'draft' | 'content_review' | 'technical_review' | 'archived';
  companies: string[];
}

export type CurriculumTopic = string;
export type CanonicalProblemEntry = CatalogProblemItem;


/**
 * 1. The 11 Baseline Verified Canonical Problems (from Phase 3A.1)
 * Guaranteed 100% published and JUDGE_READY.
 */
export const BASELINE_CANONICAL_PROBLEMS: CatalogProblemItem[] = [
  {
    verniqProblemId: 'VRQ-000001',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    topic: 'Arrays & Hashing',
    acceptanceRate: 82.4,
    estimatedMinutes: 25,
    keyInvariant: 'Complement lookup in single-pass hash map: table contains all elements in 0..i-1.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
  },
  {
    verniqProblemId: 'VRQ-000006',
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    topic: 'Arrays & Hashing',
    acceptanceRate: 76.5,
    estimatedMinutes: 20,
    keyInvariant: 'Minimum valley tracking: min_price strictly tracks the lowest buying opportunity in 0..i.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000016',
    slug: '3sum',
    title: '3Sum',
    difficulty: 'medium',
    topic: 'Two Pointers',
    acceptanceRate: 68.2,
    estimatedMinutes: 35,
    keyInvariant: 'Sorted anchor with convergent bidirectional pointers; duplicate elements skipped at both ends.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000012',
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'medium',
    topic: 'Two Pointers',
    acceptanceRate: 71.8,
    estimatedMinutes: 30,
    keyInvariant: 'Greedy inward contraction: strictly move the shorter boundary because width shrinks monotonically.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
  },
  {
    verniqProblemId: 'VRQ-000004',
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    topic: 'Stacks & Queues',
    acceptanceRate: 79.1,
    estimatedMinutes: 20,
    keyInvariant: 'LIFO bracket grammar validation: every closing delimiter must match the top opening delimiter.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000005',
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    topic: 'Sliding Window',
    acceptanceRate: 64.7,
    estimatedMinutes: 30,
    keyInvariant: 'Dynamic rightward window expansion with left-pointer jumps to last_seen[char] + 1 on collisions.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
  },
  {
    verniqProblemId: 'VRQ-000018',
    slug: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    topic: 'Binary Search',
    acceptanceRate: 62.3,
    estimatedMinutes: 35,
    keyInvariant: 'Half-space monotonicity: in any rotated array, at least one half [low..mid] or [mid..high] is strictly sorted.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000003',
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'medium',
    topic: 'Intervals & Sorting',
    acceptanceRate: 69.4,
    estimatedMinutes: 30,
    keyInvariant: 'Start-time sorting invariant: if current.start <= prev.end, intervals overlap and merge to max(prev.end, current.end).',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000002',
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'medium',
    topic: 'Composite Design & Caching',
    acceptanceRate: 60.1,
    estimatedMinutes: 45,
    keyInvariant: 'Composite invariant: doubly-linked list maintains exact recency order while hash map guarantees O(1) node lookup.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000010',
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    topic: 'Monotonic Stacks & Two Pointers',
    acceptanceRate: 58.6,
    estimatedMinutes: 45,
    keyInvariant: 'Envelope height invariant: trapped water at position i is strictly bounded by min(left_max, right_max) - height[i].',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000137',
    slug: 'maximum-depth-of-binary-tree',
    title: 'Maximum Depth of Binary Tree',
    difficulty: 'easy',
    topic: 'Binary Trees',
    acceptanceRate: 83.5,
    estimatedMinutes: 20,
    keyInvariant: 'Subtree depth recursion: max_depth(root) = 1 + max(max_depth(root.left), max_depth(root.right)) with base case max_depth(null) = 0.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'],
  },
];

/**
 * 2. Expanded Curriculum Catalog from Authoritative Problem Dataset
 * Spans non-linear topics: Graphs, Dynamic Programming, Heaps, Trees, advanced search.
 * Includes both published/judge_ready and draft/content_gap items to test honest status representation.
 */
export const EXTENDED_CATALOG_PROBLEMS: CatalogProblemItem[] = [
  ...BASELINE_CANONICAL_PROBLEMS,
  // Graphs & Topological Traversal
  {
    verniqProblemId: 'VRQ-000007',
    slug: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'medium',
    topic: 'Graphs',
    acceptanceRate: 67.5,
    estimatedMinutes: 35,
    keyInvariant: 'Connected component traversal: visiting a land cell flips it to water or marks visited, preventing re-visitation cycles.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000013',
    slug: 'rotting-oranges',
    title: 'Rotting Oranges',
    difficulty: 'medium',
    topic: 'Graphs',
    acceptanceRate: 61.2,
    estimatedMinutes: 35,
    keyInvariant: 'Multi-source BFS level-by-level diffusion: queue maintains simultaneous wavefront progress, yielding minimal elapsed time.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Amazon', 'Microsoft', 'Uber'],
  },
  {
    verniqProblemId: 'VRQ-000022',
    slug: 'course-schedule',
    title: 'Course Schedule',
    difficulty: 'medium',
    topic: 'Graphs',
    acceptanceRate: 59.8,
    estimatedMinutes: 40,
    keyInvariant: 'Directed Acyclic Graph cycle detection: Kahns in-degree BFS or 3-color DFS states (unvisited, visiting, visited).',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
  },
  // Dynamic Programming
  {
    verniqProblemId: 'VRQ-000011',
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'medium',
    topic: 'Dynamic Programming',
    acceptanceRate: 74.3,
    estimatedMinutes: 25,
    keyInvariant: 'Kadane prefix recovery: current_subarray = max(num, current_subarray + num). Reset when previous prefix contribution becomes negative.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Microsoft', 'Apple'],
  },
  {
    verniqProblemId: 'VRQ-000009',
    slug: 'longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    difficulty: 'medium',
    topic: 'Dynamic Programming',
    acceptanceRate: 55.4,
    estimatedMinutes: 35,
    keyInvariant: 'Center expansion / DP table: P(i,j) = P(i+1, j-1) && s[i] == s[j]. Symmetric boundary expansion.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
  },
  // Heaps & Priority Queues
  {
    verniqProblemId: 'VRQ-000015',
    slug: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    difficulty: 'medium',
    topic: 'Heaps & Priority Queues',
    acceptanceRate: 65.8,
    estimatedMinutes: 30,
    keyInvariant: 'Bounded min-heap of size k retains the k largest frequencies in O(n log k) time.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Amazon', 'Meta', 'Google'],
  },
  {
    verniqProblemId: 'VRQ-000027',
    slug: 'kth-largest-element-in-an-array',
    title: 'Kth Largest Element in an Array',
    difficulty: 'medium',
    topic: 'Heaps & Priority Queues',
    acceptanceRate: 66.9,
    estimatedMinutes: 30,
    keyInvariant: 'Quickselect partition or min-heap size k: the root holds the kth largest element upon processing all inputs.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Meta', 'Amazon', 'Google'],
  },
  // Advanced Binary Search
  {
    verniqProblemId: 'VRQ-000025',
    slug: 'koko-eating-bananas',
    title: 'Koko Eating Bananas',
    difficulty: 'medium',
    topic: 'Binary Search',
    acceptanceRate: 63.1,
    estimatedMinutes: 35,
    keyInvariant: 'Binary search on monotonic answer space: feasible(speed) is non-decreasing; search smallest speed satisfying hours <= h.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Airbnb'],
  },
  // Additional Arrays & Hashing
  {
    verniqProblemId: 'VRQ-000008',
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'medium',
    topic: 'Arrays & Hashing',
    acceptanceRate: 72.0,
    estimatedMinutes: 30,
    keyInvariant: 'Canonical anagram key hashing: character count tuple or sorted string forms a unique bucket identifier.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Amazon', 'Apple', 'Meta'],
  },
  {
    verniqProblemId: 'VRQ-000029',
    slug: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    difficulty: 'medium',
    topic: 'Arrays & Hashing',
    acceptanceRate: 61.4,
    estimatedMinutes: 30,
    keyInvariant: 'Sequence head test: only start counting sequence length if num - 1 is not in the hash set, guaranteeing O(n) total checks.',
    isPublished: true,
    isJudgeReady: true,
    workflowStatus: 'published',
    companies: ['Google', 'Amazon', 'Microsoft'],
  },
  // Educational Draft / Content-Gap Record (For Profile F Testing)
  // Real record in master CSV (row 392), but status is draft and not judge-ready
  {
    verniqProblemId: 'VRQ-000392',
    slug: 'invert-binary-tree',
    title: 'Invert Binary Tree',
    difficulty: 'easy',
    topic: 'Binary Trees',
    acceptanceRate: 85.0,
    estimatedMinutes: 20,
    keyInvariant: 'Structural mirror swapping: left and right children are swapped recursively across all subtrees.',
    isPublished: false,
    isJudgeReady: false,
    workflowStatus: 'draft',
    companies: ['Google', 'Amazon'],
  },
];

/**
 * Lookup helper: finds catalog item by canonical ID or slug
 */
export function findCatalogProblem(identifier: string): CatalogProblemItem | undefined {
  return EXTENDED_CATALOG_PROBLEMS.find(
    (p) => p.verniqProblemId === identifier || p.slug === identifier
  );
}

/**
 * Filter catalog problems by topic
 */
export function getCatalogProblemsByTopic(topic: string): CatalogProblemItem[] {
  return EXTENDED_CATALOG_PROBLEMS.filter((p) => p.topic.toLowerCase() === topic.toLowerCase());
}
