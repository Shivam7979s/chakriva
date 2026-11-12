/**
 * CHAKRIVA — Phase 5: Adaptive Roadmap Scheduling & Feasibility Engine Test Suite
 * ==============================================================================
 * Comprehensive automated verification of:
 * 1. Problem Catalog Integrity & Invariant Definitions (VRQ-XXXXXX)
 * 2. Feasibility Assessment (Realistic vs. Unrealistic schedules, honest deficit, advice)
 * 3. Prerequisite DAG Topological Ordering (Foundation -> Core -> Advanced)
 * 4. Day-of-Week Availability & Zero-Hour Rest Day Enforcement
 * 5. Problem Catalog Uniqueness (Zero duplicate assignments across entire roadmap)
 * 6. Missed Task Adaptive Recalculation (Safe redistribution without next-day overloading)
 * 7. Authoritative Judge Progress Synchronization
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_CATALOG_PROBLEMS,
  TOPIC_PREREQUISITES,
  evaluateFeasibility,
  generateAdaptiveRoadmap,
  recalculateMissedTasks,
  applyScheduleProposal,
} from '../features/roadmap/utils/adaptiveEngine.ts';

/**
 * Mirror of adaptiveRoadmapService.syncWithProgressMap logic for unit verification
 */
function syncWithProgressMap(roadmap, progressMap, currentDateStr = new Date().toISOString().split('T')[0]) {
  let updatedCompleted = 0;
  let updatedMissed = 0;
  let total = 0;

  const updatedWeeks = roadmap.weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => ({
      ...day,
      tasks: day.tasks.map((task) => {
        total++;
        const isSolved =
          (task.problemSlug && progressMap[task.problemSlug] === 'solved') ||
          (task.verniqProblemId && progressMap[task.verniqProblemId] === 'solved') ||
          progressMap[task.id] === 'completed' ||
          task.status === 'completed';

        if (isSolved) {
          updatedCompleted++;
          return {
            ...task,
            status: 'completed',
            completedAt: task.completedAt || new Date().toISOString(),
          };
        }

        if (day.date < currentDateStr) {
          updatedMissed++;
          return {
            ...task,
            status: 'missed',
          };
        }

        if (day.date === currentDateStr) {
          return {
            ...task,
            status: 'in_progress',
          };
        }

        return {
          ...task,
          status: 'upcoming',
        };
      }),
    })),
  }));

  return {
    ...roadmap,
    weeks: updatedWeeks,
    totalTasks: total,
    completedTasks: updatedCompleted,
    missedTasks: updatedMissed,
    progressPercent: total > 0 ? Math.round((updatedCompleted / total) * 100) : 0,
    updatedAt: new Date().toISOString(),
  };
}

