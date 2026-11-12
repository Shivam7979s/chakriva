/**
 * CHAKRIVA Prerequisite-Aware Curriculum Planner
 * =============================================
 * Constructs topological learning sequences over the curriculum DAG,
 * resolves transitive prerequisite dependencies, curates dynamic learning stages
 * tailored to user skill gaps, and avoids redundant repetition of demonstrated mastery.
 *
 * Implements Phase G of CHAKRIVA Personalized Roadmap Engine.
 */

import type { AdaptiveStage } from '../types/adaptive';
import type { GoalInterpretationPlan } from './goalSkillMapper';
import type { SkillGapAssessment } from './skillGapEngine';

/**
 * Authoritative Topic Prerequisite Graph (Directed Acyclic Graph)
 * Invariant: Every topic's prerequisites must be completed or demonstrated before the topic.
 */
export const TOPIC_PREREQUISITE_DAG: Record<string, string[]> = {
  'Arrays & Hashing': [],
  'Two Pointers': ['Arrays & Hashing'],
  'Sliding Window': ['Two Pointers', 'Arrays & Hashing'],
  'Stacks & Queues': ['Arrays & Hashing'],
  'Binary Search': ['Arrays & Hashing'],
  'Intervals & Sorting': ['Arrays & Hashing', 'Two Pointers'],
  'Monotonic Stacks & Two Pointers': ['Stacks & Queues', 'Two Pointers'],
  'Binary Trees': ['Arrays & Hashing'],
  'Heaps & Priority Queues': ['Arrays & Hashing'],
  'Graphs': ['Binary Trees', 'Stacks & Queues'],
  'Dynamic Programming': ['Arrays & Hashing', 'Two Pointers'],
  'Composite Design & Caching': ['Arrays & Hashing', 'Stacks & Queues'],
};

export interface PlannedCurriculum {
  orderedTopics: string[];
  stages: AdaptiveStage[];
  includedPrerequisites: string[];
  totalRequiredTopics: number;
}

/**
 * Checks for cycles in the prerequisite graph
 */
export function validatePrerequisiteGraphAcyclic(dag: Record<string, string[]> = TOPIC_PREREQUISITE_DAG): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of dag[node] || []) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const topic of Object.keys(dag)) {
    if (!visited.has(topic)) {
      if (hasCycle(topic)) return false;
    }
  }

  return true;
}

/**
 * Topologically orders the topics, pulling in missing prerequisites
 */
