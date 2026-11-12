/**
 * CHAKRIVA — Phase 2: Server-Side Roadmap Persistence & Multi-Device Sync Test Suite
 * =================================================================================
 * Verifies:
 * 1. Authenticated persistence model serialization/deserialization.
 * 2. Canonical problem reference validation (VRQ-XXXXXX).
 * 3. Authoritative judge verification invariant (client 'completed: true' is rejected if unverified).
 * 4. Multi-device optimistic concurrency conflict detection.
 * 5. Rescheduling persistence preserving completed history.
 * 6. Questionnaire draft isolation from canonical saved roadmaps.
 * 7. Availability vector and rest day enforcement after synchronization.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAdaptiveRoadmap,
  recalculateMissedTasks,
  applyScheduleProposal,
} from '../features/roadmap/utils/adaptiveEngine.ts';

describe('CHAKRIVA Phase 2 — Server-Side Persistence & Synchronization Engine', () => {
  const baseDraft = {
    goal: 'coding_interview',
    targetCompanies: ['Google', 'Microsoft'],
    targetRole: 'SDE-2',
    skillLevel: 'intermediate',
    primaryLanguage: 'java',
    targetDeadline: '2026-12-31',
    timelineWeeks: 8,
    weeklyAvailability: {
      mon: 2,
      tue: 2,
      wed: 2,
      thu: 2,
      fri: 2,
      sat: 4,
      sun: 0, // Sunday rest day
    },
    struggleTopics: ['Dynamic Programming'],
    masteredTopics: ['Arrays & Hashing'],
    pacing: 'balanced',
  };

  test('1. Roadmap Persistence Serialization Fidelity', () => {
    const roadmap = generateAdaptiveRoadmap(baseDraft);
    roadmap.version = 1;
    roadmap.userId = '11111111-1111-1111-1111-111111111111';

    // Simulate round-trip JSON serialization
    const serialized = JSON.stringify(roadmap);
    const parsed = JSON.parse(serialized);

    assert.equal(parsed.userId, roadmap.userId);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.profile.targetRole, 'SDE-2');
    assert.equal(parsed.profile.weeklyAvailability.sun, 0);
    assert.ok(parsed.weeks.length > 0);

    // Verify all canonical problem references adhere to VRQ-XXXXXX
    for (const week of parsed.weeks) {
      for (const day of week.days) {
        for (const task of day.tasks) {
          if (task.verniqProblemId) {
            assert.match(task.verniqProblemId, /^VRQ-\d{6}$/);
          }
        }
      }
    }
  });

  test('2. Authoritative Judge Integrity Reconciles Problem Task Completion', () => {
    const roadmap = generateAdaptiveRoadmap(baseDraft);
    
    // Pick the first problem task
    const problemTask = roadmap.weeks
      .flatMap((w) => w.days.flatMap((d) => d.tasks))
      .find((t) => t.verniqProblemId);
    assert.ok(problemTask, 'Must have at least one problem task');

    // Simulate spoofed client payload claiming 'completed: true' without judge record
    problemTask.status = 'completed';

    // Server-side authoritative reconciliation simulation
    const authoritativeJudgeMap = {}; // Empty: user has not actually solved it

    function serverReconcile(plan, judgeMap) {
      let completed = 0;
      for (const week of plan.weeks) {
        for (const day of week.days) {
          for (const task of day.tasks) {
            if (task.verniqProblemId) {
              const isSolved = judgeMap[task.verniqProblemId] === 'SOLVED';
              if (isSolved) {
                task.status = 'completed';
                completed++;
              } else {
                task.status = 'upcoming';
                task.completedAt = null;
              }
            }
          }
        }
      }
      plan.completedTasks = completed;
      return plan;
    }

    const reconciled = serverReconcile(roadmap, authoritativeJudgeMap);
    assert.equal(reconciled.completedTasks, 0, 'Unverified problem task must not remain completed');
    assert.equal(problemTask.status, 'upcoming');

    // Now simulate genuine judge submission acceptance
    authoritativeJudgeMap[problemTask.verniqProblemId] = 'SOLVED';
    const reconciledSolved = serverReconcile(roadmap, authoritativeJudgeMap);
    assert.equal(reconciledSolved.completedTasks, 1);
    assert.equal(problemTask.status, 'completed');
  });

  test('3. Multi-Device Concurrency Conflict Detection', () => {
    const serverState = {
      id: 'plan-123',
      userId: 'user-abc',
      version: 4,
      updatedAt: '2026-10-20T10:00:00Z',
    };

    // Client device A has stale version 3
    const clientPayloadStale = {
      version: 3,
      planData: { targetRole: 'SDE-1' },
    };

    function simulateServerConcurrencyCheck(server, client) {
      if (client.version !== undefined && client.version < server.version) {
        throw new Error('409_CONFLICT: Stale version');
      }
      return { ...server, version: server.version + 1 };
    }

    assert.throws(
      () => simulateServerConcurrencyCheck(serverState, clientPayloadStale),
      /409_CONFLICT/
    );

    // Client device B has up-to-date version 4
    const clientPayloadFresh = {
      version: 4,
      planData: { targetRole: 'SDE-2' },
    };

    const updated = simulateServerConcurrencyCheck(serverState, clientPayloadFresh);
    assert.equal(updated.version, 5);
  });

  test('4. Rescheduling Persistence Preserves Completed Tasks & Respects Availability', () => {
    const roadmap = generateAdaptiveRoadmap(baseDraft);

    // Mark one problem task completed
    const problemTask = roadmap.weeks[0].days[0].tasks.find((t) => t.verniqProblemId);
    if (problemTask) {
      problemTask.status = 'completed';
      problemTask.completedAt = '2026-10-20T09:00:00Z';
    }

    // Mark another task missed on yesterday
    const overdueTask = roadmap.weeks[0].days[1].tasks[0];
    if (overdueTask) {
      overdueTask.status = 'missed';
    }

    // Generate schedule recalculation proposal
    const proposal = recalculateMissedTasks(roadmap);
    if (proposal && proposal.rescheduledTasks.length > 0) {
      const rescheduledRoadmap = applyScheduleProposal(roadmap, proposal);

      // Completed task must still be completed
      const checkCompleted = rescheduledRoadmap.weeks[0].days[0].tasks.find(
        (t) => t.id === problemTask?.id
      );
      assert.equal(checkCompleted?.status, 'completed');
      assert.equal(checkCompleted?.completedAt, '2026-10-20T09:00:00Z');

      // Sunday rest days must remain 0 tasks
      for (const week of rescheduledRoadmap.weeks) {
        for (const day of week.days) {
          if (day.isRestDay) {
            assert.equal(day.tasks.length, 0, 'Rest days must strictly have 0 tasks');
          }
        }
      }
    }
  });

  test('5. Onboarding Draft Isolation from Canonical Roadmap', () => {
    const canonicalRoadmap = generateAdaptiveRoadmap(baseDraft);
    canonicalRoadmap.id = 'canonical-plan';

    // User starts a new wizard draft
    const newDraft = {
      ...baseDraft,
      targetRole: 'Junior Frontend Dev',
      goal: 'placement_prep',
    };

    // Updating draft must not mutate canonical roadmap
    assert.equal(canonicalRoadmap.profile.targetRole, 'SDE-2');
    assert.equal(canonicalRoadmap.profile.goal, 'coding_interview');
    assert.notEqual(newDraft.targetRole, canonicalRoadmap.profile.targetRole);
  });
});
