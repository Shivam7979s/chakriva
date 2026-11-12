/**
 * CHAKRIVA Goal-to-Skill Mapping Engine
 * =====================================
 * Maps user goals, target companies, and roles to required algorithmic skills
 * with explicit rationales, target proficiencies, and provenance indicators.
 *
 * Implements Phase D of CHAKRIVA Personalized Roadmap Engine.
 */

import type { RoadmapGoal, RoadmapWizardDraft } from '../types/adaptive';

export type SkillPriority = 'critical' | 'high' | 'medium' | 'low';
export type TargetProficiency = 'demonstrated_proficiency' | 'practicing' | 'learning';
export type SkillProvenance = 'company_evidence' | 'role_standard' | 'user_custom' | 'general_foundation';

export interface SkillRequirement {
  topic: string;
  priority: SkillPriority;
  weight: number; // 0.0 to 1.0
  targetProficiency: TargetProficiency;
  rationale: string;
  prerequisites: string[];
  provenance: SkillProvenance;
  isCompanySpecific: boolean;
}

export type GoalSkillResolution = GoalInterpretationPlan;

export interface GoalInterpretationPlan {
  normalizedGoal: RoadmapGoal;
  goal?: string;
  goalTitle: string;
  roleTitle: string;
  targetCompanies: string[];
  skillRequirements: SkillRequirement[];
  recommendedTopics?: SkillRequirement[];
  targetProficiency?: string;
  assumptions: string[];
  isCompanyDataVerified: boolean;
  companyFallbackUsed: boolean;
  isFallback?: boolean;
  confidence?: number;
  primaryRationale?: string;
  overallStrategy?: string;
}

// Configured Company Priority Profiles (Distinguishes evidence from general fallback)
export const COMPANY_PROFILES: Record<string, { highTopics: string[]; rationale: string }> = {
  google: {
    highTopics: ['Graphs', 'Dynamic Programming', 'Binary Trees', 'Two Pointers'],
    rationale: 'Google interview panels place heavy emphasis on non-linear recursion, graph traversals, and optimal DP substructures.',
  },
  meta: {
    highTopics: ['Two Pointers', 'Binary Trees', 'Sliding Window', 'Arrays & Hashing'],
    rationale: 'Meta coding rounds emphasize high execution speed and bug-free linear/tree traversals within strict 20-minute constraints.',
  },
  amazon: {
    highTopics: ['Heaps & Priority Queues', 'Binary Trees', 'Arrays & Hashing', 'Composite Design & Caching'],
    rationale: 'Amazon evaluations focus on data aggregation, priority queues, tree recursion, and real-world caching / LRU mechanics.',
  },
  microsoft: {
    highTopics: ['Arrays & Hashing', 'Two Pointers', 'Binary Trees', 'Stacks & Queues'],
    rationale: 'Microsoft technical screens test clean object-oriented data structure fundamentals and standard traversal patterns.',
  },
  uber: {
    highTopics: ['Graphs', 'Monotonic Stacks & Two Pointers', 'Intervals & Sorting'],
    rationale: 'Uber interviews frequently feature geometric, interval sweep-line, and routing/graph traversal scenarios.',
  },
};

/**
 * Resolves user draft into structured skill requirements
 */
