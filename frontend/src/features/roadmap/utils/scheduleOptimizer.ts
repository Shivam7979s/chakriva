/**
 * CHAKRIVA Deterministic Schedule Optimizer
 * =========================================
 * Allocates concept learning, practice problems, and spaced retrieval sessions
 * across daily and weekly availability vectors, strictly enforcing zero-hour
 * rest days, preventing overloading, and providing honest feasibility alternatives.
 *
 * Implements Phase H of CHAKRIVA Personalized Roadmap Engine.
 */

import type {
  AdaptiveDay,
  AdaptiveTask,
  AdaptiveWeek,
  DayOfWeek,
  FeasibilityAssessment,
  RoadmapWizardDraft,
} from '../types/adaptive';
import type { PlannedCurriculum } from './curriculumPlanner';
import type { TopicGapAnalysis } from './skillGapEngine';
import { selectBestProblemForTopic } from './problemSelector.ts';
import { getSubjectMeta, getSubjectProficiencyMultiplier } from './subjectCatalog.ts';

const DAY_KEYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export interface OptimizedScheduleResult {
  weeks: AdaptiveWeek[];
  totalTasks: number;
  scheduledPracticeCount: number;
  scheduledConceptCount: number;
  scheduledRevisionCount: number;
  contentGapCount: number;
  feasibility: FeasibilityAssessment;
}

/**
 * Calculates honest feasibility and alternative timeline
 */
export function calculateHonestFeasibility(
  draft: RoadmapWizardDraft,
  curriculum: PlannedCurriculum
): FeasibilityAssessment {
  const weeklyHours =
    (draft.weeklyAvailability.mon || 0) +
    (draft.weeklyAvailability.tue || 0) +
    (draft.weeklyAvailability.wed || 0) +
    (draft.weeklyAvailability.thu || 0) +
    (draft.weeklyAvailability.fri || 0) +
    (draft.weeklyAvailability.sat || 0) +
    (draft.weeklyAvailability.sun || 0);

  const totalWeeks = Math.max(1, draft.timelineWeeks);
  const totalAvailableHours = weeklyHours * totalWeeks;

  // Base estimate: ~5.5 hours per curriculum topic (concepts + problems + spaced revision)
  let baseHours = curriculum.orderedTopics.length * 5.5;

  // Additional study hours when non-DSA subjects are selected
  const extraSubjects = (draft.selectedSubjects || []).filter((s) => s !== 'dsa');
  for (const subjId of extraSubjects) {
    const meta = getSubjectMeta(subjId);
    if (meta) {
      const profMultiplier = getSubjectProficiencyMultiplier(draft.subjectProficiencies?.[subjId]);
      baseHours += meta.estimatedAdditionalHours * profMultiplier;
    }
  }

  // Skill adjustments
  if (draft.skillLevel === 'beginner') baseHours *= 1.25;
  if (draft.skillLevel === 'advanced') baseHours *= 0.75;

  // Pacing adjustments
  if (draft.pacing === 'intensive') baseHours *= 1.15;
  if (draft.pacing === 'flexible') baseHours *= 0.85;

  const estimatedRequiredHours = Math.round(baseHours);
  const isRealistic = totalAvailableHours >= estimatedRequiredHours * 0.75;
  const feasibleAlternativeWeeks = Math.ceil(estimatedRequiredHours / Math.max(1, weeklyHours));

  let pacingSummary = 'Balanced progression with structured rest intervals.';
  if (draft.pacing === 'intensive') {
    pacingSummary = 'High-velocity sprint with dense practice blocks and minimal buffer.';
  } else if (draft.pacing === 'flexible') {
    pacingSummary = 'Gentle cadence with generous review days and flexible deadlines.';
  }

  let recommendation =
    'Your schedule is realistic and provides sufficient runway to master the target algorithmic invariants.';

  if (!isRealistic) {
    recommendation =
      `Targeting ${draft.goal.replace(/_/g, ' ')} across ${curriculum.orderedTopics.length} topics requires ~${estimatedRequiredHours} hours. At ${weeklyHours} hrs/week, your ${totalWeeks}-week timeline yields ${totalAvailableHours} hrs. We recommend extending your timeline to ${feasibleAlternativeWeeks} weeks or prioritizing essential core topics.`;
  }

  return {
    isRealistic,
    totalAvailableHours,
    estimatedRequiredHours,
    weeklyHours,
    pacingSummary,
    recommendation,
    feasibleAlternativeWeeks: !isRealistic ? feasibleAlternativeWeeks : undefined,
    deficitHours: Math.max(0, estimatedRequiredHours - totalAvailableHours),
  };
}

