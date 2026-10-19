/**
 * Authoritative Curriculum Graph Data Model for Section 03 (Curriculum Architecture)
 * Defines the 8 canonical concepts, 11 directed edges, relationship semantics,
 * and the non-punitive adaptive recovery model.
 */

export type NodeState = 'mastered' | 'recommended' | 'future' | 'deferred' | 'revisiting';

export type EdgeType = 'prerequisite' | 'supporting' | 'transitive' | 'recovery';

export interface ConceptNodeData {
  id: string;
  code: string;
  title: string;
  line1: string;
  line2: string;
  category: string;
  stageColumn: 'foundations' | 'core' | 'target' | 'horizons';
  stageName: string;
  baseState: 'mastered' | 'recommended' | 'future';
  x: number; // SVG viewBox coordinate X (0-840)
  y: number; // SVG viewBox coordinate Y (0-440)
  invariant: string;
  description: string;
  pedagogicalRole: string;
}

export interface ConceptEdgeData {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  pedagogicalMeaning: string;
}

export interface AdaptiveRecoveryScenario {
  id: string;
  // 1. The concept where the learner experiences friction
  frictionNodeId: string;
  frictionReason: string;
  // 2. The prerequisite being revisited
  revisitPrerequisiteId: string;
  revisitReason: string;
  // 3. The alternative practice route
  alternativePracticeRoute: {
    title: string;
    description: string;
    exerciseCount: number;
    exercises: string[];
  };
  // 4. The next concept available after the prerequisite is reinforced
  nextConceptAfterReinforcementId: string;
  nextConceptUnlockSummary: string;
  // Recovery transition edge
  recoveryEdgeId: string;
  // Return / restoration condition
  returnCondition: string;
}

