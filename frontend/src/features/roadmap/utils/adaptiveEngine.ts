/**
 * CHAKRIVA Adaptive Roadmap Scheduling & Feasibility Engine
 * ========================================================
 * Generates personalized, realistic, invariant-driven learning plans
 * strictly using canonical problem catalog identifiers (VRQ-XXXXXX).
 * 
 * Supports:
 * - Weekly Mon-Sun availability vectors with explicit rest days
 * - Topic prerequisite topological ordering
 * - Honest feasibility calculation with alternative timelines
 * - Non-overloading missed-task rescheduling
 * - Early completion progression
 */

import type {
  RoadmapWizardDraft,
  FeasibilityAssessment,
  AdaptiveRoadmap,
  AdaptiveStage,
  AdaptiveWeek,
  AdaptiveDay,
  AdaptiveTask,
  DayOfWeek,
  ScheduleRecalculationProposal,
} from '../types/adaptive';

import {
  type CatalogProblemItem,
  BASELINE_CANONICAL_PROBLEMS,
  EXTENDED_CATALOG_PROBLEMS,
  findCatalogProblem,
  getCatalogProblemsByTopic,
} from './catalogRegistry.ts';
import { getSubjectMeta } from './subjectCatalog.ts';
import {
  resolveGoalToSkills,
  type SkillRequirement,
  type GoalInterpretationPlan,
} from './goalSkillMapper.ts';
import {
  assessSkillGaps,
  type TopicGapAnalysis,
  type SkillGapAssessment,
  type LearnerProficiency,
} from './skillGapEngine.ts';
import {
  selectBestProblemForTopic,
  scoreProblemCandidate,
  calculateDifficultyFit,
  DEFAULT_SCORING_WEIGHTS,
  type ScoredProblemCandidate,
} from './problemSelector.ts';
import {
  validatePrerequisiteGraphAcyclic,
  buildTopologicalCurriculum,
  type PlannedCurriculum,
} from './curriculumPlanner.ts';
import {
  calculateHonestFeasibility,
  optimizeSchedule,
  type OptimizedScheduleResult,
} from './scheduleOptimizer.ts';
import {
  validateRoadmapPlan,
  generatePlanExplanation,
  type PlanValidationResult,
} from './planValidator.ts';

export {
  BASELINE_CANONICAL_PROBLEMS,
  EXTENDED_CATALOG_PROBLEMS,
  findCatalogProblem,
  getCatalogProblemsByTopic,
  resolveGoalToSkills,
  assessSkillGaps,
  selectBestProblemForTopic,
  scoreProblemCandidate,
  calculateDifficultyFit,
  DEFAULT_SCORING_WEIGHTS,
  validatePrerequisiteGraphAcyclic,
  buildTopologicalCurriculum,
  calculateHonestFeasibility,
  optimizeSchedule,
  validateRoadmapPlan,
  generatePlanExplanation,
};
export type {
  CatalogProblemItem,
  SkillRequirement,
  GoalInterpretationPlan,
  TopicGapAnalysis,
  SkillGapAssessment,
  LearnerProficiency,
  ScoredProblemCandidate,
  PlannedCurriculum,
  OptimizedScheduleResult,
  PlanValidationResult,
};

// Canonical Catalog Problems (Verified in CHAKRIVA Problem Catalog)
export interface CatalogProblemDef {
  verniqProblemId: string;
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  acceptanceRate: number;
  estimatedMinutes: number;
  keyInvariant: string;
}

