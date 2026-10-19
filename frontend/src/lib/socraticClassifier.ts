/**
 * Chakriva Socratic Invariant Classifier
 * 
 * Deterministically classifies developer questions into:
 * 1. Zero-spoilers protection (rejecting full code requests)
 * 2. Domain boundary detection (politely rejecting non-algorithmic topics)
 * 3. Ambiguity resolution (prompting for asymptotic constraints & bottlenecks)
 * 4. Pattern-specific invariant guidance (binary search, two pointers, DP, trees, graphs, windows, stacks, heaps, bitwise)
 */

export interface SocraticClassificationResult {
  category: 'zero_spoilers' | 'domain_boundary' | 'ambiguous' | 'invariant_guidance' | 'general_invariant';
  guidance: string;
}

export function classifySocraticQuery(query: string): SocraticClassificationResult {
  const p = query.trim();
  const lower = p.toLowerCase();

  // 1. Direct Solution Requests (Zero-spoilers mandate)
  if (
    lower.includes('give me the code') ||
    lower.includes('write the code') ||
    lower.includes('solve this for me') ||
    lower.includes('full solution') ||
    lower.includes('give me the answer')
  ) {
    return {
      category: 'zero_spoilers',
      guidance:
        'Zero-Spoilers Invariant Policy: Chakriva AI does not synthesize drop-in solutions or code dumps, as passive code consumption degrades recall in live technical interviews. Instead, let us isolate the underlying invariant: What condition is guaranteed to hold before step 0, and what state mutation preserves correctness toward the base case?',
    };
  }

  // 2. Ambiguous algorithmic questions
  if (
    lower.includes('how to optimize') ||
    lower.includes('why is my code slow') ||
    lower.includes('improve performance') ||
    lower.includes('optimization') ||
    lower === 'optimize' ||
    lower === 'help'
  ) {
    return {
      category: 'ambiguous',
      guidance:
        'Socratic Optimization Diagnostic: To isolate the asymptotic bottleneck, answer three diagnostic questions: (1) What are your input constraints (e.g., N ≤ 10⁵ requires O(N log N) or O(N))? (2) Which inner-loop operations run with > O(1) step cost? (3) Does the problem exhibit overlapping subproblems that can be memoized, or sorted structure allowing binary bisection?',
    };
  }

  // 3. Unrelated / Non-algorithmic questions
  const codingKeywords = [
    'array', 'pointer', 'binary', 'search', 'tree', 'graph', 'dp', 'dynamic', 'programming',
    'window', 'stack', 'queue', 'heap', 'recursion', 'complexity', 'invariant', 'sort',
    'time', 'space', 'big-o', 'node', 'edge', 'cycle', 'hash', 'map', 'backtracking',
    'bit', 'matrix', 'string', 'memo', 'topological', 'bfs', 'dfs', 'greedy', 'interval',
    'monotonic', 'asymptotic', 'runtime', 'bound', 'proof', 'loop', 'base case', 'performance',
  ];
  const isCodingRelated = codingKeywords.some((k) => lower.includes(k));

  if (
    !isCodingRelated &&
    lower.length > 3 &&
    !lower.includes('algorithm') &&
    !lower.includes('code') &&
    !lower.includes('optimize') &&
    !lower.includes('problem')
  ) {
    return {
      category: 'domain_boundary',
      guidance: `Domain Boundary Notice: The query "${p}" appears outside the scope of Chakriva's Socratic Invariant Engine. This console is exclusively calibrated for algorithmic loop invariants, time/space complexity proofs, and recursion state space. Try asking about binary search boundaries, two-pointer invariants, dynamic programming recurrences, or graph traversals.`,
    };
  }

  // 4. Pattern-specific invariant responses
  if (lower.includes('rotated') || lower.includes('binary search')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Binary Search Partition Invariant): In a rotated sorted array, picking midpoint mid guarantees that at least one half [left...mid] or [mid...right] is strictly sorted (nums[left] <= nums[mid] or nums[mid] <= nums[right]). Check whether your target falls within the strictly sorted boundary before bisecting the remaining search space.',
    };
  }

  if (lower.includes('two-pointer') || lower.includes('water') || lower.includes('pointer')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Bounding Dimension Invariant): In Container With Most Water, area is bounded by min(h[l], h[r]) * width. Moving the taller boundary inward strictly shrinks width while area cannot exceed the current min height. Therefore, the only move with positive expected potential is monotonically advancing the shorter pointer inward.',
    };
  }

  if (lower.includes('dynamic programming') || lower.includes('dp') || lower.includes('memo')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Dynamic Programming Recurrence Invariant): Verify two mathematical properties: (1) Optimal Substructure: Does the global optimum compose strictly from subproblem optima? (2) Overlapping Subproblems: Does recursion solve the identical state multiple times? Formulate state invariant S(i, j) before writing transition recurrence equations.',
    };
  }

  if (lower.includes('tree') || lower.includes('traversal') || lower.includes('bst')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Tree Recursion State Invariant): Inspect call-stack depth and auxiliary work per node. On unbalanced trees, recursive DFS degrades to O(N) auxiliary space. If computing aggregates across subtrees, pass accumulated state down or return bottom-up tuples to ensure step cost remains O(1) per node.',
    };
  }

  if (lower.includes('graph') || lower.includes('cycle') || lower.includes('topological')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Graph State Space Invariant): In directed graph cycle detection, maintain three node states: unvisited (0), active in current DFS path (1), and fully processed (2). A directed edge pointing to an active (state 1) ancestor is a back-edge and mathematically proves a directed cycle.',
    };
  }

  if (lower.includes('window') || lower.includes('sliding')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Sliding Window Monotonicity Invariant): Define the window validity predicate P([L, R]). Monotonically expand R to incorporate new elements. Once P is violated, monotonically contract L until P is restored. Ensure each element enters and leaves the window at most once for amortized O(N) runtime.',
    };
  }

  if (lower.includes('stack') || lower.includes('monotonic')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Monotonic Stack Invariant): A monotonic stack maintains elements in strictly increasing or decreasing order. Before pushing an element x, pop elements that violate monotonicity. Each element is pushed and popped at most once, guaranteeing amortized O(1) operations.',
    };
  }

  if (lower.includes('heap') || lower.includes('priority queue')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Heap Partial Order Invariant): In a binary heap, the root always stores the extremum. For streaming k-th elements, maintain a heap of fixed size k. Inserting an element and evicting takes O(log k), yielding an overall O(N log k) bound instead of O(N log N).',
    };
  }

  if (lower.includes('bit') || lower.includes('xor')) {
    return {
      category: 'invariant_guidance',
      guidance:
        'Socratic Guidance (Bitwise Invariant): Recall algebraic properties of XOR: x ^ x = 0 and x ^ 0 = x. Bit manipulation operates in O(1) time without allocating auxiliary memory, making it the primary mechanism for in-place state tracking and parity checks.',
    };
  }

  return {
    category: 'general_invariant',
    guidance: `Socratic Invariant Diagnostic on "${p}": What unchanging condition must hold before and after each iteration of your algorithm? Identify: (1) The invariant condition, (2) The progress measure guaranteeing termination, and (3) The boundary state when execution concludes.`,
  };
}