export function resolveGoalToSkills(draft: RoadmapWizardDraft): GoalInterpretationPlan {
  const goal = draft.goal;
  const companies = (draft.targetCompanies || []).map((c) => c.toLowerCase().trim());
  const role = draft.targetRole || 'Software Development Engineer';

  const matchedCompanies = companies.filter((c) => COMPANY_PROFILES[c]);
  const isCompanyDataVerified = matchedCompanies.length > 0;
  const companyFallbackUsed = companies.length > 0 && !isCompanyDataVerified;

  const requirementsMap = new Map<string, SkillRequirement>();
  const assumptions: string[] = [];

  // 1. Base requirements by Goal Type
  switch (goal) {
    case 'internship':
    case 'placement_prep': {
      addRequirement(requirementsMap, {
        topic: 'Arrays & Hashing',
        priority: 'critical',
        weight: 1.0,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Foundational baseline tested in 100% of campus and internship coding rounds.',
        prerequisites: [],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Two Pointers',
        priority: 'critical',
        weight: 0.9,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Critical for sorted array searches and window contraction.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Sliding Window',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Key subarray optimization pattern frequent in initial online assessments.',
        prerequisites: ['Two Pointers', 'Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Stacks & Queues',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Essential LIFO parsing and state backtracking fundamentals.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Binary Search',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Core logarithmic partition on monotonic domains.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Binary Trees',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'First non-linear recursive data structure tested in campus interviews.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      if (goal === 'placement_prep') {
        addRequirement(requirementsMap, {
          topic: 'Dynamic Programming',
          priority: 'medium',
          weight: 0.7,
          targetProficiency: 'learning',
          rationale: 'Core 1D memoization common in final-round placement evaluations.',
          prerequisites: ['Arrays & Hashing'],
          provenance: 'role_standard',
          isCompanySpecific: false,
        });
      }
      break;
    }

    case 'coding_interview':
    case 'entry_level': {
      addRequirement(requirementsMap, {
        topic: 'Arrays & Hashing',
        priority: 'critical',
        weight: 1.0,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Universal table lookups and invariant tracking.',
        prerequisites: [],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Two Pointers',
        priority: 'critical',
        weight: 0.95,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Bound contraction and sorted element pairing.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Sliding Window',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Contiguous window optimization and frequency maps.',
        prerequisites: ['Two Pointers', 'Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Stacks & Queues',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Delimiter matching and evaluation.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Binary Search',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Partitioning search spaces in O(log n).',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Intervals & Sorting',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Greedy interval overlap scheduling.',
        prerequisites: ['Arrays & Hashing', 'Two Pointers'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Binary Trees',
        priority: 'critical',
        weight: 0.9,
        targetProficiency: 'practicing',
        rationale: 'Structural recursion and hierarchical traversals.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Graphs',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'learning',
        rationale: 'BFS/DFS grid diffusion and topological cycle detection.',
        prerequisites: ['Binary Trees', 'Stacks & Queues'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Dynamic Programming',
        priority: 'high',
        weight: 0.75,
        targetProficiency: 'learning',
        rationale: 'Optimal substructure and state memoization.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      break;
    }

    case 'experienced': {
      addRequirement(requirementsMap, {
        topic: 'Arrays & Hashing',
        priority: 'critical',
        weight: 1.0,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Foundation for high-throughput memory layout and caching.',
        prerequisites: [],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Two Pointers',
        priority: 'critical',
        weight: 0.9,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Linear array sweeps with zero allocation overhead.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Monotonic Stacks & Two Pointers',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Geometry sweeps and next-greater element calculations.',
        prerequisites: ['Stacks & Queues', 'Two Pointers'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Composite Design & Caching',
        priority: 'critical',
        weight: 0.95,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Core systems interview standard: composite HashMap + DoublyLinkedList (LRU/LFU).',
        prerequisites: ['Arrays & Hashing', 'Stacks & Queues'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Graphs',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Distributed dependency graphs and shortest path routing.',
        prerequisites: ['Binary Trees', 'Stacks & Queues'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Dynamic Programming',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Multi-variable state transitions and resource allocation optimization.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      break;
    }

    case 'competitive_programming': {
      addRequirement(requirementsMap, {
        topic: 'Arrays & Hashing',
        priority: 'critical',
        weight: 1.0,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Fast lookups, prefix differences, and coordinate compression.',
        prerequisites: [],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Binary Search',
        priority: 'critical',
        weight: 0.95,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Binary search on monotonic answer spaces.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Monotonic Stacks & Two Pointers',
        priority: 'critical',
        weight: 0.9,
        targetProficiency: 'practicing',
        rationale: 'O(n) monotonic boundary and nearest extrema queries.',
        prerequisites: ['Stacks & Queues', 'Two Pointers'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Dynamic Programming',
        priority: 'critical',
        weight: 0.95,
        targetProficiency: 'practicing',
        rationale: 'Combinatorial DP, bitmask compression, and state optimization.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'role_standard',
        isCompanySpecific: false,
      });
      break;
    }

    default: {
      // dsa_fundamentals or custom_goal
      addRequirement(requirementsMap, {
        topic: 'Arrays & Hashing',
        priority: 'critical',
        weight: 1.0,
        targetProficiency: 'demonstrated_proficiency',
        rationale: 'Core foundation of computer science data structures.',
        prerequisites: [],
        provenance: 'general_foundation',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Two Pointers',
        priority: 'high',
        weight: 0.85,
        targetProficiency: 'practicing',
        rationale: 'Fundamental linear convergence technique.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'general_foundation',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Binary Trees',
        priority: 'high',
        weight: 0.8,
        targetProficiency: 'practicing',
        rationale: 'Hierarchical tree structure and recursion proof.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'general_foundation',
        isCompanySpecific: false,
      });
      addRequirement(requirementsMap, {
        topic: 'Stacks & Queues',
        priority: 'medium',
        weight: 0.7,
        targetProficiency: 'practicing',
        rationale: 'LIFO and FIFO ordering semantics.',
        prerequisites: ['Arrays & Hashing'],
        provenance: 'general_foundation',
        isCompanySpecific: false,
      });
      break;
    }
  }

  // 2. Apply verified company profiles (if chosen)
  for (const comp of matchedCompanies) {
    const prof = COMPANY_PROFILES[comp];
    assumptions.push(`Incorporated verified company profile for ${comp.toUpperCase()}: ${prof.rationale}`);
    for (const t of prof.highTopics) {
      const existing = requirementsMap.get(t);
      if (existing) {
        existing.priority = 'critical';
        existing.weight = Math.min(1.0, existing.weight + 0.15);
        existing.provenance = 'company_evidence';
        existing.isCompanySpecific = true;
      } else {
        requirementsMap.set(t, {
          topic: t,
          priority: 'critical',
          weight: 0.9,
          targetProficiency: 'practicing',
          rationale: `Highly prioritized by ${comp.toUpperCase()} engineering interviews.`,
          prerequisites: ['Arrays & Hashing'],
          provenance: 'company_evidence',
          isCompanySpecific: true,
        });
      }
    }
  }

  if (companyFallbackUsed) {
    assumptions.push(
      `Company data for "${companies.join(', ')}" is not verified in the local benchmark database; using role-based interview-preparation fallback for ${role}.`
    );
  }

  // 3. Struggle Topics boost
  if (draft.struggleTopics && draft.struggleTopics.length > 0) {
    for (const st of draft.struggleTopics) {
      const existing = requirementsMap.get(st);
      if (existing) {
        existing.priority = 'critical';
        existing.weight = Math.min(1.0, existing.weight + 0.1);
        existing.rationale += ' (User flagged as high-priority struggle topic).';
      } else {
        requirementsMap.set(st, {
          topic: st,
          priority: 'high',
          weight: 0.85,
          targetProficiency: 'practicing',
          rationale: 'User flagged as struggle topic; allocated focused mastery runway.',
          prerequisites: ['Arrays & Hashing'],
          provenance: 'user_custom',
          isCompanySpecific: false,
        });
      }
    }
  }

  // 4. Mastered Topics adjustment
  if (draft.masteredTopics && draft.masteredTopics.length > 0) {
    for (const mt of draft.masteredTopics) {
      const existing = requirementsMap.get(mt);
      if (existing) {
        existing.targetProficiency = 'demonstrated_proficiency';
        existing.weight = Math.max(0.4, existing.weight - 0.2);
        existing.rationale += ' (User self-reports prior mastery; introductory drills will be minimized).';
      }
    }
  }

  const skillReqs = Array.from(requirementsMap.values());
  return {
    normalizedGoal: goal,
    goal,
    goalTitle: goal.replace(/_/g, ' ').toUpperCase(),
    roleTitle: role,
    targetCompanies: draft.targetCompanies || [],
    skillRequirements: skillReqs,
    recommendedTopics: skillReqs,
    targetProficiency:
      goal === 'competitive_programming'
        ? 'competitive_speed'
        : goal === 'experienced' || draft.companyTargetType === 'faang_competitive'
        ? 'interview_ready'
        : 'practicing',
    assumptions,
    isCompanyDataVerified,
    companyFallbackUsed,
    isFallback: companyFallbackUsed,
  };
}

function addRequirement(map: Map<string, SkillRequirement>, req: SkillRequirement) {
  map.set(req.topic, req);
}

export const COMPANY_SKILL_PROFILES = COMPANY_PROFILES;

export const SUPPORTED_GOAL_PROFILES = [
  'internship',
  'entry_level',
  'experienced',
  'competitive_programming',
  'dsa_fundamentals',
  'custom_goal',
  'faang_competitive',
  'product_based',
];

