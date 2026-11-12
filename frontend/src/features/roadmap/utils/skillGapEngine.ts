/**
 * CHAKRIVA Skill-Gap Analysis Engine
 * ==================================
 * Evaluates learner proficiency, calculates gap deltas between current
 * and target states, and determines starting point without forcing
 * proficient learners to repeat mastered introductory material.
 *
 * Implements Phase E of CHAKRIVA Personalized Roadmap Engine.
 */

import type { RoadmapWizardDraft } from '../types/adaptive';
import type { SkillRequirement } from './goalSkillMapper';

export type LearnerProficiency =
  | 'unknown'
  | 'not_started'
  | 'learning'
  | 'practicing'
  | 'demonstrated_proficiency';

export interface TopicGapAnalysis {
  topic: string;
  currentProficiency: LearnerProficiency;
  targetProficiency: string;
  gapScore: number; // 0.0 (no gap) to 1.0 (maximum gap)
  isPrerequisiteSatisfied: boolean;
  missingPrerequisites: string[];
  evidenceSource: 'verified_judge' | 'self_declared_mastery' | 'comfort_rating' | 'skill_level_inference' | 'conservative_default';
  recommendedAction: 'skip_intro' | 'start_from_foundation' | 'focused_practice' | 'reinforce_invariants';
}

export interface SkillGapAssessment {
  topicGaps: TopicGapAnalysis[];
  overallStartingStageNumber: number;
  startingTopic: string;
  startingPointRationale: string;
  bypassedIntroductoryTopics: string[];
  highPriorityGapTopics: string[];
}

const PROFICIENCY_RANKS: Record<LearnerProficiency, number> = {
  unknown: 0,
  not_started: 0,
  learning: 1,
  practicing: 2,
  demonstrated_proficiency: 3,
};

/**
 * Assesses skill gaps across all required topics given learner draft and progress
 */
