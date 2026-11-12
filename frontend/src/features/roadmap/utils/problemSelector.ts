/**
 * CHAKRIVA Dynamic Problem Selector & Explainable Multi-Factor Ranker
 * ==================================================================
 * Retrieves authentic catalog candidates, computes explainable multi-factor
 * utility scores, enforces hard constraints separately, and uses deterministic
 * tie-breaking to construct coherent practice sequences.
 *
 * Implements Phase F of CHAKRIVA Personalized Roadmap Engine.
 */

import type { RoadmapWizardDraft } from '../types/adaptive';
import {
  type CatalogProblemItem,
  EXTENDED_CATALOG_PROBLEMS,
  getCatalogProblemsByTopic,
} from './catalogRegistry.ts';
import type { TopicGapAnalysis } from './skillGapEngine.ts';

export interface ProblemScoringWeights {
  goalRelevanceWeight: number; // default: 0.25
  gapContributionWeight: number; // default: 0.30
  difficultyFitWeight: number; // default: 0.20
  prerequisiteReadinessWeight: number; // default: 0.15
  learningValueWeight: number; // default: 0.10
  repetitionPenalty: number; // default: 10.0
}

export const DEFAULT_SCORING_WEIGHTS: ProblemScoringWeights = {
  goalRelevanceWeight: 0.25,
  gapContributionWeight: 0.30,
  difficultyFitWeight: 0.20,
  prerequisiteReadinessWeight: 0.15,
  learningValueWeight: 0.10,
  repetitionPenalty: 10.0,
};

export interface ScoredProblemCandidate {
  problem: CatalogProblemItem;
  totalScore: number;
  components: {
    goalRelevance: number;
    gapContribution: number;
    difficultyFit: number;
    prerequisiteReadiness: number;
    learningValue: number;
    penalty: number;
  };
  explanation: string;
}

export interface SelectedPracticeItem {
  problem: CatalogProblemItem;
  score: ScoredProblemCandidate;
  isExecutable: boolean;
  isJudgeReady: boolean;
  isDraft: boolean;
  statusNote?: string;
}

export interface ContentGapItem {
  topic: string;
  isContentGap: true;
  reason: string;
  recommendedConceptTitle: string;
}

/**
 * Calculates difficulty suitability score (0.0 to 1.0) based on learner level
 */
export function calculateDifficultyFit(difficulty: 'easy' | 'medium' | 'hard', skillLevel: string): number {
  const level = (skillLevel || 'intermediate').toLowerCase();

  if (level === 'beginner') {
    if (difficulty === 'easy') return 1.0;
    if (difficulty === 'medium') return 0.55;
    return 0.15; // Hard is too frustrating for beginner
  }

  if (level === 'advanced') {
    if (difficulty === 'hard') return 1.0;
    if (difficulty === 'medium') return 0.85;
    return 0.40; // Easy provides lower learning return
  }

  // Intermediate
  if (difficulty === 'medium') return 1.0;
  if (difficulty === 'easy') return 0.75;
  return 0.65;
}

/**
 * Computes multi-factor score for a candidate problem
 */