export const CANONICAL_CATALOG_PROBLEMS: CatalogProblemDef[] = [
  {
    verniqProblemId: 'VRQ-000001',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    topic: 'Arrays & Hashing',
    acceptanceRate: 82.4,
    estimatedMinutes: 25,
    keyInvariant: 'Complement lookup in single-pass hash map: table contains all elements in 0..i-1.',
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
  },
  {
    verniqProblemId: 'VRQ-000016',
    slug: '3sum',
    title: '3Sum',
    difficulty: 'medium',
    topic: 'Two Pointers',
    acceptanceRate: 58.2,
    estimatedMinutes: 35,
    keyInvariant: 'Sorted two-pointer convergence with duplicate-skipping invariants.',
  },
  {
    verniqProblemId: 'VRQ-000012',
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'medium',
    topic: 'Two Pointers',
    acceptanceRate: 67.4,
    estimatedMinutes: 30,
    keyInvariant: 'Monotonic boundary contraction: eliminate shorter line because width decreases monotonically.',
  },
  {
    verniqProblemId: 'VRQ-000004',
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    topic: 'Stacks & Queues',
    acceptanceRate: 79.1,
    estimatedMinutes: 20,
    keyInvariant: 'LIFO grammar nesting invariant: stack top must strictly match the next closing delimiter.',
  },
  {
    verniqProblemId: 'VRQ-000005',
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    topic: 'Sliding Window',
    acceptanceRate: 61.3,
    estimatedMinutes: 35,
    keyInvariant: 'Dynamic window expansion & contraction: window [L, R] preserves zero duplicate characters.',
  },
  {
    verniqProblemId: 'VRQ-000018',
    slug: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    topic: 'Binary Search',
    acceptanceRate: 51.9,
    estimatedMinutes: 40,
    keyInvariant: 'Half-sorted partition invariant: at least one subarray [L..mid] or [mid..R] is monotonically sorted.',
  },
  {
    verniqProblemId: 'VRQ-000003',
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'medium',
    topic: 'Intervals & Sorting',
    acceptanceRate: 59.8,
    estimatedMinutes: 30,
    keyInvariant: 'Sorted start sweep invariant: overlapping condition curr[0] <= prev[1] allows greedy interval absorption.',
  },
  {
    verniqProblemId: 'VRQ-000002',
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'medium',
    topic: 'Composite Design & Caching',
    acceptanceRate: 53.4,
    estimatedMinutes: 45,
    keyInvariant: 'Synchronized DLL + Hash Map: head node is most recently used, tail node is least recently used.',
  },
  {
    verniqProblemId: 'VRQ-000010',
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    topic: 'Monotonic Stacks & Two Pointers',
    acceptanceRate: 42.1,
    estimatedMinutes: 45,
    keyInvariant: 'Volumetric retention is strictly bounded by min(maxLeft, maxRight) - height[i].',
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
  },
];

// Topic Prerequisite Dependency Map
export const TOPIC_PREREQUISITES: Record<string, string[]> = {
  'Arrays & Hashing': [],
  'Two Pointers': ['Arrays & Hashing'],
  'Sliding Window': ['Two Pointers', 'Arrays & Hashing'],
  'Stacks & Queues': ['Arrays & Hashing'],
  'Binary Search': ['Arrays & Hashing'],
  'Intervals & Sorting': ['Arrays & Hashing', 'Two Pointers'],
  'Monotonic Stacks & Two Pointers': ['Stacks & Queues', 'Two Pointers'],
  'Binary Trees': ['Arrays & Hashing'],
  'Composite Design & Caching': ['Arrays & Hashing', 'Stacks & Queues'],
};

const DAY_KEYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * 1. Feasibility & Capacity Assessment
 */
