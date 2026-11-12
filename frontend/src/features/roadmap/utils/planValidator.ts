/**
 * CHAKRIVA Plan Validator & Explanation Generator
 * ===============================================
 * Validates generated roadmaps against domain model constraints,
 * checks problem references, ensures DAG acyclicity, enforces rest-day invariants,
 * and generates human-readable pedagogical explanations.
 *
 * Implements Phase I of CHAKRIVA Personalized Roadmap Engine.
 */

import type { AdaptiveRoadmap } from '../types/adaptive';
import { findCatalogProblem } from './catalogRegistry.ts';
import type { GoalInterpretationPlan } from './goalSkillMapper.ts';
import type { SkillGapAssessment } from './skillGapEngine.ts';
import { validatePrerequisiteGraphAcyclic } from './curriculumPlanner.ts';

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PlanExplanation {
  goalAlignmentSummary: string;
  startingPointRationale: string;
  scheduleFitExplanation: string;
  assumptions: string[];
  contentGaps: string[];
  startingPointReason?: string;
  primaryGoalRationale?: string;
  timeFitExplanation?: string;
}

/**
 * Validates generated roadmap against all structural and catalog invariants
 */
export function validateRoadmapPlan(roadmap: AdaptiveRoadmap): PlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!roadmap || !roadmap.weeks || roadmap.weeks.length === 0) {
    errors.push('Roadmap contains no weeks.');
    return { isValid: false, errors, warnings };
  }

  // 1. Check prerequisite graph acyclicity
  if (!validatePrerequisiteGraphAcyclic()) {
    errors.push('Prerequisite graph contains cycles.');
  }

  const seenTaskIds = new Set<string>();
  const seenProblemIds = new Set<string>();

  for (const week of roadmap.weeks) {
    for (const day of week.days) {
      // 2. Zero tasks on rest days
      if (day.isRestDay || day.availableHours === 0) {
        if (day.tasks && day.tasks.length > 0) {
          errors.push(`Rest day ${day.date} (${day.dayOfWeek}) has ${day.tasks.length} tasks scheduled.`);
        }
      }

      for (const task of day.tasks) {
        // 3. Task ID uniqueness
        if (seenTaskIds.has(task.id)) {
          errors.push(`Duplicate task ID detected: ${task.id}`);
        }
        seenTaskIds.add(task.id);

        // 4. Valid durations
        if (task.estimatedMinutes <= 0) {
          errors.push(`Task ${task.id} has invalid duration: ${task.estimatedMinutes}`);
        }

        // 5. Problem binding integrity
        if (task.taskType === 'problem' || task.verniqProblemId) {
          if (!task.verniqProblemId) {
            errors.push(`Practice task ${task.id} is missing verniqProblemId.`);
          } else {
            // Verify canonical record exists in catalog
            const catalogItem = findCatalogProblem(task.verniqProblemId);
            if (!catalogItem) {
              errors.push(`Task ${task.id} references unknown catalog problem: ${task.verniqProblemId}`);
            } else {
              // Verify slug and title alignment
              if (task.problemSlug && task.problemSlug !== catalogItem.slug) {
                errors.push(
                  `Task ${task.id} slug mismatch: declared "${task.problemSlug}", catalog has "${catalogItem.slug}"`
                );
              }
            }

            // Duplicate problem assignment check (practice problems should be distinct)
            if (task.taskType === 'problem') {
              if (seenProblemIds.has(task.verniqProblemId)) {
                warnings.push(`Duplicate practice problem assignment: ${task.verniqProblemId}`);
              }
              seenProblemIds.add(task.verniqProblemId);
            }
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generates structured explanation metadata for the roadmap
 */
export function generatePlanExplanation(
  roadmap: AdaptiveRoadmap,
  goalPlan: GoalInterpretationPlan,
  gapAssessment: SkillGapAssessment,
  contentGapTopics: string[] = []
): PlanExplanation {
  const profile = roadmap.profile;
  const feasibility = roadmap.feasibility;

  // 1. Goal alignment summary
  const goalStr = profile.goal.replace(/_/g, ' ');
  const companiesStr = profile.targetCompanies && profile.targetCompanies.length > 0
    ? ` targeting ${profile.targetCompanies.join(', ')}`
    : '';
  const goalAlignmentSummary =
    `This curriculum is personalized for your ${goalStr} goal (${profile.targetRole || 'Software Engineer'}${companiesStr}). It sequences ${goalPlan.skillRequirements.length} essential algorithmic topics, emphasizing high-yield interview invariants.`;

  // 2. Starting point rationale
  const startingPointRationale = gapAssessment.startingPointRationale;

  // 3. Schedule fit explanation
  const restDays = Object.entries(profile.weeklyAvailability || {})
    .filter(([_, hours]) => hours === 0)
    .map(([day]) => day.toUpperCase());

  const restDaysNote = restDays.length > 0 ? ` Designated rest days (${restDays.join(', ')}) are strictly preserved.` : '';
  const feasibilityWarning = !feasibility.isRealistic
    ? ` Notice: Compressed schedule with an estimated deficit of ${feasibility.deficitHours || 0} hours; infeasible deadline without timeline extension to ${feasibility.feasibleAlternativeWeeks || profile.timelineWeeks} weeks.`
    : '';
  const scheduleFitExplanation =
    `Calibrated across ${profile.timelineWeeks} weeks at ${feasibility.weeklyHours} hours/week (${feasibility.totalAvailableHours} total hours).${restDaysNote} ${feasibility.pacingSummary}.${feasibilityWarning}`;

  // 4. Assumptions
  const assumptions = [
    ...goalPlan.assumptions,
    `Weekly availability reflects realistic study capacity.`,
    `Completed task history from previous roadmaps is preserved intact without assumption.`,
  ];

  return {
    goalAlignmentSummary,
    startingPointRationale,
    scheduleFitExplanation,
    assumptions,
    contentGaps: contentGapTopics,
    startingPointReason: startingPointRationale,
    primaryGoalRationale: goalAlignmentSummary,
    timeFitExplanation: scheduleFitExplanation,
  };
}

export const validatePersonalizedPlan = validateRoadmapPlan;