// ── 1. THE 8 CANONICAL CONCEPT NODES ─────────────────────────────────
export const RAW_CONCEPT_NODES: ConceptNodeData[] = [
  {
    id: 'arrays',
    code: 'FND-01',
    title: 'Arrays & Indexed Memory',
    line1: 'Arrays & Indexed',
    line2: 'Memory',
    category: 'Linear Foundations',
    stageColumn: 'foundations',
    stageName: 'Stage 1: Upstream Foundations',
    baseState: 'mastered',
    x: 100,
    y: 130,
    invariant: 'Contiguous memory addressing allows O(1) random access and deterministic prefix accumulations.',
    description:
      'The bedrock of sequence processing. Establishes constant-time index bounds, loop terminations, and prefix sums before multi-pointer coordination.',
    pedagogicalRole: 'Foundational sequence storage & direct index addressing.',
  },
  {
    id: 'sorting',
    code: 'FND-02',
    title: 'Sorting Invariants',
    line1: 'Sorting',
    line2: 'Invariants',
    category: 'Order Theory',
    stageColumn: 'foundations',
    stageName: 'Stage 1: Upstream Foundations',
    baseState: 'mastered',
    x: 100,
    y: 310,
    invariant: 'Monotonic order (A[i] ≤ A[i+1]) guarantees that boundary comparisons discard entire candidate intervals.',
    description:
      'Imposing monotonic order transforms arbitrary quadratic search spaces into structured decision trees with deterministic boundary eliminations.',
    pedagogicalRole: 'Establishes monotonicity guarantees required for boundary reduction.',
  },
  {
    id: 'hash-maps',
    code: 'FND-03',
    title: 'Hash Maps & Frequency',
    line1: 'Hash Maps &',
    line2: 'Frequency',
    category: 'State Compression',
    stageColumn: 'core',
    stageName: 'Stage 2: Core Patterns',
    baseState: 'mastered',
    x: 320,
    y: 90,
    invariant: 'Space-time duality: trades O(N) auxiliary space to query historical element frequencies in O(1) expected time.',
    description:
      'Provides constant-time complement verification (Target - x) and frequency tracking without requiring physical array reordering.',
    pedagogicalRole: 'Auxiliary multiset state tracking and constant-time frequency queries.',
  },
  {
    id: 'two-pointers',
    code: 'COR-01',
    title: 'Two-Pointer Bounds',
    line1: 'Two-Pointer',
    line2: 'Bounds',
    category: 'Boundary Contraction',
    stageColumn: 'core',
    stageName: 'Stage 2: Core Patterns',
    baseState: 'mastered',
    x: 320,
    y: 230,
    invariant: 'Opposite indices converge monotonically; each comparison prunes an entire half-space of suboptimal pairs.',
    description:
      'Collapses quadratic pairwise search spaces into linear scans using monotonic boundary contraction guarantees.',
    pedagogicalRole: 'Direct prerequisite for all linear window and multi-index contraction techniques.',
  },
  {
    id: 'sliding-window',
    code: 'COR-02',
    title: 'Dynamic Sliding Window',
    line1: 'Dynamic',
    line2: 'Sliding Window',
    category: 'Contiguous Subarrays',
    stageColumn: 'target',
    stageName: 'Stage 3: Target & Branches',
    baseState: 'recommended',
    x: 540,
    y: 150,
    invariant: 'Window [L, R] maintains invariant C; R expands greedily to satisfy criteria, L contracts monotonically when violated.',
    description:
      'Active curriculum focal target. Generalizes two-pointer convergence to dynamic contiguous intervals that maintain running state criteria.',
    pedagogicalRole: 'Active focal target: contiguous sequence interval maintenance.',
  },
  {
    id: 'three-sum',
    code: 'ADV-01',
    title: '3Sum & Multi-Pointer',
    line1: '3Sum & Multi-',
    line2: 'Pointer',
    category: 'Compound Search',
    stageColumn: 'target',
    stageName: 'Stage 3: Target & Branches',
    baseState: 'future',
    x: 540,
    y: 320,
    invariant: 'Fix one element i in an outer loop; reduce the remaining subproblem to a 2-pointer scan on [i+1, n-1] while skipping duplicates.',
    description:
      'Extends the two-pointer invariant into higher-dimensional tuples while managing duplicate avoidance and nested loop bounds.',
    pedagogicalRole: 'Higher-dimensional search space reduction via outer-loop fixation.',
  },
  {
    id: 'monotonic-queue',
    code: 'ADV-02',
    title: 'Monotonic Queues',
    line1: 'Monotonic',
    line2: 'Queues',
    category: 'Sliding Extremum',
    stageColumn: 'horizons',
    stageName: 'Stage 4: Future Horizons',
    baseState: 'future',
    x: 740,
    y: 150,
    invariant: 'Double-ended queue maintains strictly decreasing values; front always holds the current window maximum in amortized O(1).',
    description:
      'Optimizes running extremum queries over sliding windows from O(N·K) to O(N) by eliminating dominated candidates upon arrival.',
    pedagogicalRole: 'Advanced window state optimization: amortized O(1) extremum tracking.',
  },
  {
    id: 'binary-search',
    code: 'ADV-03',
    title: 'Binary Search on Solution Space',
    line1: 'Binary Search on',
    line2: 'Solution Space',
    category: 'Space Partitioning',
    stageColumn: 'horizons',
    stageName: 'Stage 4: Future Horizons',
    baseState: 'future',
    x: 740,
    y: 320,
    invariant: 'Monotonic boolean predicate P(mid) halves the candidate search range in logarithmic time steps.',
    description:
      'Generalizes discrete binary search to continuous problem answer spaces via monotonic feasibility evaluation functions.',
    pedagogicalRole: 'Logarithmic search space partitioning on monotonic feasibility predicates.',
  },
];

// ── 2. THE 11 AUTHORITATIVE DIRECTED EDGES ───────────────────────────
/**
 * Exactly 11 directed edges with explicit pedagogical categorization:
 * - prerequisite: direct required dependency (incoming must be mastered first)
 * - supporting: optional complementary pattern (used in advanced cases, not a blocking prerequisite)
 * - transitive: inherited sequence substrate (already required via Two-Pointer Bounds)
 * - recovery: non-punitive adaptive re-route arc active during recovery mode
 */