export function assessSkillGaps(
  requirements: SkillRequirement[],
  draft: RoadmapWizardDraft,
  verifiedProgressMap?: Record<string, string>
): SkillGapAssessment {
  const masteredSet = new Set((draft.masteredTopics || []).map((t) => t.toLowerCase()));
  const struggleSet = new Set((draft.struggleTopics || []).map((t) => t.toLowerCase()));
  const comfortMap = draft.topicComfort || {};

  const gaps: TopicGapAnalysis[] = [];
  const bypassedTopics: string[] = [];

  for (const req of requirements) {
    const topicLower = req.topic.toLowerCase();

    // 1. Determine current proficiency from best available evidence
    let currentProf: LearnerProficiency = 'unknown';
    let evidence: TopicGapAnalysis['evidenceSource'] = 'conservative_default';

    // A. Verified judge evidence (highest authority)
    if (verifiedProgressMap && (verifiedProgressMap[req.topic] === 'solved' || verifiedProgressMap[req.topic] === 'mastered')) {
      currentProf = 'demonstrated_proficiency';
      evidence = 'verified_judge';
    }
    // B. Explicit user declared mastery
    else if (masteredSet.has(topicLower)) {
      currentProf = 'demonstrated_proficiency';
      evidence = 'self_declared_mastery';
    }
    // C. Explicit user declared struggle
    else if (struggleSet.has(topicLower)) {
      currentProf = 'learning';
      evidence = 'comfort_rating';
    }
    // D. Step 2 Topic comfort rating
    else if (comfortMap[req.topic]) {
      const c = comfortMap[req.topic];
      if (c === 'mastered') {
        currentProf = 'demonstrated_proficiency';
        evidence = 'comfort_rating';
      } else if (c === 'comfortable') {
        currentProf = 'practicing';
        evidence = 'comfort_rating';
      } else if (c === 'learning') {
        currentProf = 'learning';
        evidence = 'comfort_rating';
      } else {
        currentProf = 'not_started';
        evidence = 'comfort_rating';
      }
    }
    // E. General skill level inference
    else {
      const generalSkill = draft.skillLevel;
      if (generalSkill === 'advanced' && (req.topic === 'Arrays & Hashing' || req.topic === 'Two Pointers')) {
        currentProf = 'demonstrated_proficiency';
        evidence = 'skill_level_inference';
      } else if (generalSkill === 'intermediate' && req.topic === 'Arrays & Hashing') {
        currentProf = 'practicing';
        evidence = 'skill_level_inference';
      } else if (generalSkill === 'beginner') {
        currentProf = 'not_started';
        evidence = 'skill_level_inference';
      } else {
        currentProf = 'unknown';
        evidence = 'conservative_default';
      }
    }

    // 2. Check prerequisites satisfaction
    const missingPrereqs: string[] = [];
    for (const prereq of req.prerequisites) {
      const prereqLower = prereq.toLowerCase();
      const prereqMastered =
        masteredSet.has(prereqLower) ||
        (verifiedProgressMap && verifiedProgressMap[prereq] === 'solved') ||
        (draft.skillLevel === 'advanced' && prereq === 'Arrays & Hashing');

      if (!prereqMastered) {
        missingPrereqs.push(prereq);
      }
    }

    const isPrereqSatisfied = missingPrereqs.length === 0;

    // 3. Compute gap score
    const targetRank = req.targetProficiency === 'demonstrated_proficiency' ? 3 : req.targetProficiency === 'practicing' ? 2 : 1;
    const currentRank = PROFICIENCY_RANKS[currentProf];
    const diff = Math.max(0, targetRank - currentRank);

    // If struggle topic, widen gap
    const struggleMultiplier = struggleSet.has(topicLower) ? 1.2 : 1.0;
    const baseGap = diff === 0 ? 0.0 : diff === 1 ? 0.4 : diff === 2 ? 0.75 : 1.0;
    const gapScore = Math.min(1.0, baseGap * struggleMultiplier);

    // 4. Recommended action
    let action: TopicGapAnalysis['recommendedAction'] = 'start_from_foundation';
    if (currentProf === 'demonstrated_proficiency') {
      action = 'skip_intro';
      bypassedTopics.push(req.topic);
    } else if (currentProf === 'practicing') {
      action = 'focused_practice';
    } else if (currentProf === 'learning') {
      action = 'reinforce_invariants';
    }

    gaps.push({
      topic: req.topic,
      currentProficiency: currentProf,
      targetProficiency: req.targetProficiency,
      gapScore,
      isPrerequisiteSatisfied: isPrereqSatisfied,
      missingPrerequisites: missingPrereqs,
      evidenceSource: evidence,
      recommendedAction: action,
    });
  }

  // Determine starting stage and rationale
  const hasArraysMastered =
    masteredSet.has('arrays & hashing') ||
    draft.skillLevel === 'advanced' ||
    (verifiedProgressMap && verifiedProgressMap['Arrays & Hashing'] === 'solved');

  const hasTwoPointersMastered =
    masteredSet.has('two pointers') ||
    (hasArraysMastered && draft.skillLevel === 'advanced');

  let startingStage = 1;
  let startingTopic = 'Arrays & Hashing';
  let startingRationale = 'Starting at Stage 1 (Arrays & Hashing) to build foundational linear invariants.';

  if (hasArraysMastered && hasTwoPointersMastered) {
    startingStage = 2;
    startingTopic = 'Sliding Window';
    startingRationale =
      'Arrays & Hashing and Two Pointers are already mastered. Introductory linear practice bypassed; starting directly with non-linear structures and dynamic windows.';
  } else if (hasArraysMastered) {
    startingStage = 1; // Stage 1 fast-tracks to Two Pointers
    startingTopic = 'Two Pointers';
    startingRationale =
      'Arrays & Hashing fundamentals verified. Basic lookup drills bypassed; focusing immediately on Two-Pointer boundary convergence.';
  }

  const highPriorityGaps = gaps
    .filter((g) => g.gapScore >= 0.5)
    .sort((a, b) => b.gapScore - a.gapScore)
    .map((g) => g.topic);

  return {
    topicGaps: gaps,
    overallStartingStageNumber: startingStage,
    startingTopic,
    startingPointRationale: startingRationale,
    bypassedIntroductoryTopics: bypassedTopics,
    highPriorityGapTopics: highPriorityGaps,
  };
}

/**
 * Convenience helper for evaluating skill gaps
 */
export function calculateSkillGaps(
  arg1: any,
  arg2: any,
  verifiedProgressMap?: Record<string, string>
): SkillGapAssessment {
  if (Array.isArray(arg1)) {
    return assessSkillGaps(arg1, arg2, verifiedProgressMap);
  }
  if (Array.isArray(arg2)) {
    return assessSkillGaps(arg2, arg1, verifiedProgressMap);
  }
  const reqs = arg2?.skillRequirements || arg2?.recommendedTopics || arg1?.skillRequirements || [];
  const draft = Array.isArray(arg1) ? arg2 : arg1;
  return assessSkillGaps(reqs, draft, verifiedProgressMap);
}

/**
 * Returns calibrated starting stage index (1-based)
 */
export function determineStartingStage(
  _draft: RoadmapWizardDraft,
  gapAssessment: SkillGapAssessment
): number {
  return gapAssessment.overallStartingStageNumber;
}