export function scoreProblemCandidate(
  problem: CatalogProblemItem,
  draft: RoadmapWizardDraft,
  topicGapMap: Map<string, TopicGapAnalysis>,
  assignedIds: Set<string>,
  weights: ProblemScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoredProblemCandidate {
  // 1. Goal & Company Relevance (0.0 - 1.0)
  const targetCompanies = (draft.targetCompanies || []).map((c) => c.toLowerCase());
  const probCompanies = (problem.companies || []).map((c) => c.toLowerCase());
  const hasCompanyMatch = targetCompanies.some((tc) => probCompanies.includes(tc));
  const goalRelevance = hasCompanyMatch ? 1.0 : 0.7;

  // 2. Skill-Gap Contribution (0.0 - 1.0)
  const gapAnalysis = topicGapMap.get(problem.topic);
  const gapContribution = gapAnalysis ? gapAnalysis.gapScore : 0.5;

  // 3. Difficulty Fit (0.0 - 1.0)
  const difficultyFit = calculateDifficultyFit(problem.difficulty, draft.skillLevel);

  // 4. Prerequisite Readiness (0.0 - 1.0)
  const prerequisiteReadiness = gapAnalysis && gapAnalysis.isPrerequisiteSatisfied ? 1.0 : 0.6;

  // 5. Learning Value (0.0 - 1.0)
  // Measured by balanced acceptance rate (40% - 85% is ideal for practice) and invariant depth
  const acceptance = problem.acceptanceRate || 65;
  const learningValue = acceptance >= 45 && acceptance <= 85 ? 0.95 : 0.75;

  // 6. Repetition Penalty
  const isAlreadyAssigned = assignedIds.has(problem.verniqProblemId);
  const penalty = isAlreadyAssigned ? weights.repetitionPenalty : 0.0;

  const totalScore =
    weights.goalRelevanceWeight * goalRelevance +
    weights.gapContributionWeight * gapContribution +
    weights.difficultyFitWeight * difficultyFit +
    weights.prerequisiteReadinessWeight * prerequisiteReadiness +
    weights.learningValueWeight * learningValue -
    penalty;

  const explanation = `Score ${totalScore.toFixed(2)} [Goal:${goalRelevance.toFixed(2)}, Gap:${gapContribution.toFixed(2)}, Diff:${difficultyFit.toFixed(2)}, Prereq:${prerequisiteReadiness.toFixed(2)}, Value:${learningValue.toFixed(2)}]`;

  return {
    problem,
    totalScore,
    components: {
      goalRelevance,
      gapContribution,
      difficultyFit,
      prerequisiteReadiness,
      learningValue,
      penalty,
    },
    explanation,
  };
}

/**
 * Selects and ranks candidate problems for a topic
 * Enforces deterministic tie-breaking (acceptance rate then canonical ID)
 */
export function selectBestProblemForTopic(
  topic: string,
  draft: RoadmapWizardDraft,
  topicGapMap: Map<string, TopicGapAnalysis>,
  assignedIds: Set<string>,
  weights: ProblemScoringWeights = DEFAULT_SCORING_WEIGHTS
): SelectedPracticeItem | ContentGapItem {
  const candidates = getCatalogProblemsByTopic(topic);

  if (candidates.length === 0) {
    return {
      topic,
      isContentGap: true,
      reason: `No catalog problem exists for topic "${topic}". Preserving educational topic via concept study.`,
      recommendedConceptTitle: `Concept: ${topic} Theoretical Invariants & Proofs`,
    };
  }

  // Score all candidates
  const scored = candidates.map((prob) => scoreProblemCandidate(prob, draft, topicGapMap, assignedIds, weights));

  // Sort by totalScore descending, then deterministic tie-breaker:
  // Tie-breaker 1: Highest acceptance rate (or difficulty match)
  // Tie-breaker 2: Alphabetical verniqProblemId (e.g. VRQ-000001 < VRQ-000002)
  scored.sort((a, b) => {
    if (Math.abs(b.totalScore - a.totalScore) > 0.0001) {
      return b.totalScore - a.totalScore;
    }
    if (Math.abs(b.problem.acceptanceRate - a.problem.acceptanceRate) > 0.1) {
      return b.problem.acceptanceRate - a.problem.acceptanceRate;
    }
    return a.problem.verniqProblemId.localeCompare(b.problem.verniqProblemId);
  });

  const best = scored[0];
  const problem = best.problem;

  // Distinguish educational relevance from judge execution readiness
  const isDraft = problem.workflowStatus === 'draft' || !problem.isPublished;
  const isJudgeReady = problem.isJudgeReady;
  const isExecutable = !isDraft && isJudgeReady;

  let statusNote: string | undefined;
  if (!isExecutable) {
    statusNote = isDraft
      ? 'Educational selection: problem is in draft review and pending execution judge verification.'
      : 'Educational selection: problem judge suite is currently offline for calibration.';
  }

  return {
    problem,
    score: best,
    isExecutable,
    isJudgeReady,
    isDraft,
    statusNote,
  };
}

/**
 * Ranks candidate problems for a topic with explainable scoring and content status notes
 */
export function rankCandidateProblems(
  candidates: CatalogProblemItem[],
  topic: string,
  _difficulty: 'easy' | 'medium' | 'hard',
  skillLevel: string,
  assignedIds: Set<string> = new Set()
): { problem: CatalogProblemItem; score: number; notes?: string }[] {
  const dummyDraft: any = { skillLevel, targetCompanies: [] };
  const dummyGapMap = new Map<string, TopicGapAnalysis>();
  dummyGapMap.set(topic, {
    topic,
    currentProficiency: 'learning',
    targetProficiency: 'practicing',
    gapScore: 0.8,
    isPrerequisiteSatisfied: true,
    missingPrerequisites: [],
    evidenceSource: 'comfort_rating',
    recommendedAction: 'focused_practice',
  });

  const scored = candidates.map((p) => {
    const sc = scoreProblemCandidate(p, dummyDraft, dummyGapMap, assignedIds);
    let notes: string | undefined;
    if (!p.isJudgeReady || p.workflowStatus === 'draft') {
      notes = 'Draft record — not currently judge-executable; included for conceptual practice';
    }
    return {
      problem: p,
      score: sc.totalScore,
      notes,
    };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 0.0001) return b.score - a.score;
    if (Math.abs(b.problem.acceptanceRate - a.problem.acceptanceRate) > 0.1) {
      return b.problem.acceptanceRate - a.problem.acceptanceRate;
    }
    return a.problem.verniqProblemId.localeCompare(b.problem.verniqProblemId);
  });

  return scored;
}

/**
 * Selects candidate practice problems for a stage topic
 */
export function selectProblemsForStage(
  topic: string,
  skillLevel: string,
  count: number = 1,
  catalog: CatalogProblemItem[] = EXTENDED_CATALOG_PROBLEMS,
  assignedIds: Set<string> = new Set()
): { problems: CatalogProblemItem[] } {
  const candidates = catalog.filter((p) => p.topic === topic);
  const ranked = rankCandidateProblems(candidates, topic, 'medium', skillLevel, assignedIds);
  return {
    problems: ranked.slice(0, count).map((r) => r.problem),
  };
}