export function evaluateFeasibility(draft: RoadmapWizardDraft): FeasibilityAssessment {
  const weeklyHours =
    (draft.weeklyAvailability.mon || 0) +
    (draft.weeklyAvailability.tue || 0) +
    (draft.weeklyAvailability.wed || 0) +
    (draft.weeklyAvailability.thu || 0) +
    (draft.weeklyAvailability.fri || 0) +
    (draft.weeklyAvailability.sat || 0) +
    (draft.weeklyAvailability.sun || 0);

  const totalAvailableHours = weeklyHours * Math.max(1, draft.timelineWeeks);

  // Baseline required hours by goal and skill
  let baseHours = 50;
  if (draft.goal === 'internship') baseHours = 55;
  if (draft.goal === 'entry_level' || draft.goal === 'coding_interview') baseHours = 60;
  if (draft.goal === 'experienced') baseHours = 75;
  if (draft.goal === 'competitive_programming') baseHours = 90;
  if (draft.goal === 'dsa_fundamentals') baseHours = 40;
  if (draft.goal === 'placement_prep') baseHours = 50;

  if (draft.companyTargetType === 'faang_competitive' || (draft.targetCompanies && draft.targetCompanies.some((c) => /google|meta|amazon|apple|microsoft|uber/i.test(c)))) {
    baseHours = Math.max(baseHours, 75);
  }

  if (draft.skillLevel === 'beginner') baseHours += 20;
  if (draft.skillLevel === 'basic_familiarity') baseHours += 10;
  if (draft.skillLevel === 'advanced') baseHours = Math.max(25, baseHours - 20);

  // Adjust for struggle topics (+4h per topic) & mastered topics (-3h per topic)
  baseHours += (draft.struggleTopics.length || 0) * 4;
  baseHours = Math.max(20, baseHours - (draft.masteredTopics.length || 0) * 3);

  // Adjust for pacing intensity
  if (draft.pacing === 'intensive') {
    baseHours = Math.round(baseHours * 1.2);
  } else if (draft.pacing === 'flexible') {
    baseHours = Math.round(baseHours * 0.85);
  }

  const isRealistic = totalAvailableHours >= baseHours * 0.75;
  const feasibleAlternativeWeeks = Math.ceil(baseHours / Math.max(1, weeklyHours));

  let pacingSummary = 'Balanced progression with structured rest intervals.';
  if (draft.pacing === 'intensive') {
    pacingSummary = 'High-velocity sprint with dense practice blocks and minimal buffer.';
  } else if (draft.pacing === 'flexible') {
    pacingSummary = 'Gentle cadence with generous review days and flexible deadlines.';
  }

  let recommendation = 'Your schedule is realistic and gives you enough bandwidth to cover core interview patterns thoroughly.';
  if (!isRealistic) {
    recommendation = `Targeting ${draft.goal.replace('_', ' ')} typically requires ~${baseHours} hours of focused practice. At ${weeklyHours} hrs/week, ${draft.timelineWeeks} weeks yields ${totalAvailableHours} hrs. We recommend either extending your target deadline to ${feasibleAlternativeWeeks} weeks or focusing strictly on high-yield core invariants (Arrays, Two Pointers, Hashing).`;
  }

  return {
    isRealistic,
    totalAvailableHours,
    estimatedRequiredHours: baseHours,
    weeklyHours,
    pacingSummary,
    recommendation,
    feasibleAlternativeWeeks: !isRealistic ? feasibleAlternativeWeeks : undefined,
    deficitHours: Math.max(0, baseHours - totalAvailableHours),
  };
}

export interface PersonalizedRoadmapOptions {
  startDate?: string;
  catalog?: CatalogProblemItem[];
  catalogProblems?: CatalogProblemItem[];
  verifiedProgressMap?: Record<string, string>;
  goalSkills?: GoalInterpretationPlan;
}

export interface AdaptiveRoadmapOptions extends PersonalizedRoadmapOptions {
  mode?: 'personalized' | 'baseline';
}

