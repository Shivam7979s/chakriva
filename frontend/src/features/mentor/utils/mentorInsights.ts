import type { Problem, ProblemStatus, Submission } from '@/types';
import type { AdaptiveRoadmap, AdaptiveTask } from '@/features/roadmap/types/adaptive';
import type { AiAssistantResponse, AiMentorAction } from '@/services/aiAssistantService';
import { classifySocraticQuery } from '../../../lib/socraticClassifier.ts';

export type CoachingModeId = 'hint' | 'pattern' | 'approach' | 'review';

export interface CoachingModeConfig {
  id: CoachingModeId;
  label: string;
  tagline: string;
  mentorAction: AiMentorAction;
  actionType: 'approach' | 'review' | 'complexity' | AiMentorAction;
}

export const COACHING_MODES: CoachingModeConfig[] = [
  {
    id: 'hint',
    label: 'Socratic Hint',
    tagline: 'Progressive 1-step invariant nudge without spoilers.',
    mentorAction: 'hint',
    actionType: 'hint',
  },
  {
    id: 'pattern',
    label: 'Pattern & Invariant',
    tagline: 'Isolate the core data structure and loop invariant.',
    mentorAction: 'pattern',
    actionType: 'pattern',
  },
  {
    id: 'approach',
    label: 'Approach Builder',
    tagline: 'Map state transitions, constraints, and edge cases.',
    mentorAction: 'approach',
    actionType: 'approach',
  },
  {
    id: 'review',
    label: 'Complexity & Review',
    tagline: 'Audit Big-O bounds or inspect an attached code snippet.',
    mentorAction: 'complexity',
    actionType: 'review',
  },
];

export const GENERAL_FOCUS_ID = 'general-invariant-studio';

export interface FocusProblemOption {
  id: string;
  slug: string;
  title: string;
  difficulty: Problem['difficulty'];
  topic: string;
  signalLabel: 'Revision Due' | 'Attempted' | 'Recent Submit' | 'Solved' | 'Catalog';
  problem: Problem;
}

export interface TopicFocusSignal {
  topic: string;
  attemptedCount: number;
  revisionCount: number;
  nonAcceptedCount: number;
  leadProblemTitle?: string;
  leadProblemSlug?: string;
  suggestedPrompt: string;
}

export interface NextRoadmapFocus {
  roadmapTitle: string;
  goalLabel: string;
  progressPercent: number;
  completedTasks: number;
  totalTasks: number;
  nextTask: AdaptiveTask | null;
}