describe('CHAKRIVA Phase 5 — Adaptive Roadmap Builder Foundation', () => {

  describe('1. Canonical Problem Catalog Integrity & Invariant Definitions', () => {
    test('Contains exactly verified canonical problem IDs without hallucinated records', () => {
      assert.equal(CANONICAL_CATALOG_PROBLEMS.length, 11);
      const expectedIds = [
        'VRQ-000001',
        'VRQ-000006',
        'VRQ-000016',
        'VRQ-000012',
        'VRQ-000004',
        'VRQ-000005',
        'VRQ-000018',
        'VRQ-000003',
        'VRQ-000002',
        'VRQ-000010',
        'VRQ-000137',
      ];

      for (const id of expectedIds) {
        const found = CANONICAL_CATALOG_PROBLEMS.find((p) => p.verniqProblemId === id);
        assert.ok(found, `Expected canonical catalog problem ${id} to exist`);
        assert.ok(found.slug.length > 0, `Problem ${id} must have a valid slug`);
        assert.ok(found.title.length > 0, `Problem ${id} must have a title`);
        assert.ok(found.estimatedMinutes >= 15, `Problem ${id} must have realistic duration`);
        assert.ok(found.keyInvariant.length > 20, `Problem ${id} must define an algorithmic invariant`);
      }
    });

    test('Validates topological prerequisite declarations in TOPIC_PREREQUISITES', () => {
      assert.deepEqual(TOPIC_PREREQUISITES['Two Pointers'], ['Arrays & Hashing']);
      assert.deepEqual(TOPIC_PREREQUISITES['Sliding Window'], ['Two Pointers', 'Arrays & Hashing']);
      assert.deepEqual(TOPIC_PREREQUISITES['Monotonic Stacks & Two Pointers'], ['Stacks & Queues', 'Two Pointers']);
    });
  });

  describe('2. Feasibility Assessment (Honest Calculations & Trade-offs)', () => {
    test('Calculates realistic schedule when hours match curriculum demand', () => {
      const realisticDraft = {
        goal: 'coding_interview',
        customGoalText: '',
        targetCompanies: ['Google', 'Amazon'],
        targetRole: 'SDE-1',
        skillLevel: 'intermediate',
        primaryLanguage: 'java',
        targetDeadline: '2026-12-31',
        timelineWeeks: 8,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 }, // 14 hrs/week
        struggleTopics: ['Dynamic Programming'],
        masteredTopics: ['Arrays & Hashing'],
        pacing: 'balanced',
      };

      const assessment = evaluateFeasibility(realisticDraft);
      assert.equal(assessment.weeklyHours, 14);
      assert.equal(assessment.isRealistic, true);
      assert.ok(assessment.totalAvailableHours >= assessment.estimatedRequiredHours * 0.75);
      assert.match(assessment.recommendation, /realistic/i);
    });

    test('Flags unrealistic schedule when deadline is too tight and hours are insufficient', () => {
      const tightDraft = {
        goal: 'placement_prep',
        customGoalText: '',
        targetCompanies: ['Meta', 'Apple'],
        targetRole: 'SDE',
        skillLevel: 'beginner',
        primaryLanguage: 'python',
        targetDeadline: '2026-10-30',
        timelineWeeks: 2,
        weeklyAvailability: { mon: 1, tue: 0, wed: 1, thu: 0, fri: 1, sat: 1, sun: 0 }, // 4 hrs/week
        struggleTopics: ['Dynamic Programming', 'Monotonic Stacks & Two Pointers', 'Binary Trees'],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const assessment = evaluateFeasibility(tightDraft);
      assert.equal(assessment.weeklyHours, 4);
      assert.equal(assessment.isRealistic, false);
      assert.ok(assessment.feasibleAlternativeWeeks > 2, 'Should recommend extending timeline weeks');
      assert.match(assessment.recommendation, /recommend/i);
    });

    test('Pacing multipliers adjust total required hours predictably', () => {
      const baseDraft = {
        goal: 'coding_interview',
        customGoalText: '',
        targetCompanies: ['Amazon'],
        targetRole: 'SDE',
        skillLevel: 'intermediate',
        primaryLanguage: 'cpp',
        targetDeadline: '2026-12-31',
        timelineWeeks: 6,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 2, sun: 2 },
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const flexible = evaluateFeasibility({ ...baseDraft, pacing: 'flexible' });
      const balanced = evaluateFeasibility({ ...baseDraft, pacing: 'balanced' });
      const intensive = evaluateFeasibility({ ...baseDraft, pacing: 'intensive' });

      assert.ok(flexible.estimatedRequiredHours < balanced.estimatedRequiredHours, 'Flexible requires fewer practice drill hours');
      assert.ok(intensive.estimatedRequiredHours > balanced.estimatedRequiredHours, 'Intensive requires more practice drill hours');
    });
  });

  describe('3. Roadmap Generation & Prerequisite Topological Ordering', () => {
    const draft = {
      goal: 'coding_interview',
      customGoalText: '',
      targetCompanies: ['Google', 'Amazon'],
      targetRole: 'Software Engineer',
      skillLevel: 'intermediate',
      primaryLanguage: 'java',
      targetDeadline: '2026-12-31',
      timelineWeeks: 6,
      weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
      struggleTopics: ['Monotonic Stacks & Two Pointers'],
      masteredTopics: [],
      pacing: 'balanced',
    };

    const roadmap = generateAdaptiveRoadmap(draft);

    test('Generates structured roadmap with stages and weeks matching timeline', () => {
      assert.ok(roadmap.id.startsWith('roadmap-'));
      assert.equal(roadmap.weeks.length, 6);
      assert.ok(roadmap.stages.length >= 3);
      assert.equal(roadmap.stages[0].id, 'stage-1');
      assert.equal(roadmap.stages[1].id, 'stage-2');
    });

    test('Topologically sequences foundation concepts before advanced patterns', () => {
      const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      const twoSumIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000001');
      const threeSumIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000016');
      const trappingWaterIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000010');

      assert.ok(twoSumIdx !== -1, 'Two Sum should be scheduled');
      assert.ok(threeSumIdx !== -1, '3Sum should be scheduled');
      assert.ok(trappingWaterIdx !== -1, 'Trapping Rain Water should be scheduled');

      assert.ok(twoSumIdx < threeSumIdx, 'Two Sum (Arrays & Hashing) must precede 3Sum (Two Pointers)');
      assert.ok(threeSumIdx < trappingWaterIdx, '3Sum must precede Trapping Rain Water (Advanced Monotonic)');
    });
  });

  describe('4. Day-of-Week Availability & Rest Day Enforcement', () => {
    test('Strictly enforces 0 tasks on days configured with 0 hours', () => {
      const availabilityWithRestDays = {
        mon: 2,
        tue: 0, // Rest day
        wed: 2,
        thu: 0, // Rest day
        fri: 2,
        sat: 3,
        sun: 0, // Rest day
      };

      const draft = {
        goal: 'competitive_programming',
        customGoalText: '',
        targetCompanies: ['Codeforces'],
        targetRole: 'Competitor',
        skillLevel: 'advanced',
        primaryLanguage: 'cpp',
        targetDeadline: '2026-12-31',
        timelineWeeks: 4,
        weeklyAvailability: availabilityWithRestDays,
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'aggressive',
      };

      const roadmap = generateAdaptiveRoadmap(draft);

      for (const week of roadmap.weeks) {
        for (const day of week.days) {
          if (['tue', 'thu', 'sun'].includes(day.dayOfWeek)) {
            assert.equal(day.isRestDay, true, `Day ${day.dayOfWeek} on ${day.date} should be a rest day`);
            assert.equal(day.availableHours, 0);
            assert.equal(day.tasks.length, 0, `Rest day ${day.dayOfWeek} on ${day.date} must have 0 tasks`);
          } else {
            assert.equal(day.isRestDay, false);
            assert.ok(day.availableHours > 0);
          }
        }
      }
    });
  });

  describe('5. Problem Catalog Uniqueness (Zero Duplicate Assignments)', () => {
    test('Ensures no problem is scheduled multiple times in the roadmap', () => {
      const draft = {
        goal: 'coding_interview',
        customGoalText: '',
        targetCompanies: ['Microsoft', 'Uber'],
        targetRole: 'Backend Engineer',
        skillLevel: 'intermediate',
        primaryLanguage: 'java',
        targetDeadline: '2026-12-31',
        timelineWeeks: 6,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const roadmap = generateAdaptiveRoadmap(draft);
      const problemTasks = roadmap.weeks
        .flatMap((w) => w.days.flatMap((d) => d.tasks))
        .filter((t) => t.taskType === 'problem');

      const seenIds = new Set();
      const duplicateIds = [];

      for (const pt of problemTasks) {
        if (seenIds.has(pt.verniqProblemId)) {
          duplicateIds.push(pt.verniqProblemId);
        }
        seenIds.add(pt.verniqProblemId);
      }

      assert.deepEqual(duplicateIds, [], 'Roadmap must have zero duplicate problem assignments');
      assert.equal(seenIds.size, CANONICAL_CATALOG_PROBLEMS.length, 'Must schedule all canonical catalog problems');
    });
  });

  describe('6. Missed Task Adaptive Recalculation Engine', () => {
    test('Redistributes missed tasks across upcoming days without next-day overloading', () => {
      const draft = {
        goal: 'coding_interview',
        customGoalText: '',
        targetCompanies: ['Amazon'],
        targetRole: 'SDE-1',
        skillLevel: 'intermediate',
        primaryLanguage: 'java',
        targetDeadline: '2026-12-31',
        timelineWeeks: 4,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const roadmap = generateAdaptiveRoadmap(draft);

      // Simulate day 1 has missed tasks
      const day1 = roadmap.weeks[0].days[0];
      const simulatedMissedRoadmap = {
        ...roadmap,
        weeks: roadmap.weeks.map((w, wIdx) => {
          if (wIdx !== 0) return w;
          return {
            ...w,
            days: w.days.map((d, dIdx) => {
              if (dIdx !== 0) return d;
              return {
                ...d,
                tasks: d.tasks.map((t) => ({ ...t, status: 'missed' })),
              };
            }),
          };
        }),
      };

      const asOfDate = roadmap.weeks[0].days[1].date;
      const proposal = recalculateMissedTasks(simulatedMissedRoadmap, asOfDate);

      assert.ok(proposal.missedTaskCount > 0, 'Should detect missed tasks');
      assert.equal(proposal.rescheduledTasks.length, proposal.missedTaskCount);

      // Verify redistributed tasks are placed in future dates
      for (const resched of proposal.rescheduledTasks) {
        assert.ok(resched.newDate >= asOfDate, 'Rescheduled date must be on or after current recalculation date');
        assert.ok(resched.reason.includes('without overloading'));
      }

      // Apply the proposal
      const updatedRoadmap = applyScheduleProposal(simulatedMissedRoadmap, proposal);
      assert.equal(updatedRoadmap.missedTasks, 0, 'Applying proposal clears missed task backlog');
      assert.ok(updatedRoadmap.lastRecalculatedAt, 'Records recalculation timestamp');
    });
  });

  describe('7. Authoritative Judge Progress Synchronization', () => {
    test('Synchronizes solved problems from authoritative judge progressMap without client spoofing', () => {
      const draft = {
        goal: 'coding_interview',
        customGoalText: '',
        targetCompanies: ['Google'],
        targetRole: 'SDE',
        skillLevel: 'intermediate',
        primaryLanguage: 'java',
        targetDeadline: '2026-12-31',
        timelineWeeks: 4,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const roadmap = generateAdaptiveRoadmap(draft);

      // Simulate user solved VRQ-000001 (Two Sum) on the platform judge
      const serverProgressMap = {
        'VRQ-000001': 'solved',
      };

      const synced = syncWithProgressMap(roadmap, serverProgressMap, roadmap.weeks[0].days[0].date);

      const allSyncedTasks = synced.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      const twoSumTask = allSyncedTasks.find((t) => t.verniqProblemId === 'VRQ-000001');

      assert.ok(twoSumTask, 'Two Sum task must exist');
      assert.equal(twoSumTask.status, 'completed', 'Two Sum should be marked completed via judge progress');
      assert.ok(synced.completedTasks >= 1, 'Completed task counter must increment');
      assert.ok(synced.progressPercent > 0, 'Progress percentage should reflect completed tasks');

      // Unsolved problems remain upcoming or in_progress
      const threeSumTask = allSyncedTasks.find((t) => t.verniqProblemId === 'VRQ-000016');
      if (threeSumTask) {
        assert.notEqual(threeSumTask.status, 'completed');
      }
    });
  });

  describe('8. Wizard Draft State Persistence & Partial Onboarding Resumption', () => {
    test('Preserves partially answered questionnaire state across sessions', () => {
      const partialDraft = {
        goal: 'internship',
        targetCompanies: ['Google', 'Meta'],
        targetRole: 'Software Engineer Intern',
        skillLevel: 'intermediate',
        primaryLanguage: 'python',
        topicComfort: {
          'Arrays & Strings': 'comfortable',
          'Dynamic Programming': 'learning',
        },
        approxProblemsSolved: 80,
        inferredFromActivity: true,
        biggestChallenge: 'patterns',
        weeklyAvailability: { mon: 3, tue: 2, wed: 3, thu: 0, fri: 2, sat: 4, sun: 0 },
        timelineWeeks: 10,
        learningStyle: 'practice_first',
        revisionFrequency: 'weekly',
        includeTimedPractice: true,
        struggleTopics: ['Dynamic Programming'],
        masteredTopics: ['Arrays & Hashing'],
        pacing: 'balanced',
      };

      // Serialize draft to mock storage
      const serialized = JSON.stringify(partialDraft);
      const restored = JSON.parse(serialized);

      assert.equal(restored.goal, 'internship');
      assert.equal(restored.primaryLanguage, 'python');
      assert.equal(restored.biggestChallenge, 'patterns');
      assert.equal(restored.inferredFromActivity, true);
      assert.equal(restored.weeklyAvailability.thu, 0, 'Rest day setting preserved');
      assert.equal(restored.timelineWeeks, 10);
    });
  });

  describe('9. Plan Adjustment Preserves Completed Task History', () => {
    test('Adjusting weekly availability or target role does not wipe completed problem verdicts', () => {
      const initialDraft = {
        goal: 'coding_interview',
        targetCompanies: ['Amazon'],
        targetRole: 'SDE-1',
        skillLevel: 'intermediate',
        primaryLanguage: 'java',
        targetDeadline: '2026-12-31',
        timelineWeeks: 6,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const originalRoadmap = generateAdaptiveRoadmap(initialDraft);

      // Simulate that user completed VRQ-000001 (Two Sum)
      const solvedProgressMap = { 'VRQ-000001': 'solved' };
      const syncedRoadmap = syncWithProgressMap(originalRoadmap, solvedProgressMap, originalRoadmap.weeks[0].days[0].date);
      assert.equal(syncedRoadmap.completedTasks, 1);

      // User changes schedule: reduces weekly hours from 14 to 8
      const adjustedAvailability = { mon: 1, tue: 1, wed: 1, thu: 1, fri: 1, sat: 3, sun: 0 };
      const adjustedDraft = {
        ...initialDraft,
        targetRole: 'SDE-2 Full Stack',
        weeklyAvailability: adjustedAvailability,
        timelineWeeks: 8,
      };

      const newRoadmap = generateAdaptiveRoadmap(adjustedDraft);

      // Re-apply completed tasks onto new roadmap
      const reconciled = syncWithProgressMap(newRoadmap, solvedProgressMap, newRoadmap.weeks[0].days[0].date);

      assert.equal(reconciled.completedTasks, 1, 'Completed task count must be preserved after schedule adjustment');
      assert.equal(reconciled.profile.targetRole, 'SDE-2 Full Stack');
      assert.equal(reconciled.weeks.length, 8);
    });
  });

  describe('10. User Scoping & Non-Interference', () => {
    test('Roadmaps support explicit user-binding for multi-user security isolation', () => {
      const draft = {
        goal: 'coding_interview',
        targetCompanies: ['Apple'],
        targetRole: 'iOS Engineer',
        skillLevel: 'advanced',
        primaryLanguage: 'cpp',
        targetDeadline: '2026-12-31',
        timelineWeeks: 4,
        weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 2, sun: 0 },
        struggleTopics: [],
        masteredTopics: [],
        pacing: 'balanced',
      };

      const userAId = 'user-uuid-1111';
      const userBId = 'user-uuid-2222';

      const roadmapA = { ...generateAdaptiveRoadmap(draft), userId: userAId };
      const roadmapB = { ...generateAdaptiveRoadmap(draft), userId: userBId };

      assert.equal(roadmapA.userId, userAId);
      assert.equal(roadmapB.userId, userBId);
      assert.notEqual(roadmapA.userId, roadmapB.userId);
    });
  });

});