/**
 * Optimizes schedule over Mon-Sun availability vectors
 */
export function optimizeSchedule(
  draft: RoadmapWizardDraft,
  curriculum: PlannedCurriculum,
  topicGapMap: Map<string, TopicGapAnalysis>,
  startDateStr?: string
): OptimizedScheduleResult {
  const feasibility = calculateHonestFeasibility(draft, curriculum);
  const now = startDateStr ? new Date(startDateStr) : new Date();

  const totalWeeks = Math.max(1, draft.timelineWeeks);
  const weeks: AdaptiveWeek[] = [];
  const assignedProblemIds = new Set<string>();

  let taskCounter = 1;
  let scheduledPractice = 0;
  let scheduledConcepts = 0;
  let scheduledRevisions = 0;
  let contentGaps = 0;

  let topicIndex = 0;
  const topicList = curriculum.orderedTopics;

  // Prepare non-DSA subject study modules queue (if user selected Core CS / System Design / SQL / Aptitude)
  const extraSubjects = (draft.selectedSubjects || []).filter((s) => s !== 'dsa');
  const nonDsaModules = extraSubjects.flatMap((subjId) => {
    const meta = getSubjectMeta(subjId);
    if (!meta) return [];
    const skipHeavy = draft.subjectProficiencies?.[subjId] === 'advanced';
    const mods = skipHeavy ? meta.modules.slice(0, 1) : meta.modules;
    return mods.map((m) => ({ ...m, subject: subjId }));
  });
  let nonDsaCursor = 0;

  for (let w = 0; w < totalWeeks; w++) {
    const weekNum = w + 1;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + w * 7);

    // Determine current stage for this week
    const currentStage =
      curriculum.stages.find((s) => s.weeks.includes(weekNum)) ||
      curriculum.stages[Math.min(curriculum.stages.length - 1, Math.floor((w / totalWeeks) * curriculum.stages.length))];

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const days: AdaptiveDay[] = [];

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dateStr = dayDate.toISOString().split('T')[0];
      const dayKey = DAY_KEYS[d];
      const availableHours = draft.weeklyAvailability[dayKey] || 0;
      const isRestDay = availableHours === 0;

      const dayTasks: AdaptiveTask[] = [];

      // CRITICAL INVARIANT: Zero tasks on rest days!
      if (!isRestDay) {
        const capacityMinutes = availableHours * 60;
        let usedMinutes = 0;

        // Determine current topic: prioritize current stage topics, else rotate through curriculum
        const stageTopics = currentStage.topics;
        let targetTopic = stageTopics[d % stageTopics.length];

        if (topicIndex < topicList.length) {
          targetTopic = topicList[topicIndex % topicList.length];
        }

        // 1. Concept review (if capacity allows and learningStyle is not practice_first only)
        const isPracticeOnly = draft.learningStyle === 'practice_first';
        const conceptMinutes = isPracticeOnly ? 0 : 15;

        if (!isPracticeOnly && usedMinutes + conceptMinutes <= capacityMinutes) {
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: `Concept: ${targetTopic} Invariants & Proof`,
            taskType: 'concept',
            estimatedMinutes: conceptMinutes,
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: targetTopic,
            description: `Core theoretical invariants, complexity bounds, and proof structure for ${targetTopic}.`,
          });
          usedMinutes += conceptMinutes;
          scheduledConcepts++;
        }

        // 2. Select best practice problem for this topic
        const selectionResult = selectBestProblemForTopic(targetTopic, draft, topicGapMap, assignedProblemIds);

        if ('isContentGap' in selectionResult && selectionResult.isContentGap) {
          // Content gap: preserve educational topic via theoretical study
          contentGaps++;
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: selectionResult.recommendedConceptTitle,
            taskType: 'concept',
            estimatedMinutes: Math.min(45, capacityMinutes - usedMinutes),
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: targetTopic,
            description: selectionResult.reason,
          });
          usedMinutes += Math.min(45, capacityMinutes - usedMinutes);
        } else if ('problem' in selectionResult) {
          const item = selectionResult;
          const prob = item.problem;

          if (usedMinutes + prob.estimatedMinutes <= capacityMinutes * 1.15) {
            dayTasks.push({
              id: `task-${taskCounter++}`,
              title: `Practice: ${prob.title}`,
              taskType: 'problem',
              estimatedMinutes: prob.estimatedMinutes,
              scheduledDate: dateStr,
              status: 'upcoming',
              topic: prob.topic,
              verniqProblemId: prob.verniqProblemId,
              problemSlug: prob.slug,
              problemTitle: prob.title,
              problemDifficulty: prob.difficulty,
              problemAcceptanceRate: prob.acceptanceRate,
              keyInvariant: prob.keyInvariant,
              description: item.statusNote
                ? `${item.statusNote} Study invariant: ${prob.keyInvariant}`
                : `Solve ${prob.title} and submit to the CHAKRIVA execution judge.`,
            });
            assignedProblemIds.add(prob.verniqProblemId);
            usedMinutes += prob.estimatedMinutes;
            scheduledPractice++;
            topicIndex++;
          }
        }

        // 3. Non-DSA subject study module (if selected & capacity allows)
        if (
          nonDsaModules.length > 0 &&
          nonDsaCursor < nonDsaModules.length &&
          capacityMinutes - usedMinutes >= 25
        ) {
          const mod = nonDsaModules[nonDsaCursor];
          const modDuration = Math.min(mod.estimatedMinutes, Math.max(20, capacityMinutes - usedMinutes));
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: mod.title,
            taskType: 'concept',
            estimatedMinutes: modDuration,
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: mod.topic,
            subject: mod.subject,
            description: `${mod.summary} (Concept study module — non-judge track)`,
          });
          usedMinutes += modDuration;
          scheduledConcepts++;
          nonDsaCursor++;
        }

        // 4. Spaced revision if remaining capacity allows
        if (capacityMinutes - usedMinutes >= 20 && assignedProblemIds.size > 1) {
          dayTasks.push({
            id: `task-${taskCounter++}`,
            title: `Spaced Retrieval: Review ${targetTopic} Invariants`,
            taskType: 'revision',
            estimatedMinutes: 20,
            scheduledDate: dateStr,
            status: 'upcoming',
            topic: targetTopic,
            description: 'Ebbinghaus spaced retrieval of previously solved patterns to cement algorithmic invariants.',
          });
          usedMinutes += 20;
          scheduledRevisions++;
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

    weeks.push({
      weekNumber: weekNum,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      title: `Week ${weekNum}: ${currentStage.title}`,
      objective: currentStage.description,
      stageName: currentStage.title,
      days,
    });
  }

  const allTasks = weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));

  return {
    weeks,
    totalTasks: allTasks.length,
    scheduledPracticeCount: scheduledPractice,
    scheduledConceptCount: scheduledConcepts,
    scheduledRevisionCount: scheduledRevisions,
    contentGapCount: contentGaps,
    feasibility,
  };
}