export const CANONICAL_EDGES: ConceptEdgeData[] = [
  // 1. Arrays -> Two-Pointers (Direct Prerequisite)
  {
    id: 'e-arr-2pt',
    source: 'arrays',
    target: 'two-pointers',
    type: 'prerequisite',
    pedagogicalMeaning: 'Contiguous index arithmetic and O(1) random access are necessary for dual-pointer scans.',
  },
  // 2. Sorting -> Two-Pointers (Direct Prerequisite)
  {
    id: 'e-sort-2pt',
    source: 'sorting',
    target: 'two-pointers',
    type: 'prerequisite',
    pedagogicalMeaning: 'Monotonic order provides the guarantee that boundary comparisons eliminate candidate intervals.',
  },
  // 3. Arrays -> Hash Maps (Direct Prerequisite)
  {
    id: 'e-arr-hash',
    source: 'arrays',
    target: 'hash-maps',
    type: 'prerequisite',
    pedagogicalMeaning: 'Direct-address table indexing in arrays introduces key-to-bucket state translation.',
  },
  // 4. Two-Pointers -> Dynamic Sliding Window (Direct Prerequisite)
  {
    id: 'e-2pt-win',
    source: 'two-pointers',
    target: 'sliding-window',
    type: 'prerequisite',
    pedagogicalMeaning: 'Direct prerequisite: window [L, R] expands R greedily and contracts L monotonically using two-pointer invariants.',
  },
  // 5. Hash Maps -> Dynamic Sliding Window (Supporting Concept)
  {
    id: 'e-hash-win',
    source: 'hash-maps',
    target: 'sliding-window',
    type: 'supporting',
    label: 'Supporting Pattern',
    pedagogicalMeaning: 'Optional supporting tool: frequency tables provide O(1) multiset verification for substring windows, but are not required for scalar array windows.',
  },
  // 6. Arrays -> Dynamic Sliding Window (Transitive Foundation)
  {
    id: 'e-arr-win',
    source: 'arrays',
    target: 'sliding-window',
    type: 'transitive',
    label: 'Transitive Substrate',
    pedagogicalMeaning: 'Transitive sequence foundation: arrays provide the underlying memory substrate, inherited directly through Two-Pointer Bounds.',
  },
  // 7. Two-Pointers -> 3Sum (Direct Prerequisite)
  {
    id: 'e-2pt-3sum',
    source: 'two-pointers',
    target: 'three-sum',
    type: 'prerequisite',
    pedagogicalMeaning: 'Direct prerequisite: 3Sum fixes an outer element and reduces the remaining pair search to a two-pointer convergence.',
  },
  // 8. Sliding Window -> Monotonic Queue (Direct Prerequisite)
  {
    id: 'e-win-mq',
    source: 'sliding-window',
    target: 'monotonic-queue',
    type: 'prerequisite',
    pedagogicalMeaning: 'Direct prerequisite: monotonic deques track running sliding window extrema in amortized O(1) time.',
  },
  // 9. Two-Pointers -> Binary Search (Supporting / Conceptual Bridge)
  {
    id: 'e-2pt-bin',
    source: 'two-pointers',
    target: 'binary-search',
    type: 'supporting',
    label: 'Conceptual Bridge',
    pedagogicalMeaning: 'Conceptual bridge: both methods eliminate candidate sub-ranges using boundary comparisons on monotonic spaces.',
  },
  // 10. Adaptive Recovery Arc: Sliding Window -> Two-Pointers (Active in Recovery)
  {
    id: 'e-recovery-win-2pt',
    source: 'sliding-window',
    target: 'two-pointers',
    type: 'recovery',
    label: 'Prerequisite Re-anchor',
    pedagogicalMeaning: 'Non-punitive recovery route: when dynamic contraction causes friction, branches back to single-boundary drills without streak loss.',
  },
  // 11. Adaptive Recovery Arc: 3Sum -> Two-Pointers (Active in Recovery)
  {
    id: 'e-recovery-3sum-2pt',
    source: 'three-sum',
    target: 'two-pointers',
    type: 'recovery',
    label: 'Duplicate Re-anchor',
    pedagogicalMeaning: 'Non-punitive recovery route: when duplicate skips cause friction, re-anchors to standard pair bounds without penalty.',
  },
];