function normalizeStatusKey(
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

function isRevisionDue(
  problem: Problem,
  revisionMap: Record<string, boolean>
): boolean {
  return Boolean(
    revisionMap[problem.id] ||
      (problem.verniq_id ? revisionMap[problem.verniq_id] : false) ||
      revisionMap[problem.slug]
  );
}

export function getPrimaryTopic(problem: Problem): string {
  const firstTopic = problem.topics?.find((t) => t && t.trim() && t.trim().toLowerCase() !== 'general')?.trim();
  const firstTag = problem.tags?.find((t) => t && t.trim() && t.trim().toLowerCase() !== 'general')?.trim();
  return firstTopic || firstTag || problem.domain?.trim() || 'Core Algorithms';
}

export function formatVerdictLabel(verdict?: string): string {
  const v = (verdict || '').toLowerCase().trim();
  if (v === 'accepted' || v === 'ac') return 'Accepted';
  if (v === 'wrong_answer' || v === 'wa') return 'Wrong Answer';
  if (v === 'time_limit_exceeded' || v === 'tle') return 'TLE';
  if (v === 'memory_limit_exceeded' || v === 'mle') return 'MLE';
  if (v === 'compilation_error' || v === 'ce') return 'Compile Error';
  if (v === 'runtime_error' || v === 're') return 'Runtime Error';
  return v ? v.replace(/_/g, ' ') : 'Unknown';
}

export function isNonAcceptedVerdict(verdict?: string): boolean {
  if (!verdict) return false;
  const v = verdict.toLowerCase().trim();
  return v !== 'accepted' && v !== 'ac' && v !== 'pending' && v !== 'running';
}

/**
 * Ranks catalog problems for the Mentor context selector so attempted work,
 * revision-queued items, and recent submissions surface before cold catalog items.
 */
export function buildFocusProblemOptions(
  problems: Problem[],
  progressMap: Record<string, ProblemStatus>,
  revisionMap: Record<string, boolean>,
  recentSubmissions: Array<Submission & { problemTitle?: string; problemSlug?: string }>,
  limit = 40
): FocusProblemOption[] {
  const recentProblemIds = new Set(
    recentSubmissions
      .map((s) => s.problem_id)
      .filter((id): id is string => Boolean(id))
  );

  const ranked = problems.map((problem) => {
    const status = normalizeStatusKey(problem, progressMap);
    const inRevision = isRevisionDue(problem, revisionMap);
    const isRecent = recentProblemIds.has(problem.id);

    let priority = 4;
    let signalLabel: FocusProblemOption['signalLabel'] = 'Catalog';

    if (inRevision) {
      priority = 0;
      signalLabel = 'Revision Due';
    } else if (status === 'attempted') {
      priority = 1;
      signalLabel = 'Attempted';
    } else if (isRecent) {
      priority = 2;
      signalLabel = 'Recent Submit';
    } else if (status === 'solved') {
      priority = 3;
      signalLabel = 'Solved';
    }

    return {
      priority,
      option: {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        topic: getPrimaryTopic(problem),
        signalLabel,
        problem,
      },
    };
  });

  ranked.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.option.title.localeCompare(b.option.title);
  });

  return ranked.slice(0, limit).map((item) => item.option);
}

/**
 * Computes empirical topic focus areas strictly from attempted problems,
 * revision bookmarks, and non-accepted recent submissions.
 */
