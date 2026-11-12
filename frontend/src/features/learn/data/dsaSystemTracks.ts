import type { LearnTrack } from '../types/learn';

export const DSA_AND_SYSTEM_TRACKS: LearnTrack[] = [
  // =========================================================================
  // DSA TAB (?open=dsa)
  // =========================================================================
  {
    id: 'track-dsa-foundations',
    slug: 'cpp-dsa-foundations',
    category: 'dsa',
    sectionLabel: 'Start Coding',
    sectionBadge: 'Foundations Track',
    iconKey: 'foundations',
    title: 'C++ & Algorithmic Thinking Foundations',
    shortTitle: 'C++ & Foundations',
    subtitle:
      'Build rock-solid memory intuition, STL containers, hash lookups, and complexity bounds before tackling interview sheets.',
    levelBadge: 'Start Here · Foundations',
    totalMinutes: 65,
    prerequisites: ['Basic Programming Syntax'],
    environmentLabel: 'Judge-Verified Starter Problems',
    isJudgeBacked: true,
    lessons: [
      {
        id: 'foundations-hash-valley',
        slug: 'single-pass-hash-valley',
        moduleTitle: 'Module 1 · Complexity & Prefix Memory',
        title: 'Single-Pass Hash Lookup & Prefix Valley Tracking',
        summary:
          'Convert O(n^2) nested pair scans into strict O(n) single-pass sweeps by preserving a prefix state invariant.',
        estimatedMinutes: 35,
        difficulty: 'foundation',
        keyInvariant:
          'Before inspecting index i, the hash table (or running extrema) contains the exact complete history of indices 0..i-1.',
        mentalModel:
          'Instead of asking "which future element pairs with me?", walk forward once and ask "did a valid partner already appear behind me?"',
        sections: [
          {
            heading: 'Why Single-Pass Beats Sorting Here',
            body: 'Sorting destroys original indices and costs O(n log n). By scanning left-to-right and indexing seen values into a hash map after checking the complement, every lookup runs in amortized O(1) while preserving exact index identity.',
            bullets: [
              'Always check for (target - nums[i]) BEFORE inserting nums[i] so an index never pairs with itself.',
              'For single-buy / single-sell problems, replace the hash map with a single monotonic scalar: minPriceSeenSoFar.',
            ],
          },
          {
            heading: 'Generalizing to Prefix Sum Maps',
            body: 'The exact same prefix-before-current invariant extends from Two Sum to Subarray Sum Equals K: storing prefixSum frequencies in 0..i-1 lets you count valid windows ending at i in O(1).',
          },
        ],
        interactiveTrace: {
          title: 'Dry Run: Two Sum on nums = [2, 11, 7, 15], target = 9',
          subtitle: 'Step through how the prefix hash map evolves without self-pairing.',
          steps: [
            {
              stepNumber: 1,
              title: 'i = 0, val = 2 -> need 7',
              stateSummary: 'Lookup 7 in seen{} -> miss. Insert 2 -> 0 into seen.',
              highlights: [
                { label: 'Current i', value: '0 (val=2)', tone: 'sapphire' },
                { label: 'Complement', value: '9 - 2 = 7 (Miss)', tone: 'amber' },
                { label: 'seen map', value: '{ 2: 0 }', tone: 'violet' },
              ],
              pointerNote: 'Check happens before insert so val=2 never falsely matches itself if target were 4.',
            },
            {
              stepNumber: 2,
              title: 'i = 1, val = 11 -> need -2',
              stateSummary: 'Lookup -2 in seen{} -> miss. Insert 11 -> 1 into seen.',
              highlights: [
                { label: 'Current i', value: '1 (val=11)', tone: 'sapphire' },
                { label: 'Complement', value: '9 - 11 = -2 (Miss)', tone: 'amber' },
                { label: 'seen map', value: '{ 2: 0, 11: 1 }', tone: 'violet' },
              ],
              pointerNote: 'Map strictly holds indices strictly less than i.',
            },
            {
              stepNumber: 3,
              title: 'i = 2, val = 7 -> need 2 (HIT!)',
              stateSummary: 'Lookup 2 in seen{} -> found at index 0. Return [0, 2].',
              highlights: [
                { label: 'Current i', value: '2 (val=7)', tone: 'sapphire' },
                { label: 'Complement', value: '9 - 7 = 2 -> idx 0', tone: 'teal' },
                { label: 'Result', value: '[0, 2]', tone: 'teal' },
              ],
              pointerNote: 'Single pass terminates cleanly at O(n) time, O(n) space.',
            },
          ],
        },
        codeTemplates: [
          {
            language: 'cpp',
            label: 'C++',
            complexity: 'Time O(n) · Space O(n)',
            code: `unordered_map<int, int> seen;
for (int i = 0; i < (int)nums.size(); ++i) {
    int comp = target - nums[i];
    if (seen.count(comp)) return {seen[comp], i};
    seen[nums[i]] = i;
}`,
          },
          {
            language: 'python',
            label: 'Python',
            complexity: 'Time O(n) · Space O(n)',
            code: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for i, x in enumerate(nums):
        comp = target - x
        if comp in seen:
            return [seen[comp], i]
        seen[x] = i
    return []`,
          },
          {
            language: 'java',
            label: 'Java',
            complexity: 'Time O(n) · Space O(n)',
            code: `Map<Integer, Integer> seen = new HashMap<>();
for (int i = 0; i < nums.length; i++) {
    int comp = target - nums[i];
    if (seen.containsKey(comp)) {
        return new int[] { seen.get(comp), i };
    }
    seen.put(nums[i], i);
}`,
          },
        ],
        pitfalls: [
          'Populating the hash map in a pre-pass breaks duplicate handling (e.g. target=6, nums=[3, 3]) unless you carefully track indices.',
          'In valley-tracking (Buy & Sell Stock), initializing minPrice = 0 instead of +Infinity fails whenever stock prices are positive.',
        ],
        microCheck: {
          prompt: 'Why must complement lookup execute BEFORE seen.set(nums[i], i) in Two Sum?',
          options: [
            'To reduce hash table memory allocations by half',
            'To prevent an element at index i from pairing with itself when 2 * nums[i] == target',
            'To guarantee output indices are always sorted descending',
          ],
          correctIndex: 1,
          explanation:
            'Checking first ensures seen only contains elements from 0..i-1, making self-pairing mathematically impossible.',
        },
        linkedProblemSlugs: ['two-sum', 'best-time-to-buy-and-sell-stock'],
        linkedTopics: ['Arrays & Hashing'],
      },
      {
        id: 'foundations-delimiter-stacks',
        slug: 'stl-stacks-interval-basics',
        moduleTitle: 'Module 2 · Linear Containers & Recursion Base Cases',
        title: 'Stack Grammar Matching & Tree Recursion Base Cases',
        summary:
          'Validate nested structures in O(n) with explicit stacks and write leak-free recursive tree traversals.',
        estimatedMinutes: 30,
        difficulty: 'foundation',
        keyInvariant:
          'At any closing delimiter, the top of the stack holds the most recent unmatched opening token; once matched, pop immediately.',
        mentalModel:
          'Recursion uses the hardware call stack identically—trust the base case (`node == null -> 0`) and combine child results cleanly.',
        sections: [
          {
            heading: 'STL Containers to Know Cold',
            body: 'Master `vector`, `unordered_map`, `stack`, and `queue` time bounds so container selection becomes automatic in interviews.',
          },
        ],
        linkedProblemSlugs: ['valid-parentheses', 'maximum-depth-of-binary-tree'],
        linkedTopics: ['Stacks & Queues', 'Binary Trees'],
      },
    ],
  },
  {
    id: 'track-dsa-patterns',
    slug: 'dsa-patterns',
    subjectId: 'dsa',
    category: 'dsa',
    sectionLabel: 'Learn From Zero',
    sectionBadge: 'Flagship A2Z Track',
    iconKey: 'a2z',
    title: 'CHAKRIVA A2Z Pattern & Invariant Sheet',
    shortTitle: 'A2Z Pattern Sheet',
    subtitle:
      'Step-by-step mastery from array invariants and monotonic windows to rotated binary search, sorted sweeps, and composite caching.',
    levelBadge: 'Flagship · All Levels',
    totalMinutes: 165,
    prerequisites: ['Arrays & Complexity Analysis', 'Hash Tables'],
    environmentLabel: 'Linked to Canonical VRQ Catalog',
    isJudgeBacked: true,
    lessons: [
      {
        id: 'dsa-hash-lookup-valley',
        slug: 'hash-lookup-valley-tracking',
        moduleTitle: 'Module 1 · Arrays & Hashing Invariants',
        title: 'Single-Pass Hash Lookup & Prefix Valley Tracking',
        summary:
          'Convert O(n^2) nested pair scans into strict O(n) single-pass sweeps by preserving a prefix state invariant.',
        estimatedMinutes: 35,
        difficulty: 'foundation',
        keyInvariant:
          'Before inspecting index i, the hash table (or running extrema) contains the exact complete history of indices 0..i-1.',
        mentalModel:
          'Instead of asking "which future element pairs with me?", walk forward once and ask "did a valid partner already appear behind me?"',
        sections: [
          {
            heading: 'Why Single-Pass Beats Sorting Here',
            body: 'Sorting destroys original indices and costs O(n log n). By scanning left-to-right and indexing seen values into a hash map after checking the complement, every lookup runs in amortized O(1) while preserving exact index identity.',
            bullets: [
              'Always check for (target - nums[i]) BEFORE inserting nums[i] so an index never pairs with itself.',
              'For single-buy / single-sell problems, replace the hash map with a single monotonic scalar: minPriceSeenSoFar.',
            ],
          },
        ],
        interactiveTrace: {
          title: 'Dry Run: Two Sum on nums = [2, 11, 7, 15], target = 9',
          subtitle: 'Step through how the prefix hash map evolves without self-pairing.',
          steps: [
            {
              stepNumber: 1,
              title: 'i = 0, val = 2 -> need 7',
              stateSummary: 'Lookup 7 in seen{} -> miss. Insert 2 -> 0 into seen.',
              highlights: [
                { label: 'Current i', value: '0 (val=2)', tone: 'sapphire' },
                { label: 'Complement', value: '9 - 2 = 7 (Miss)', tone: 'amber' },
                { label: 'seen map', value: '{ 2: 0 }', tone: 'violet' },
              ],
              pointerNote: 'Check happens before insert so val=2 never falsely matches itself.',
            },
            {
              stepNumber: 2,
              title: 'i = 2, val = 7 -> need 2 (HIT!)',
              stateSummary: 'Lookup 2 in seen{} -> found at index 0. Return [0, 2].',
              highlights: [
                { label: 'Current i', value: '2 (val=7)', tone: 'sapphire' },
                { label: 'Complement', value: '9 - 7 = 2 -> idx 0', tone: 'teal' },
                { label: 'Result', value: '[0, 2]', tone: 'teal' },
              ],
              pointerNote: 'Single pass terminates cleanly at O(n) time, O(n) space.',
            },
          ],
        },
        codeTemplates: [
          {
            language: 'python',
            label: 'Python',
            complexity: 'Time O(n) · Space O(n)',
            code: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for i, x in enumerate(nums):
        comp = target - x
        if comp in seen:
            return [seen[comp], i]
        seen[x] = i
    return []`,
          },
          {
            language: 'typescript',
            label: 'TypeScript',
            complexity: 'Time O(n) · Space O(n)',
            code: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (seen.has(comp)) return [seen.get(comp)!, i];
    seen.set(nums[i], i);
  }
  return [];
}`,
          },
        ],
        microCheck: {
          prompt: 'Why must complement lookup execute BEFORE seen.set(nums[i], i) in Two Sum?',
          options: [
            'To reduce hash table memory allocations by half',
            'To prevent an element at index i from pairing with itself when 2 * nums[i] == target',
            'To guarantee output indices are always sorted descending',
          ],
          correctIndex: 1,
          explanation:
            'Checking first ensures seen only contains elements from 0..i-1.',
        },
        linkedProblemSlugs: ['two-sum', 'best-time-to-buy-and-sell-stock'],
        linkedTopics: ['Arrays & Hashing'],
      },
      {
        id: 'dsa-two-pointers-window',
        slug: 'two-pointers-sliding-window',
        moduleTitle: 'Module 2 · Two Pointers & Sliding Windows',
        title: 'Monotonic Two Pointers & Sliding Window Contraction',
        summary:
          'Shrink search boundaries deterministically without missing optimal pairs or substrings.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'Every pointer movement discards strictly suboptimal candidates: either window [L, R] restores validity, or the shorter boundary cannot exceed current area.',
        mentalModel:
          'Think of [L, R] as an elastic band. Expand R to explore; contract L only until the window invariant holds again.',
        sections: [
          {
            heading: 'Two Complementary Pointer Patterns',
            body: 'Two pointers appear in two primary shapes: opposite-ends convergence on sorted or height arrays (3Sum, Container With Most Water), and same-direction sliding windows over contiguous slices (Longest Substring Without Repeating Characters).',
            bullets: [
              'Opposite ends (L=0, R=n-1): advance whichever side is the bottleneck.',
              'Same direction (L=0, R=0..n-1): store lastSeen index to jump L cleanly.',
              'In 3Sum, skip adjacent duplicates both on the anchor loop AND after finding a matching pair.',
            ],
          },
        ],
        interactiveTrace: {
          title: 'Dry Run: Sliding Window on s = "abca"',
          subtitle: 'Maintain zero duplicate characters inside [L..R].',
          steps: [
            {
              stepNumber: 1,
              title: 'Expand R=0..2 -> "abc"',
              stateSummary: 'All characters distinct. Window [0..2], best = 3.',
              highlights: [
                { label: '[L, R]', value: '[0, 2]', tone: 'sapphire' },
                { label: 'Window', value: '"abc"', tone: 'teal' },
                { label: 'Best Len', value: '3', tone: 'teal' },
              ],
              pointerNote: 'lastIndex = { a:0, b:1, c:2 }.',
            },
            {
              stepNumber: 2,
              title: 'R=3 reads duplicate "a"',
              stateSummary: 'Previous "a" was at index 0 >= L(0). Jump L = max(L, 0 + 1) = 1.',
              highlights: [
                { label: 'Collision', value: "'a' @ idx 0", tone: 'amber' },
                { label: 'Jump L', value: '0 -> 1', tone: 'sapphire' },
                { label: 'Window [1..3]', value: '"bca" (valid)', tone: 'teal' },
              ],
              pointerNote: 'Using max(L, prev+1) guarantees L never moves backward.',
            },
          ],
        },
        pitfalls: [
          'Forgetting `lastSeen[ch] >= left` causes `left` to jump backward on strings like "abba".',
        ],
        microCheck: {
          prompt: 'On string "abba", why is `left = Math.max(left, prev + 1)` required when processing the final "a"?',
          options: [
            'Because "a" at index 0 sits left of current left=2; blindly setting left=1 would re-include duplicate "b"',
            'To avoid string index out-of-bounds',
            'Because ASCII comparison is case-insensitive',
          ],
          correctIndex: 0,
          explanation: 'Only indices >= left invalidate the active window.',
        },
        linkedProblemSlugs: [
          'longest-substring-without-repeating-characters',
          'container-with-most-water',
          '3sum',
          'trapping-rain-water',
        ],
        linkedTopics: ['Two Pointers', 'Sliding Window'],
      },
      {
        id: 'dsa-binary-search-partition',
        slug: 'binary-search-monotonic-bisection',
        moduleTitle: 'Module 3 · Binary Search & Rotated Spaces',
        title: 'Binary Search Partition Invariants',
        summary:
          'Eliminate off-by-one bugs by reasoning strictly about sorted halves and monotonic predicates.',
        estimatedMinutes: 40,
        difficulty: 'intermediate',
        keyInvariant:
          'After bisecting a rotated sorted array at mid, at least one of [L..mid] or [mid..R] is strictly sorted.',
        mentalModel:
          'Never guess `L = mid` vs `L = mid + 1`. Test exact `<=` and `<` bounds on the confirmed sorted half.',
        sections: [
          {
            heading: 'Rotated Array Decision Tree',
            body: 'First test `nums[L] <= nums[mid]`: if true, `[L..mid]` is monotonically non-decreasing; otherwise `[mid..R]` must be sorted.',
          },
        ],
        interactiveTrace: {
          title: 'Dry Run: Search target = 0 in [4, 5, 6, 7, 0, 1, 2]',
          subtitle: 'Identify the sorted half on every probe.',
          steps: [
            {
              stepNumber: 1,
              title: 'L=0, R=6 -> mid=3 (val=7)',
              stateSummary: 'Left [4..7] is sorted (4 <= 7). Target 0 is NOT in [4, 7). Go right.',
              highlights: [
                { label: 'L / mid / R', value: '0 / 3 / 6', tone: 'sapphire' },
                { label: 'Sorted Half', value: 'Left [4..7]', tone: 'violet' },
                { label: 'Next Range', value: 'L = 4, R = 6', tone: 'amber' },
              ],
              pointerNote: 'Left half check uses `nums[L] <= target < nums[mid]`.',
            },
            {
              stepNumber: 2,
              title: 'L=4, R=6 -> mid=5 (val=1)',
              stateSummary: 'Left [0..1] is sorted (0 <= 1). Target 0 lies in [0, 1). Go left: R = 4.',
              highlights: [
                { label: 'L / mid / R', value: '4 / 5 / 6', tone: 'sapphire' },
                { label: 'Probe', value: 'nums[4]=0 -> FOUND', tone: 'teal' },
              ],
              pointerNote: 'Halves search space on every iteration: guaranteed O(log n).',
            },
          ],
        },
        linkedProblemSlugs: ['search-in-rotated-sorted-array'],
        linkedTopics: ['Binary Search'],
      },
      {
        id: 'dsa-stacks-intervals-trees',
        slug: 'stacks-intervals-trees-recursion',
        moduleTitle: 'Module 4 · Stacks, Intervals, Design & Trees',
        title: 'LIFO Grammar Stacks, Interval Sweeps & Tree Recursion',
        summary:
          'Recognize structural state machines: nested delimiters, sorted interval merges, O(1) LRU composition, and tree subtree depth.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'Recursive tree depth trusts the inductive base case (null -> 0); sorted interval sweep merges whenever curr.start <= prev.end.',
        mentalModel:
          'Pair linear scans with explicit stacks, sorted sweeps, DLL+HashMap LRU caches, or postorder recursion.',
        sections: [
          {
            heading: 'Choosing the Right Structural Primitive',
            body: 'Four workhorse patterns cover over 35% of coding round building blocks: parentheses stack matching, interval sorting + merge, O(1) LRU cache composition, and recursive tree depth.',
          },
        ],
        linkedProblemSlugs: [
          'valid-parentheses',
          'merge-intervals',
          'lru-cache',
          'maximum-depth-of-binary-tree',
        ],
        linkedTopics: ['Stacks & Queues', 'Intervals & Sorting', 'Composite Design & Caching', 'Binary Trees'],
      },
    ],
  },
  {
    id: 'track-dsa-product-india',
    slug: 'product-sde-patterns',
    category: 'dsa',
    sectionLabel: 'Interview Prep — India / Product',
    iconKey: 'patterns',
    title: 'CHAKRIVA Pattern Mastery 150',
    shortTitle: 'Pattern Mastery 150',
    subtitle:
      'High-signal patterns calibrated for Product SDE & FAANG loops: Two Pointers, Sliding Window, Monotonic Stack & Composite Design.',
    levelBadge: 'Product & FAANG Prep',
    totalMinutes: 90,
    prerequisites: ['Arrays & Hash Maps'],
    environmentLabel: 'Judge-Verified Pattern Track',
    isJudgeBacked: true,
    lessons: [
      {
        id: 'pm-window-contraction',
        slug: 'monotonic-windows-water-trapping',
        moduleTitle: 'Module 1 · High-Yield Pointer & Window Patterns',
        title: 'Window Contraction & Boundary Water Trapping',
        summary:
          'Unify Container With Most Water, 3Sum, and Trapping Rain Water under one clean monotonic elimination rule.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'Move the pointer facing the smaller boundary wall—because water trapped or max area is strictly bounded by the shorter side.',
        mentalModel:
          'Maintain running `maxLeft` and `maxRight` so each element settles in O(1) extra space.',
        sections: [
          {
            heading: 'O(1) Space Upgrade Over Prefix Arrays',
            body: 'Instead of allocating two O(n) prefix/suffix max arrays, converge inward from `L=0` and `R=n-1`: whenever `height[L] <= height[R]`, `maxLeft <= height[R]` guarantees `min(maxLeft, maxRight) == maxLeft`!',
          },
        ],
        linkedProblemSlugs: ['container-with-most-water', 'trapping-rain-water', '3sum'],
        linkedTopics: ['Two Pointers', 'Monotonic Stacks & Two Pointers'],
      },
      {
        id: 'pm-composite-caching',
        slug: 'composite-lru-interval-merge',
        moduleTitle: 'Module 2 · Composite Design & Sweep Intervals',
        title: 'O(1) LRU Cache Composition & Sorted Interval Merges',
        summary:
          'Combine Hash Map lookup with Doubly-Linked List pointer surgery and greedy interval absorption.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'Sentinel head/tail dummy nodes eliminate every null-edge branch in Doubly-Linked List detach & attach helpers.',
        mentalModel:
          'Always separate DLL `remove(node)` and `insertFront(node)` into two clean 4-line primitives.',
        sections: [
          {
            heading: 'Why Dummy Sentinels Prevent Bugs',
            body: 'With permanent `head` and `tail` sentinel nodes, removing the last real node or inserting into an empty list runs the exact same pointer updates as middle nodes.',
          },
        ],
        linkedProblemSlugs: ['lru-cache', 'merge-intervals'],
        linkedTopics: ['Composite Design & Caching', 'Intervals & Sorting'],
      },
    ],
  },
  {
    id: 'track-dsa-high-yield-75',
    slug: 'sde-high-yield-75',
    category: 'dsa',
    sectionLabel: 'Interview Prep — Global / Rapid',
    iconKey: 'sprint',
    title: 'Blind & SDE High-Yield Essentials',
    shortTitle: 'High-Yield Essentials',
    subtitle:
      'Focused high-leverage refresher for upcoming interviews: 1-pass hashes, substring windows, rotated bisection, and tree depth.',
    levelBadge: 'Rapid Sprint · High Yield',
    totalMinutes: 70,
    prerequisites: ['Prior Coding Familiarity'],
    environmentLabel: 'Judge-Verified Sprint',
    isJudgeBacked: true,
    lessons: [
      {
        id: 'hy-hash-substring',
        slug: 'fast-refresh-hashes-substrings',
        moduleTitle: 'Module 1 · Linear Scans & Windows',
        title: 'Hash Lookups & Non-Repeating Windows Under Time Pressure',
        summary: 'Zero-hesitation implementation patterns for round-1 phone screens.',
        estimatedMinutes: 35,
        difficulty: 'foundation',
        keyInvariant: 'Invariant checks (`seen.has` / `lastSeen >= left`) precede map mutation.',
        mentalModel: 'Rehearse clean edge checks on empty arrays, 1-element arrays, and all-duplicate strings.',
        sections: [
          {
            heading: 'Phone Screen Checklist',
            body: 'State time/space complexity before coding, dry-run on 2 edge cases, and keep helper mutations tiny.',
          },
        ],
        linkedProblemSlugs: [
          'two-sum',
          'best-time-to-buy-and-sell-stock',
          'longest-substring-without-repeating-characters',
        ],
      },
      {
        id: 'hy-bisection-trees',
        slug: 'fast-refresh-binary-search-trees',
        moduleTitle: 'Module 2 · Logarithmic Search & Recursion',
        title: 'Rotated Binary Search & Tree Depth Refresh',
        summary: 'Nail half-sorted bisection bounds and clean binary tree recursion without off-by-one slips.',
        estimatedMinutes: 35,
        difficulty: 'intermediate',
        keyInvariant: 'Use `L <= R` inclusive bounds and verify sorted half before comparing target.',
        mentalModel: 'Verify loop termination for a 2-element array `[3, 1]` before finishing.',
        sections: [
          {
            heading: '2-Element Verification Drill',
            body: 'Always trace `[3, 1]` searching for `1`: `L=0, R=1, mid=0 -> nums[L] <= nums[mid]` holds (`3<=3`). Target `1` fails `[3, 3)`, so `L = mid + 1 = 1`.',
          },
        ],
        linkedProblemSlugs: ['search-in-rotated-sorted-array', 'maximum-depth-of-binary-tree'],
      },
    ],
  },

  // =========================================================================
  // CORE CS TAB (?open=core-cs)
  // =========================================================================
  {
    id: 'track-dbms',
    slug: 'dbms',
    subjectId: 'dbms',
    category: 'core_cs',
    sectionLabel: 'In-Depth Learning',
    iconKey: 'dbms',
    title: 'DBMS Internals: B+ Trees, ACID & MVCC',
    shortTitle: 'DBMS',
    subtitle:
      'Trace clustered vs secondary B+ Tree index lookups, query execution plans, isolation anomalies, and PostgreSQL MVCC snapshots.',
    levelBadge: 'Core CS · Storage & Transactions',
    totalMinutes: 90,
    prerequisites: ['Trees & Hashing Basics'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'dbms-bplus-trees',
        slug: 'bplus-tree-indexing-query-plans',
        moduleTitle: 'Module 1 · Storage & B+ Tree Indexing',
        title: 'B+ Tree Indexing & Query Execution Plans',
        summary:
          'Trace disk-page fanout, clustered vs non-clustered lookups, and why leftmost prefix ordering rules composite indexes.',
        estimatedMinutes: 45,
        difficulty: 'foundation',
        keyInvariant:
          'B+ Trees store keys only in internal routing pages and link all data/row-pointers sequentially at the leaf level—maximizing branching factor (~100-500 per 8KB page).',
        mentalModel:
          'Even 100 million rows sit inside a 3–4 level B+ Tree when indexed cleanly—whereas leading wildcards force O(N) sequential scans.',
        sections: [
          {
            heading: 'Composite Index Leftmost Prefix Rule',
            body: 'An index on `(org_id, created_at)` accelerates `WHERE org_id = 42 AND created_at > ...` and `WHERE org_id = 42`, **but cannot seek directly** on `WHERE created_at > ...` alone.',
          },
        ],
        interactiveTrace: {
          title: 'Index Seek: 10M-Row B+ Tree Lookup',
          subtitle: 'Page fanout = 250 keys per 8KB internal page.',
          steps: [
            {
              stepNumber: 1,
              title: 'Root Page (In-Memory Buffer Pool)',
              stateSummary: 'Binary search 250 routing pivots -> picks Child Page #19.',
              highlights: [
                { label: 'I/O Cost', value: '0 disk reads (pinned)', tone: 'teal' },
                { label: 'Level', value: 'Root (Depth 1)', tone: 'sapphire' },
              ],
              pointerNote: 'Root and level-1 branch pages usually stay hot in RAM.',
            },
            {
              stepNumber: 2,
              title: 'Internal -> Leaf Page Seek',
              stateSummary: 'Follows pointer to Leaf #4821 containing sorted rows; range scans traverse adjacent leaf siblings.',
              highlights: [
                { label: 'Total Tree Height', value: '3 levels (~15.6M capacity)', tone: 'violet' },
                { label: 'Range Scan', value: 'Sequential Leaf Chain', tone: 'teal' },
              ],
              pointerNote: 'Covering indexes avoid a second random heap lookup.',
            },
          ],
        },
        microCheck: {
          prompt: 'Given composite index `(country, age)`, which query CANNOT perform a leading B+ Tree range seek?',
          options: [
            'WHERE country = "IN" AND age >= 21',
            'WHERE age >= 21',
            'WHERE country = "IN"',
          ],
          correctIndex: 1,
          explanation: '`age` is sorted only within identical `country` prefixes; filtering on `age` alone breaks leftmost prefix.',
        },
        linkedTopics: ['DBMS Internals'],
      },
      {
        id: 'dbms-acid-mvcc',
        slug: 'acid-isolation-mvcc-snapshots',
        moduleTitle: 'Module 2 · Concurrency Control & MVCC',
        title: 'ACID, Isolation Anomalies & MVCC Snapshots',
        summary:
          'Differentiate Dirty Read, Non-Repeatable Read, Phantom Read, and Write Skew under Read Committed vs Repeatable Read vs Serializable.',
        estimatedMinutes: 45,
        difficulty: 'intermediate',
        keyInvariant:
          'MVCC avoids blocking readers on writers by tagging each row version with `xmin`/`xmax` transaction IDs, serving consistent snapshots.',
        mentalModel:
          'Readers never block writers and writers never block readers—instead each sees tuple versions committed before its snapshot.',
        sections: [
          {
            heading: 'Isolation Level Guarantee Matrix',
            body: 'Know what each SQL isolation tier prevents: Read Committed prevents dirty reads; Repeatable Read snapshot isolation prevents non-repeatable and phantom reads; Serializable enforces true serial order via SSI.',
          },
        ],
        linkedTopics: ['DBMS Internals'],
      },
    ],
  },
  {
    id: 'track-os',
    slug: 'os',
    subjectId: 'os',
    category: 'core_cs',
    sectionLabel: 'In-Depth Learning',
    iconKey: 'os',
    title: 'Operating Systems: Memory, Paging & Sync',
    shortTitle: 'Operating Systems',
    subtitle:
      'Trace virtual-to-physical page translation, TLB hit/miss latency, Coffman deadlock breaking, and producer-consumer mutex loops.',
    levelBadge: 'Core CS · Kernel & Concurrency',
    totalMinutes: 85,
    prerequisites: ['Pointers & Stack/Heap Memory'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'os-virtual-memory-tlb',
        slug: 'virtual-memory-tlb-paging',
        moduleTitle: 'Module 1 · Virtual Memory & TLB Hardware',
        title: 'Virtual Memory, Multi-Level Page Tables & TLB',
        summary:
          'Understand how every process sees contiguous virtual memory while physical RAM allocates scattered 4KB frames.',
        estimatedMinutes: 45,
        difficulty: 'foundation',
        keyInvariant:
          'On a TLB hit, translation completes in ~1 CPU cycle; on a 4-level page-table miss (x86-64), hardware walks 4 memory references or raises a Page Fault.',
        mentalModel:
          'Virtual Address splits into `[Page Table Walk Indices | 12-bit Page Offset]`. Offset bits stay identical across translation.',
        sections: [
          {
            heading: 'Why Multi-Level Page Tables Save RAM',
            body: 'A flat page table for a 48-bit address space would consume 512 GB per process. Multi-level trees allocate leaf tables only for mapped heap/stack regions.',
          },
        ],
        interactiveTrace: {
          title: 'Address Translation Flow: VA -> PA',
          subtitle: '4KB page size -> bottom 12 bits are byte offset.',
          steps: [
            {
              stepNumber: 1,
              title: 'Check TLB Associative Cache',
              stateSummary: 'Lookup Virtual Page Number (VPN) in hardware TLB.',
              highlights: [
                { label: 'TLB Hit', value: 'Return PFN immediately (~1ns)', tone: 'teal' },
                { label: 'TLB Miss', value: 'Trigger MMU Page Walk', tone: 'amber' },
              ],
              pointerNote: 'Context switches tag TLB entries via ASID/PCID.',
            },
            {
              stepNumber: 2,
              title: 'PTE Present=0 -> OS Page Fault Handler',
              stateSummary: 'Kernel loads missing page into free/evicted frame, sets Present=1, retries faulting instruction.',
              highlights: [
                { label: 'Replacement', value: 'Clock / LRU Approximation', tone: 'sapphire' },
                { label: 'Thrashing Risk', value: 'Working set > Physical frames', tone: 'amber' },
              ],
              pointerNote: 'Spatial locality minimizes both TLB misses and page faults.',
            },
          ],
        },
        microCheck: {
          prompt: 'Which bits remain UNCHANGED when translating a 4KB virtual address to its physical address?',
          options: ['The highest 12 bits', 'The lowest 12 bits (page offset)', 'All bits change via ASLR'],
          correctIndex: 1,
          explanation: 'A 4KB (2^12) page moves atomically into a 4KB physical frame, leaving bits [11:0] untouched.',
        },
        linkedTopics: ['Operating Systems'],
      },
      {
        id: 'os-deadlocks-sync',
        slug: 'deadlocks-coffman-mutexes',
        moduleTitle: 'Module 2 · Concurrency & Deadlocks',
        title: 'Coffman Deadlock Conditions & Mutex Synchronization',
        summary:
          'Break circular waits cleanly and structure condition-variable wait loops without lost wakeups.',
        estimatedMinutes: 40,
        difficulty: 'intermediate',
        keyInvariant:
          'Always wait on a condition variable inside a `while (!condition)` loop—never an `if`—to guard against spurious wakeups.',
        mentalModel:
          'Acquire locks in a strict global ID order (`lock(min(a,b))` then `lock(max(a,b))`) to eliminate circular wait.',
        sections: [
          {
            heading: 'Four Necessary Coffman Conditions',
            body: 'Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait — breaking ANY one guarantees deadlock freedom.',
          },
        ],
        linkedTopics: ['Operating Systems'],
      },
    ],
  },
  {
    id: 'track-cn',
    slug: 'cn',
    subjectId: 'cn',
    category: 'core_cs',
    sectionLabel: 'In-Depth Learning',
    iconKey: 'cn',
    title: 'Computer Networks: TCP, TLS 1.3 & HTTP',
    shortTitle: 'Computer Networks',
    subtitle:
      'Explain TCP 3-way handshake, AIMD congestion window backoff, TIME_WAIT, DNS recursion, and TLS 1.3 1-RTT handshakes.',
    levelBadge: 'Core CS · Protocols',
    totalMinutes: 75,
    prerequisites: ['Sockets & Client-Server Basics'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'cn-tcp-congestion',
        slug: 'tcp-state-machine-congestion',
        moduleTitle: 'Module 1 · Reliable Transport (TCP)',
        title: 'TCP Handshake, Flow Control & AIMD Congestion Control',
        summary:
          'Contrast receiver-driven rwnd (Flow Control) vs network-driven cwnd (Congestion Control).',
        estimatedMinutes: 40,
        difficulty: 'foundation',
        keyInvariant:
          'In-flight unacknowledged bytes are strictly capped by `min(rwnd, cwnd)`. Packet loss halves cwnd while ACKs grow it additively (AIMD).',
        mentalModel:
          'Flow control protects a slow receiver; congestion control protects shared internet routers.',
        sections: [
          {
            heading: 'Why 2MSL TIME_WAIT Exists',
            body: 'The active closer lingers in TIME_WAIT so delayed duplicate packets cannot corrupt a subsequent socket on the same 4-tuple.',
          },
        ],
        microCheck: {
          prompt: 'Which TCP parameter protects a slow consumer process from buffer overflow?',
          options: ['cwnd (Congestion Window)', 'rwnd (Advertised Receive Window)', 'TTL (Time To Live)'],
          correctIndex: 1,
          explanation: 'rwnd is explicitly advertised by the receiver in ACK headers.',
        },
        linkedTopics: ['Computer Networks'],
      },
      {
        id: 'cn-dns-tls-http',
        slug: 'dns-tls13-http-lifecycle',
        moduleTitle: 'Module 2 · DNS, TLS 1.3 & HTTP/3',
        title: 'End-to-End Request: DNS -> TLS 1.3 -> HTTP/2 & HTTP/3',
        summary:
          'Follow every round trip between typing a URL and receiving the first HTTP response byte.',
        estimatedMinutes: 35,
        difficulty: 'intermediate',
        keyInvariant:
          'TLS 1.3 trims cryptographic negotiation to 1-RTT by bundling client KeyShare directly inside ClientHello.',
        mentalModel:
          'HTTP/3 runs independent QUIC streams over UDP so one dropped packet never stalls unrelated multiplex streams.',
        sections: [
          {
            heading: 'Protocol Stack Comparison',
            body: 'HTTP/1.1 stalls behind head responses; HTTP/2 multiplexes over one TCP socket; HTTP/3 moves multiplexing down to QUIC over UDP.',
          },
        ],
        linkedTopics: ['Computer Networks'],
      },
    ],
  },
  {
    id: 'track-cs-interview-revision',
    slug: 'core-cs-interview-revision',
    subjectId: 'cs_fundamentals',
    category: 'core_cs',
    sectionLabel: 'Interview Revision',
    iconKey: 'dbms',
    title: 'Core CS Fast Revision (DBMS + OS + CN)',
    shortTitle: 'CS Core Revision',
    subtitle:
      'High-frequency theoretical checkpoints for final interview prep: Normalization, Virtual Paging, Mutexes, and TCP/HTTP round trips.',
    levelBadge: 'Interview Prep · Condensed',
    totalMinutes: 55,
    prerequisites: ['Foundational CS Exposure'],
    isJudgeBacked: false,
    lessons: [
      {
        id: 'cs-rev-storage-concurrency',
        slug: 'rapid-revision-dbms-os-cn',
        moduleTitle: 'Module 1 · High-Yield Oral Interview Drills',
        title: 'DBMS, OS & Networking Oral Checkpoints',
        summary: 'Rapid 30-minute synthesis of the most frequently asked SDE-1/SDE-2 core CS questions.',
        estimatedMinutes: 30,
        difficulty: 'intermediate',
        keyInvariant:
          'Explain *trade-offs* before definitions: why B+ Trees win on disk range scans, why MVCC avoids read locks, why QUIC fixes TCP HOL blocking.',
        mentalModel:
          'Keep one concrete concrete mechanism per answer (`xmin/xmax`, `TLB ASID`, `min(rwnd, cwnd)`).',
        sections: [
          {
            heading: 'Top 5 Rapid Oral Questions',
            body: 'Practice giving crisp 45-second explanations with concrete numbers and failure modes.',
            bullets: [
              'Process vs Thread: separate virtual address space vs shared heap + private stack/registers.',
              'Clustered vs Secondary Index: physical tuple leaf storage vs key->PK indirection.',
              'TCP vs UDP: reliable byte-stream handshake vs stateless datagrams (base for QUIC).',
            ],
          },
        ],
        linkedTopics: ['CS Fundamentals'],
      },
      {
        id: 'cs-rev-sql-tuning',
        slug: 'rapid-revision-locking-indexing',
        moduleTitle: 'Module 2 · Locks & Query Tuning',
        title: 'Deadlocks, Optimistic Locking & Query Plans',
        summary: 'Compare optimistic version CAS vs pessimistic `SELECT ... FOR UPDATE`.',
        estimatedMinutes: 25,
        difficulty: 'intermediate',
        keyInvariant:
          'Use pessimistic row locks (`FOR UPDATE`) when contention is high; use optimistic `WHERE version = old_ver` when conflicts are rare.',
        mentalModel: 'Optimistic retries scale reads when collision probability < 5%.',
        sections: [
          {
            heading: 'EXPLAIN ANALYZE Signals',
            body: 'Watch out for unexpected `Seq Scan` on large tables and nested loop joins magnifying N*M rows.',
          },
        ],
        linkedTopics: ['DBMS Internals', 'Operating Systems'],
      },
    ],
  },
];