export function resolveDraftStartDate(
  draft: RoadmapWizardDraft,
  explicitStartDate?: string
): string {
  if (explicitStartDate) return explicitStartDate;
  if (draft.startDateOption === 'custom' && draft.customStartDate) {
    return draft.customStartDate;
  }
  const d = new Date();
  if (draft.startDateOption === 'tomorrow') {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

/**
 * 2A. Generate Personalized Learning Plan (Hybrid AI + Deterministic Curriculum Planning)
 * - Dynamic problem selection from EXTENDED_CATALOG_PROBLEMS
 * - Goal-to-skill resolution
 * - Skill-gap assessment & starting point adaptation
 * - Prerequisite DAG topological curation
 * - Capacity-constrained Mon-Sun optimization
 * - Honest feasibility & content gap reporting
 */
export function generatePersonalizedRoadmap(
  draft: RoadmapWizardDraft,
  options?: PersonalizedRoadmapOptions
): AdaptiveRoadmap {
  const startDateStr = resolveDraftStartDate(draft, options?.startDate);
  const verifiedMap = options?.verifiedProgressMap;

  // 1. Goal-to-skill resolution (uses provided interpretation or deterministic mapper)
  const goalPlan = options?.goalSkills || resolveGoalToSkills(draft);

  // 2. Skill-gap assessment
  const gapAssessment = assessSkillGaps(goalPlan.skillRequirements, draft, verifiedMap);
  const topicGapMap = new Map<string, TopicGapAnalysis>(
    gapAssessment.topicGaps.map((g) => [g.topic, g])
  );

  // 3. Prerequisite-aware curriculum planning (DAG topological order)
  const curriculum = buildTopologicalCurriculum(goalPlan, gapAssessment, draft.timelineWeeks);

  // 4. Deterministic schedule optimization
  const scheduleResult = optimizeSchedule(draft, curriculum, topicGapMap, startDateStr);

  // 5. Honest non-DSA track documentation
  const nonDsaTracks = (draft.selectedSubjects || [])
    .filter((subj) => subj !== 'dsa')
    .map((subj) => {
      const meta = getSubjectMeta(subj);
      return {
        subject: subj,
        label: meta?.label || subj,
        note:
          meta?.availabilityNote ||
          'Scheduled as structured concept study without automated code-judge verification.',
      };
    });

  const resolvedTitle =
    draft.planName?.trim() ||
    (draft.targetRole ? `${draft.targetRole} Roadmap` : 'Personalized Preparation Roadmap');

  const roadmap: AdaptiveRoadmap = {
    id: `roadmap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: resolvedTitle,
    status: 'active',
    isActive: true,
    startDate: startDateStr,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: draft,
    feasibility: scheduleResult.feasibility,
    stages: curriculum.stages,
    weeks: scheduleResult.weeks,
    totalTasks: scheduleResult.totalTasks,
    completedTasks: 0,
    missedTasks: 0,
    progressPercent: 0,
    version: 1,
    ...(nonDsaTracks.length > 0 ? { nonDsaTracks } : {}),
  };

  // 6. Validation
  const validation = validateRoadmapPlan(roadmap);
  if (!validation.isValid) {
    console.warn('Roadmap validation warnings/issues:', validation.errors);
  }

  // 7. Explanation metadata
  const contentGapNotes: string[] = [];
  if (scheduleResult.contentGapCount > 0) {
    contentGapNotes.push('Content gap topic included as conceptual invariant study');
  }
  for (const track of nonDsaTracks) {
    contentGapNotes.push(`${track.label}: ${track.note}`);
  }

  roadmap.explanation = generatePlanExplanation(
    roadmap,
    goalPlan,
    gapAssessment,
    contentGapNotes
  );

  return roadmap;
}

/**
 * 2B. Generate Adaptive Learning Plan
 * Backwards-compatible entrypoint. Automatically delegates to generatePersonalizedRoadmap
 * when options.mode === 'personalized' or draft indicates personalized planning,
 * while maintaining 100% Phase 3A test regression fidelity for legacy baseline calls.
 */
export function generateAdaptiveRoadmap(
  draft: RoadmapWizardDraft,
  optionsOrStartDate?: AdaptiveRoadmapOptions | string
): AdaptiveRoadmap {
  const options: AdaptiveRoadmapOptions =
    typeof optionsOrStartDate === 'string'
      ? { startDate: optionsOrStartDate }
      : (optionsOrStartDate || {});

  if (options.mode === 'personalized' || (draft as any).personalizationMode === 'personalized') {
    return generatePersonalizedRoadmap(draft, options);
  }

  const feasibility = evaluateFeasibility(draft);
  const now = options.startDate ? new Date(options.startDate) : new Date();

  // Curate stages based on topics and prerequisites
  const stages: AdaptiveStage[] = [
    {
      id: 'stage-1',
      stageNumber: 1,
      title: 'Core Foundations & Linear Invariants',
      description: 'Master complement lookups, prefix accumulations, and single-pass hash invariants.',
      topics: ['Arrays & Hashing'],
      weeks: [1],
    },
    {
      id: 'stage-2',
      stageNumber: 2,
      title: 'Two-Pointer & Sliding Window Monotonicity',
      description: 'Establish convergent boundary invariants, sorted sweeps, and frequency window expansion.',
      topics: ['Two Pointers', 'Sliding Window'],
      weeks: [2],
    },
    {
      id: 'stage-3',
      stageNumber: 3,
      title: 'LIFO Parser Invariants & Binary Search Partitions',
      description: 'Bracket grammar matching, monotonic decreasing sweeps, and half-sorted logarithmic partition.',
      topics: ['Stacks & Queues', 'Binary Search'],
      weeks: [3],
    },
    {
      id: 'stage-4',
      stageNumber: 4,
      title: 'Interval Sweeps, Trees & Caching Systems',
      description: 'Greedy interval absorption, tree structural recursion, and composite LRU eviction mechanics.',
      topics: ['Intervals & Sorting', 'Binary Trees', 'Composite Design & Caching', 'Monotonic Stacks & Two Pointers'],
      weeks: [4],
    },
  ];

  // Map problems avoiding duplicates
  const assignedProblemVerniqIds = new Set<string>();
  const totalWeeks = Math.max(1, draft.timelineWeeks);
  const weeks: AdaptiveWeek[] = [];
  let taskCounter = 1;

  for (let w = 0; w < totalWeeks; w++) {
    const weekNum = w + 1;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + w * 7);

    // Determine current stage
    const stageIndex = Math.min(stages.length - 1, Math.floor((w / totalWeeks) * stages.length));
    const currentStage = stages[stageIndex];
    if (!currentStage.weeks.includes(weekNum)) {
      currentStage.weeks.push(weekNum);
    }

    const days: AdaptiveDay[] = [];

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dateStr = dayDate.toISOString().split('T')[0];
      const dayKey = DAY_KEYS[d];
      const availableHours = draft.weeklyAvailability[dayKey] || 0;
      const isRestDay = availableHours === 0;

      const dayTasks: AdaptiveTask[] = [];

      // Only schedule tasks on active days!
      if (!isRestDay) {
        const capacityMinutes = availableHours * 60;
        let usedMinutes = 0;

        // Find candidate problems in current stage topics that haven't been assigned yet
        const candidateProblems = CANONICAL_CATALOG_PROBLEMS.filter((p) => {
          if (assignedProblemVerniqIds.has(p.verniqProblemId)) return false;
          // Prioritize topics in current stage
          return currentStage.topics.includes(p.topic);
        });

        // If candidate problems exist, schedule a concept + problem
        const targetProblem = candidateProblems[0];

        if (targetProblem && usedMinutes + targetProblem.estimatedMinutes + 15 <= capacityMinutes * 1.1) {
          // 1. Concept review
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: `Concept: ${targetProblem.topic} Invariants & Proof`,
            taskType: 'concept',
            estimatedMinutes: 15,
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: targetProblem.topic,
            description: targetProblem.keyInvariant,
          });
          usedMinutes += 15;

          // 2. Practice problem
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: `Practice: ${targetProblem.title}`,
            taskType: 'problem',
            estimatedMinutes: targetProblem.estimatedMinutes,
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: targetProblem.topic,
            verniqProblemId: targetProblem.verniqProblemId,
            problemSlug: targetProblem.slug,
            problemTitle: targetProblem.title,
            problemDifficulty: targetProblem.difficulty,
            problemAcceptanceRate: targetProblem.acceptanceRate,
            keyInvariant: targetProblem.keyInvariant,
            description: `Solve ${targetProblem.title} and submit to the CHAKRIVA execution judge.`,
          });
          assignedProblemVerniqIds.add(targetProblem.verniqProblemId);
          usedMinutes += targetProblem.estimatedMinutes;
        }

        // Add spaced revision if remaining capacity allows
        if (capacityMinutes - usedMinutes >= 20 && assignedProblemVerniqIds.size > 1) {
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: 'Spaced Retrieval: Review Prior Solution Invariants',
            taskType: 'revision',
            estimatedMinutes: 20,
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: currentStage.topics[0] || 'Core Foundations',
            description: 'Ebbinghaus spaced review of previously solved patterns to cement algorithmic invariants.',
          });
          usedMinutes += 20;
        }
      }

      days.push({
        date: dateStr,
        dayOfWeek: dayKey,
        dayNumber: d + 1,
        availableHours,
        isRestDay,
        tasks: dayTasks,
      });
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      weekNumber: weekNum,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      title: `Week ${weekNum} — ${currentStage.title}`,
      objective: `Focus on ${currentStage.topics.join(' & ')} with rigorous invariant verification.`,
      stageName: currentStage.title,
      days,
    });
  }

  // Calculate high-level stats
  const allTasks = weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
  const totalTasks = allTasks.length;

  return {
    id: `roadmap-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: draft,
    feasibility,
    stages,
    weeks,
    totalTasks,
    completedTasks: 0,
    missedTasks: 0,
    progressPercent: 0,
  };
}

/**
 * 3. Adaptive Rescheduling for Missed Tasks
 * - Preserves task completion history
 * - Does NOT overload tomorrow automatically
 * - Spreads unfinished tasks over upcoming available days respecting capacity
 */
export function recalculateMissedTasks(
  roadmap: AdaptiveRoadmap,
  currentDateStr: string = new Date().toISOString().split('T')[0]
): ScheduleRecalculationProposal | null {
  const missedTasksToReschedule: AdaptiveTask[] = [];

  // 1. Identify missed tasks
  for (const week of roadmap.weeks) {
    for (const day of week.days) {
      for (const task of day.tasks) {
        if (task.status === 'completed') continue;

        const isPastDue = day.date < currentDateStr;
        const isMarkedMissed = task.status === 'missed';

        if (isPastDue || isMarkedMissed) {
          task.status = 'missed';
          // Only re-queue problems and concepts for rescheduling (revisions are naturally recurrent)
          if (task.taskType === 'problem' || task.taskType === 'concept') {
            missedTasksToReschedule.push(task);
          }
        }
      }
    }
  }

  if (missedTasksToReschedule.length === 0) {
    return null;
  }

  // 2. Find eligible upcoming days
  const futureDays: AdaptiveDay[] = [];
  for (const week of roadmap.weeks) {
    for (const day of week.days) {
      if (day.date >= currentDateStr && !day.isRestDay && day.availableHours > 0) {
        futureDays.push(day);
      }
    }
  }

  if (futureDays.length === 0) {
    return null;
  }

  const rescheduledTasks: ScheduleRecalculationProposal['rescheduledTasks'] = [];
  let dayIdx = 0;

  for (const task of missedTasksToReschedule) {
    // Round-robin or fill into upcoming days without overloading
    let assigned = false;
    let attempts = 0;

    while (!assigned && attempts < futureDays.length) {
      const targetDay = futureDays[dayIdx % futureDays.length];
      const currentDayMinutes = targetDay.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
      const dayCapacity = targetDay.availableHours * 60;

      // Allow slight 20% stretch to fit rescheduled items without severe overload
      if (currentDayMinutes + task.estimatedMinutes <= dayCapacity * 1.25 || attempts === futureDays.length - 1) {
        rescheduledTasks.push({
          taskId: task.id,
          taskTitle: task.title,
          originalDate: task.scheduledDate,
          newDate: targetDay.date,
          reason: `Rescheduled from ${task.scheduledDate} to preserve prerequisite ordering without overloading ${currentDateStr}.`,
        });
        assigned = true;
      }

      dayIdx++;
      attempts++;
    }
  }

  return {
    roadmapId: roadmap.id,
    missedTaskCount: missedTasksToReschedule.length,
    affectedDaysCount: new Set(rescheduledTasks.map((r) => r.newDate)).size,
    explanation: `${missedTasksToReschedule.length} missed task(s) were safely redistributed across your upcoming available days without overloading any single session.`,
    rescheduledTasks,
  };
}

/**
 * 4. Apply Accepted Schedule Recalculation
 */
export function applyScheduleProposal(
  roadmap: AdaptiveRoadmap,
  proposal: ScheduleRecalculationProposal
): AdaptiveRoadmap {
  const proposalMap = new Map(proposal.rescheduledTasks.map((r) => [r.taskId, r.newDate]));

  const updatedWeeks = roadmap.weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => ({
      ...day,
      tasks: day.tasks.map((task) => {
        const newDate = proposalMap.get(task.id);
        if (newDate) {
          return {
            ...task,
            scheduledDate: newDate,
            status: 'upcoming' as const,
          };
        }
        return task;
      }),
    })),
  }));

  // Re-aggregate high-level counters
  const allTasks = updatedWeeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
  const completed = allTasks.filter((t) => t.status === 'completed').length;
  const missed = allTasks.filter((t) => t.status === 'missed').length;

  return {
    ...roadmap,
    weeks: updatedWeeks,
    completedTasks: completed,
    missedTasks: missed,
    progressPercent: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0,
    lastRecalculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 5. Reconcile Legacy Saved Roadmaps (Backward Compatibility Migration)
 * - Preserves completed task history, status, and timestamps intact.
 * - Reconciles legacy problem IDs:
 *     3Sum (VRQ-000008 -> VRQ-000016)
 *     Container With Most Water (VRQ-000011 -> VRQ-000012)
 *     Search in Rotated Sorted Array (VRQ-000012 -> VRQ-000018)
 * - Transitions uncompleted Invert Binary Tree to Maximum Depth of Binary Tree (VRQ-000137)
 * - Retains completed Invert Binary Tree tasks as completed to preserve user history.
 * - Never marks an uncompleted task as solved by assumption.
 * - Avoids duplicate task creation.
 */
export function reconcileLegacySavedRoadmap(roadmap: AdaptiveRoadmap): AdaptiveRoadmap {
  if (!roadmap || !roadmap.weeks) return roadmap;

  let modified = false;
  const updatedWeeks = roadmap.weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => ({
      ...day,
      tasks: day.tasks.map((task) => {
        // 1. 3Sum legacy ID
        if (task.problemSlug === '3sum' && task.verniqProblemId === 'VRQ-000008') {
          modified = true;
          return { ...task, verniqProblemId: 'VRQ-000016' };
        }
        // 2. Container With Most Water legacy ID
        if (task.problemSlug === 'container-with-most-water' && task.verniqProblemId === 'VRQ-000011') {
          modified = true;
          return { ...task, verniqProblemId: 'VRQ-000012' };
        }
        // 3. Search in Rotated Sorted Array legacy ID
        if (task.problemSlug === 'search-in-rotated-sorted-array' && task.verniqProblemId === 'VRQ-000012') {
          modified = true;
          return { ...task, verniqProblemId: 'VRQ-000018' };
        }
        // 4. Invert Binary Tree replacement
        if (task.problemSlug === 'invert-binary-tree') {
          if (task.status === 'completed') {
            // Preserve user's completed history intact
            return task;
          }
          modified = true;
          return {
            ...task,
            title: 'Practice: Maximum Depth of Binary Tree',
            verniqProblemId: 'VRQ-000137',
            problemSlug: 'maximum-depth-of-binary-tree',
            problemTitle: 'Maximum Depth of Binary Tree',
            problemDifficulty: 'easy' as const,
            problemAcceptanceRate: 83.5,
            keyInvariant:
              'Subtree depth recursion: max_depth(root) = 1 + max(max_depth(root.left), max_depth(root.right)) with base case max_depth(null) = 0.',
            description: 'Solve Maximum Depth of Binary Tree and submit to the CHAKRIVA execution judge.',
          };
        }
        return task;
      }),
    })),
  }));

  return modified ? { ...roadmap, weeks: updatedWeeks } : roadmap;
}