export function deriveTopicFocusSignals(
  problems: Problem[],
  progressMap: Record<string, ProblemStatus>,
  revisionMap: Record<string, boolean>,
  recentSubmissions: Array<Submission & { problemTitle?: string; problemSlug?: string }>,
  limit = 5
): TopicFocusSignal[] {
  const problemByKey = new Map<string, Problem>();
  for (const p of problems) {
    problemByKey.set(p.id, p);
    problemByKey.set(p.slug, p);
    if (p.verniq_id) problemByKey.set(p.verniq_id, p);
  }

  const buckets = new Map<
    string,
    {
      attemptedCount: number;
      revisionCount: number;
      nonAcceptedCount: number;
      leadProblem?: Problem;
    }
  >();

  const touchBucket = (topic: string, problem?: Problem) => {
    const existing = buckets.get(topic) || {
      attemptedCount: 0,
      revisionCount: 0,
      nonAcceptedCount: 0,
      leadProblem: problem,
    };
    if (!existing.leadProblem && problem) {
      existing.leadProblem = problem;
    }
    buckets.set(topic, existing);
    return existing;
  };

  for (const problem of problems) {
    const status = normalizeStatusKey(problem, progressMap);
    const inRevision = isRevisionDue(problem, revisionMap);
    if (status !== 'attempted' && !inRevision) continue;

    const topic = getPrimaryTopic(problem);
    const bucket = touchBucket(topic, problem);
    if (status === 'attempted') bucket.attemptedCount += 1;
    if (inRevision) bucket.revisionCount += 1;
  }

  for (const sub of recentSubmissions) {
    if (!isNonAcceptedVerdict(sub.verdict)) continue;
    const problem =
      (sub.problem_id ? problemByKey.get(sub.problem_id) : undefined) ||
      (sub.problemSlug ? problemByKey.get(sub.problemSlug) : undefined);
    if (!problem) continue;

    const topic = getPrimaryTopic(problem);
    const bucket = touchBucket(topic, problem);
    bucket.nonAcceptedCount += 1;
  }

  return Array.from(buckets.entries())
    .map(([topic, data]) => {
      const score =
        data.revisionCount * 3 + data.attemptedCount * 2 + data.nonAcceptedCount;
      const lead = data.leadProblem;
      const suggestedPrompt = lead
        ? `Let's debrief ${topic} starting with "${lead.title}": what loop invariant or pattern cue should I recognize immediately?`
        : `Give me a Socratic check-in on the core invariants and common edge-case traps in ${topic}.`;

      return {
        score,
        signal: {
          topic,
          attemptedCount: data.attemptedCount,
          revisionCount: data.revisionCount,
          nonAcceptedCount: data.nonAcceptedCount,
          leadProblemTitle: lead?.title,
          leadProblemSlug: lead?.slug,
          suggestedPrompt,
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.signal.topic.localeCompare(b.signal.topic))
    .slice(0, limit)
    .map((entry) => entry.signal);
}

/**
 * Extracts active roadmap summary and next pending/missed task without mutating state.
 */
export function extractRoadmapFocus(
  roadmap: AdaptiveRoadmap | null
): NextRoadmapFocus | null {
  if (!roadmap) return null;

  let nextTask: AdaptiveTask | null = null;
  for (const week of roadmap.weeks || []) {
    for (const day of week.days || []) {
      for (const task of day.tasks || []) {
        if (task.status !== 'completed') {
          nextTask = task;
          break;
        }
      }
      if (nextTask) break;
    }
    if (nextTask) break;
  }

  const goalLabel = roadmap.profile?.customGoalText?.trim()
    ? roadmap.profile.customGoalText.trim()
    : (roadmap.profile?.goal || 'placement_prep').replace(/_/g, ' ');

  return {
    roadmapTitle: roadmap.title?.trim() || 'Adaptive Preparation Plan',
    goalLabel,
    progressPercent: Math.round(roadmap.progressPercent || 0),
    completedTasks: roadmap.completedTasks || 0,
    totalTasks: roadmap.totalTasks || 0,
    nextTask,
  };
}

/**
 * Generates contextual starter prompts tailored to the active problem, mode, and roadmap.
 */
export function buildCoachStarters(
  selectedProblem: FocusProblemOption | null,
  focusTopics: TopicFocusSignal[],
  mode: CoachingModeId,
  roadmapFocus: NextRoadmapFocus | null
): string[] {
  if (selectedProblem) {
    const title = selectedProblem.title;
    if (mode === 'hint') {
      return [
        `Give me the first Socratic hint for "${title}" without revealing code.`,
        `What brute-force bottleneck happens on "${title}", and which invariant eliminates it?`,
        `What boundary or empty/duplicate edge cases break naive solutions on "${title}"?`,
      ];
    }
    if (mode === 'pattern') {
      return [
        `Which algorithmic pattern applies to "${title}", and what constraint signals it?`,
        `Help me verify the exact invariant that makes greedy / pointer / search updates safe in "${title}".`,
        `Compare two candidate data structures for "${title}" and trade-offs.`,
      ];
    }
    if (mode === 'approach') {
      return [
        `Outline a clean 4-step approach for "${title}" before I write code.`,
        `What state definition and transition order should I prove first on "${title}"?`,
        `How do I dry-run "${title}" on the trickiest edge case?`,
      ];
    }
    return [
      `Audit the optimal time and auxiliary space complexity target for "${title}".`,
      `Review my pasted code for "${title}" and point out only the highest-impact bug or bottleneck.`,
      `Why could an O(n^2) solution pass small examples yet TLE on "${title}"?`,
    ];
  }

  const starters: string[] = [];
  if (focusTopics[0]) {
    starters.push(focusTopics[0].suggestedPrompt);
  }
  if (roadmapFocus?.nextTask) {
    starters.push(
      `Walk me through the key invariant for my next roadmap task: "${roadmapFocus.nextTask.title}".`
    );
  }

  const defaults = [
    'Quiz me on choosing between Sliding Window, Two Pointers, and Binary Search on constraints.',
    'Why does moving the shorter boundary in Container With Most Water preserve optimality?',
    'How should I structure DFS recursion vs BFS level order to avoid subtle state bugs?',
  ];

  for (const item of defaults) {
    if (starters.length >= 3) break;
    if (!starters.includes(item)) starters.push(item);
  }

  return starters.slice(0, 3);
}

export function buildFollowUpPrompts(
  selectedProblemTitle?: string,
  mode: CoachingModeId = 'hint'
): Array<{ label: string; prompt: string; modeId: CoachingModeId }> {
  const target = selectedProblemTitle ? `on "${selectedProblemTitle}"` : 'here';
  if (mode === 'hint') {
    return [
      {
        label: 'Next Hint',
        prompt: `Give me the next progressive hint ${target}, focusing strictly on the boundary condition.`,
        modeId: 'hint',
      },
      {
        label: 'Check Complexity',
        prompt: `What target time and auxiliary space complexity should I aim for ${target}?`,
        modeId: 'review',
      },
      {
        label: 'Trace Edge Cases',
        prompt: `Which edge cases (empty input, duplicates, negative values, bounds) most often break ${target}?`,
        modeId: 'approach',
      },
    ];
  }

  return [
    {
      label: 'Nudge With a Hint',
      prompt: `Give me one concrete invariant hint ${target} without writing code.`,
      modeId: 'hint',
    },
    {
      label: 'Verify Complexity',
      prompt: `Compare brute-force vs optimal asymptotic complexity ${target}.`,
      modeId: 'review',
    },
    {
      label: 'Test Edge Cases',
      prompt: `List the top 3 boundary edge cases I should dry-run ${target}.`,
      modeId: 'approach',
    },
  ];
}

export interface FallbackProblemContext {
  title?: string;
  topic?: string;
  difficulty?: string;
}

/**
 * Produces an honest, deterministic Socratic fallback response when live Riva
 * cannot be reached or is unconfigured on the server.
 */
export function buildFallbackMentorReply(
  query: string,
  mode: CoachingModeId,
  selectedProblem?: string | FallbackProblemContext,
  errorCode?: AiAssistantResponse['errorCode'],
  hintStep?: number
): string {
  const problemTitle =
    typeof selectedProblem === 'string' ? selectedProblem : selectedProblem?.title;
  const problemTopic =
    typeof selectedProblem === 'string' ? undefined : selectedProblem?.topic;

  // Classify raw query first to honor zero-spoilers mandates, then enrich with active
  // problem context so natural follow-ups ("where do I start?") stay grounded in the problem.
  let local = classifySocraticQuery(query);
  if (
    (local.category === 'general_invariant' || local.category === 'domain_boundary') &&
    (problemTitle || problemTopic)
  ) {
    const enriched = classifySocraticQuery(
      `${problemTitle || ''} ${problemTopic || ''} ${query}`
    );
    if (enriched.category !== 'domain_boundary') {
      local = enriched;
    }
  }

  let extraModeDrill = '';
  if (
    local.category !== 'zero_spoilers' &&
    local.category !== 'domain_boundary'
  ) {
    if (mode === 'hint' && hintStep && hintStep >= 2) {
      extraModeDrill =
        hintStep === 2
          ? '\n\n**Hint #2 (State Transition Check):** Track the exact state variables updated on each iteration and prove why no valid answer can ever be skipped by that update.'
          : `\n\n**Hint #${hintStep} (Boundary Verification):** Dry-run your update rule on a minimal 2-element input and an empty/uniform input before finalizing termination bounds.`;
    } else if (mode === 'approach') {
      extraModeDrill =
        '\n\n**Approach Blueprint:**\n1. State the brute-force bottleneck explicitly.\n2. Identify what redundant work your invariant eliminates.\n3. Verify loop initialization, maintenance, and termination.';
    } else if (mode === 'review') {
      extraModeDrill =
        '\n\n**Complexity Checklist:** Verify input scale `N`, inner-loop work per element, and whether recursion depth or auxiliary hash/heap storage drives peak memory.';
    }
  }

  const noticeSuffix =
    errorCode === 'UNAUTHORIZED'
      ? '\n\n*Sign in to connect live Riva responses.*'
      : '';

  return `${local.guidance}${extraModeDrill}${noticeSuffix}`;
}