// ── 3. EXPLICIT ADAPTIVE RECOVERY SCENARIO ────────────────────────────
export const DEFAULT_RECOVERY_SCENARIO: AdaptiveRecoveryScenario = {
  id: 'sliding-window-contraction-friction',
  frictionNodeId: 'sliding-window',
  frictionReason:
    'Learner exhibits friction on dynamic window contraction conditions (monotonic shrinking of L pointer when invariant C is violated).',
  revisitPrerequisiteId: 'two-pointers',
  revisitReason:
    'Solidify single-boundary monotonic contraction invariant before multi-condition window management.',
  alternativePracticeRoute: {
    title: 'Monotonic Two-Pointer Boundary Drills',
    description:
      'Targeted single-boundary interval contraction on sorted arrays to re-anchor convergence logic.',
    exerciseCount: 2,
    exercises: [
      'Drill 1: Sorted Pair Sum Boundary Convergence (Target Match)',
      'Drill 2: Monotonic Subarray Length Shrinkage (Threshold Check)',
    ],
  },
  nextConceptAfterReinforcementId: 'sliding-window',
  nextConceptUnlockSummary:
    'Resumes Dynamic Sliding Window with full mastery of boundary shrinkage, unblocking downstream progression to Monotonic Queues.',
  recoveryEdgeId: 'e-recovery-win-2pt',
  returnCondition:
    'Upon validating the single-boundary contraction invariant on 2 exercises, Dynamic Sliding Window automatically restores as the active recommended target with 100% curriculum progress preserved.',
};

// ── 4. DERIVED HELPERS GUARANTEEING 100% GRAPH-INSPECTOR AGREEMENT ────

export interface NodeRelationshipDetails {
  directPrerequisites: ConceptNodeData[];
  supportingConcepts: ConceptNodeData[];
  transitiveFoundations: ConceptNodeData[];
  directUnlocks: ConceptNodeData[];
  supportingUnlocks: ConceptNodeData[];
}

/**
 * Derives relationship details dynamically from CANONICAL_EDGES.
 * This guarantees the inspector and SVG edges never diverge.
 */
export function getNodeRelationships(nodeId: string): NodeRelationshipDetails {
  const nodeMap = new Map(RAW_CONCEPT_NODES.map((n) => [n.id, n]));

  const directPrereqIds: string[] = [];
  const supportingPrereqIds: string[] = [];
  const transitivePrereqIds: string[] = [];
  const directUnlockIds: string[] = [];
  const supportingUnlockIds: string[] = [];

  CANONICAL_EDGES.forEach((edge) => {
    // Exclude recovery arcs from standard incoming/outgoing curriculum dependencies
    if (edge.type === 'recovery') return;

    // Incoming edges (dependencies of this node)
    if (edge.target === nodeId) {
      if (edge.type === 'prerequisite') directPrereqIds.push(edge.source);
      else if (edge.type === 'supporting') supportingPrereqIds.push(edge.source);
      else if (edge.type === 'transitive') transitivePrereqIds.push(edge.source);
    }
    // Outgoing edges (what this node unlocks)
    if (edge.source === nodeId) {
      if (edge.type === 'prerequisite') directUnlockIds.push(edge.target);
      else if (edge.type === 'supporting') supportingUnlockIds.push(edge.target);
    }
  });

  return {
    directPrerequisites: directPrereqIds.map((id) => nodeMap.get(id)!).filter(Boolean),
    supportingConcepts: supportingPrereqIds.map((id) => nodeMap.get(id)!).filter(Boolean),
    transitiveFoundations: transitivePrereqIds.map((id) => nodeMap.get(id)!).filter(Boolean),
    directUnlocks: directUnlockIds.map((id) => nodeMap.get(id)!).filter(Boolean),
    supportingUnlocks: supportingUnlockIds.map((id) => nodeMap.get(id)!).filter(Boolean),
  };
}

/**
 * Computes the runtime node state depending on interactive mode (standard vs recovery).
 * Guarantees that a node is NEVER both mastered and recommended simultaneously.
 */
export function getComputedNodeState(
  node: ConceptNodeData,
  mode: 'standard' | 'recovery',
  scenario: AdaptiveRecoveryScenario = DEFAULT_RECOVERY_SCENARIO
): NodeState {
  if (mode === 'standard') {
    return node.baseState;
  }

  // Recovery mode:
  if (node.id === scenario.frictionNodeId) {
    return 'deferred';
  }
  if (node.id === scenario.revisitPrerequisiteId) {
    return 'revisiting';
  }
  return node.baseState;
}