export function buildTopologicalCurriculum(
  goalPlan: GoalInterpretationPlan,
  gapAssessment: SkillGapAssessment,
  timelineWeeks: number = 8
): PlannedCurriculum {
  // 1. Identify all required topics
  const requiredTopics = new Set<string>();
  for (const req of goalPlan.skillRequirements) {
    requiredTopics.add(req.topic);
  }

  // 2. Transitive prerequisite resolution: add missing prerequisites
  const includedPrereqs: string[] = [];
  const queue = Array.from(requiredTopics);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const prereqs = TOPIC_PREREQUISITE_DAG[current] || [];
    for (const p of prereqs) {
      if (!requiredTopics.has(p)) {
        requiredTopics.add(p);
        includedPrereqs.push(p);
        queue.push(p);
      }
    }
  }

  // 3. Topological sort over requiredTopics
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const topic of requiredTopics) {
    inDegree.set(topic, 0);
    adjacency.set(topic, []);
  }

  for (const topic of requiredTopics) {
    const prereqs = TOPIC_PREREQUISITE_DAG[topic] || [];
    for (const p of prereqs) {
      if (requiredTopics.has(p)) {
        adjacency.get(p)!.push(topic);
        inDegree.set(topic, (inDegree.get(topic) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm with deterministic tie-breaking (by name)
  const zeroQueue: string[] = [];
  for (const [topic, deg] of inDegree.entries()) {
    if (deg === 0) {
      zeroQueue.push(topic);
    }
  }
  zeroQueue.sort((a, b) => a.localeCompare(b));

  const orderedTopics: string[] = [];

  while (zeroQueue.length > 0) {
    const current = zeroQueue.shift()!;
    orderedTopics.push(current);

    const neighbors = adjacency.get(current) || [];
    for (const next of neighbors) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) {
        zeroQueue.push(next);
        zeroQueue.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  // If learner already mastered topics (e.g. Arrays & Hashing), they remain in orderedTopics
  // but will be tagged for fast-track/revision rather than repeated intro drills in stage planning.

  // 4. Construct dynamic stages matching the ordered topics
  const stages = curateDynamicStages(orderedTopics, gapAssessment, timelineWeeks);

  return {
    orderedTopics,
    stages,
    includedPrerequisites: includedPrereqs,
    totalRequiredTopics: orderedTopics.length,
  };
}

/**
 * Curates 3 to 4 logical stages matching the actual required topics
 */
function curateDynamicStages(
  orderedTopics: string[],
  gapAssessment: SkillGapAssessment,
  timelineWeeks: number
): AdaptiveStage[] {
  const stages: AdaptiveStage[] = [];
  const totalWeeks = Math.max(1, timelineWeeks);

  // Group topics logically:
  // Group 1: Linear Foundations (Arrays & Hashing, Two Pointers)
  // Group 2: Windowing & Partitions (Sliding Window, Binary Search, Stacks & Queues)
  // Group 3: Hierarchies & Trees (Intervals, Binary Trees, Heaps)
  // Group 4: Advanced Systems & Optimizations (Graphs, Dynamic Programming, Composite Design, Monotonic Stacks)

  const group1 = orderedTopics.filter((t) => ['Arrays & Hashing', 'Two Pointers'].includes(t));
  const group2 = orderedTopics.filter((t) => ['Sliding Window', 'Binary Search', 'Stacks & Queues'].includes(t));
  const group3 = orderedTopics.filter((t) => ['Intervals & Sorting', 'Binary Trees', 'Heaps & Priority Queues'].includes(t));
  const group4 = orderedTopics.filter((t) =>
    ['Graphs', 'Dynamic Programming', 'Composite Design & Caching', 'Monotonic Stacks & Two Pointers'].includes(t)
  );

  let stageNum = 1;

  if (group1.length > 0) {
    const isMastered = group1.every((t) => gapAssessment.bypassedIntroductoryTopics.includes(t));
    stages.push({
      id: `stage-${stageNum}`,
      stageNumber: stageNum++,
      title: isMastered ? 'Linear Mastery & Fast-Track Verification' : 'Linear Invariants & Array Foundations',
      description: isMastered
        ? 'Rapid invariant verification and targeted warm-ups to confirm self-reported mastery.'
        : 'Master complement lookups, prefix accumulations, and single-pass hash invariants.',
      topics: group1,
      weeks: [],
    });
  }

  if (group2.length > 0) {
    stages.push({
      id: `stage-${stageNum}`,
      stageNumber: stageNum++,
      title: 'Monotonic Boundaries & Logarithmic Partitions',
      description: 'Establish dynamic sliding window contraction, bracket grammar parsing, and binary search answer partitions.',
      topics: group2,
      weeks: [],
    });
  }

  if (group3.length > 0) {
    stages.push({
      id: `stage-${stageNum}`,
      stageNumber: stageNum++,
      title: 'Structural Recursion, Trees & Prioritization',
      description: 'Master binary tree structural recursion, interval overlap sweeps, and priority queue bounds.',
      topics: group3,
      weeks: [],
    });
  }

  if (group4.length > 0) {
    stages.push({
      id: `stage-${stageNum}`,
      stageNumber: stageNum++,
      title: 'Graph Diffusions, Memoization & Composite Systems',
      description: 'Deep dive into topological sorting, memoized optimal substructures, and composite LRU eviction mechanics.',
      topics: group4,
      weeks: [],
    });
  }

  // Fallback if stages are empty
  if (stages.length === 0) {
    stages.push({
      id: 'stage-1',
      stageNumber: 1,
      title: 'Core Foundations & Practice',
      description: 'Algorithmic fundamentals and invariant tracking.',
      topics: orderedTopics,
      weeks: [],
    });
  }

  // Allocate week numbers proportionally across stages
  const numStages = stages.length;
  for (let w = 1; w <= totalWeeks; w++) {
    const stageIdx = Math.min(numStages - 1, Math.floor(((w - 1) / totalWeeks) * numStages));
    stages[stageIdx].weeks.push(w);
  }

  return stages;
}

/**
 * Validates DAG acyclicity and returns cycle nodes if detected
 */
export function validateTopicDagAcyclicity(
  dag: Record<string, string[]> = TOPIC_PREREQUISITE_DAG
): { hasCycle: boolean; cycleNodes: string[] } {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleNodes: string[] = [];

  function check(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of dag[node] || []) {
      if (!visited.has(neighbor)) {
        if (check(neighbor)) {
          cycleNodes.push(neighbor);
          return true;
        }
      } else if (recStack.has(neighbor)) {
        cycleNodes.push(neighbor);
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  let hasCycle = false;
  for (const topic of Object.keys(dag)) {
    if (!visited.has(topic)) {
      if (check(topic)) {
        cycleNodes.push(topic);
        hasCycle = true;
        break;
      }
    }
  }

  return { hasCycle, cycleNodes };
}

/**
 * Recursively resolves all transitive prerequisites for a topic
 */
export function resolveTransitivePrerequisites(
  topic: string,
  dag: Record<string, string[]> = TOPIC_PREREQUISITE_DAG
): string[] {
  const result = new Set<string>();
  const queue = [...(dag[topic] || [])];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (!result.has(cur)) {
      result.add(cur);
      queue.push(...(dag[cur] || []));
    }
  }
  return Array.from(result);
}

export const curateCurriculumStages = curateDynamicStages;

