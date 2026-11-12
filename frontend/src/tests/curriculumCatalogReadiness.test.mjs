/**
 * CHAKRIVA — Phase 3A: Curriculum & Canonical Catalog Readiness Test Suite
 * =======================================================================
 * Automated regression verification of:
 * 1. Problem Catalog Schema & Format Validity
 * 2. Route & Slug Integrity (Preventing Broken Links)
 * 3. Topic Prerequisite DAG Structure & Acyclicity
 * 4. Roadmap Task Classification & Unsupported Task Prevention
 * 5. Rest Day & Capacity Invariants
 */

import fs from 'node:fs';
import path from 'node:path';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_CATALOG_PROBLEMS,
  TOPIC_PREREQUISITES,
  generateAdaptiveRoadmap,
  reconcileLegacySavedRoadmap,
} from '../features/roadmap/utils/adaptiveEngine.ts';

describe('CHAKRIVA Phase 3A — Curriculum Catalog Readiness & Integrity', () => {

  describe('1. Canonical Problem Catalog Schema & Identifier Validation', () => {
    test('All catalog problems have valid, stable VRQ-XXXXXX identifiers', () => {
      const verniqIdRegex = /^VRQ-\d{6}$/;
      for (const p of CANONICAL_CATALOG_PROBLEMS) {
        assert.match(
          p.verniqProblemId,
          verniqIdRegex,
          `Problem "${p.title}" must have a valid identifier conforming to VRQ-XXXXXX (got: ${p.verniqProblemId})`
        );
      }
    });

    test('Catalog entries have valid, lowercase URL slugs without whitespace', () => {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      for (const p of CANONICAL_CATALOG_PROBLEMS) {
        assert.match(
          p.slug,
          slugRegex,
          `Problem "${p.title}" must have a valid URL slug (got: ${p.slug})`
        );
      }
    });

    test('Difficulty is strictly constrained to standard enum (easy, medium, hard)', () => {
      const allowedDifficulties = new Set(['easy', 'medium', 'hard']);
      for (const p of CANONICAL_CATALOG_PROBLEMS) {
        assert.ok(
          allowedDifficulties.has(p.difficulty),
          `Problem "${p.title}" has invalid difficulty: ${p.difficulty}`
        );
      }
    });

    test('No duplicate identifiers or slugs exist in the catalog registry', () => {
      const seenIds = new Set();
      const seenSlugs = new Set();

      for (const p of CANONICAL_CATALOG_PROBLEMS) {
        assert.ok(!seenIds.has(p.verniqProblemId), `Duplicate identifier found in catalog: ${p.verniqProblemId}`);
        assert.ok(!seenSlugs.has(p.slug), `Duplicate slug found in catalog: ${p.slug}`);
        seenIds.add(p.verniqProblemId);
        seenSlugs.add(p.slug);
      }
    });

    test('Every catalog problem provides an explicit key invariant and estimated time', () => {
      for (const p of CANONICAL_CATALOG_PROBLEMS) {
        assert.ok(p.keyInvariant && p.keyInvariant.trim().length > 15, `Problem "${p.title}" missing keyInvariant`);
        assert.ok(p.estimatedMinutes >= 15 && p.estimatedMinutes <= 90, `Problem "${p.title}" has invalid estimatedMinutes: ${p.estimatedMinutes}`);
      }
    });
  });

  describe('2. Topic Prerequisite DAG & Topological Structure', () => {
    test('Prerequisite graph has no cycles and forms a valid Directed Acyclic Graph', () => {
      const visited = new Set();
      const recStack = new Set();

      function hasCycle(node) {
        visited.add(node);
        recStack.add(node);

        for (const neighbor of TOPIC_PREREQUISITES[node] || []) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }

        recStack.delete(node);
        return false;
      }

      for (const topic of Object.keys(TOPIC_PREREQUISITES)) {
        if (!visited.has(topic)) {
          assert.equal(hasCycle(topic), false, `Circular prerequisite dependency detected at topic: ${topic}`);
        }
      }
    });

    test('All prerequisite references resolve to declared topics', () => {
      const allTopics = new Set(Object.keys(TOPIC_PREREQUISITES));
      for (const [topic, prereqs] of Object.entries(TOPIC_PREREQUISITES)) {
        for (const p of prereqs) {
          assert.ok(allTopics.has(p), `Topic "${topic}" references undeclared prerequisite: "${p}"`);
        }
      }
    });

    test('Every problem topic in the catalog is present in the prerequisite graph', () => {
      const allTopics = new Set(Object.keys(TOPIC_PREREQUISITES));
      for (const p of CANONICAL_CATALOG_PROBLEMS) {
        assert.ok(
          allTopics.has(p.topic),
          `Problem "${p.title}" has topic "${p.topic}" which is not defined in TOPIC_PREREQUISITES`
        );
      }
    });
  });

  describe('3. Roadmap Task Classification & Unsupported Task Prevention', () => {
    const draft = {
      goal: 'coding_interview',
      customGoalText: '',
      targetCompanies: ['Google', 'Meta'],
      targetRole: 'SDE-1',
      skillLevel: 'intermediate',
      primaryLanguage: 'java',
      targetDeadline: '2026-12-31',
      timelineWeeks: 8,
      weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
      struggleTopics: ['Binary Trees'],
      masteredTopics: ['Arrays & Hashing'],
      pacing: 'balanced',
    };

    const roadmap = generateAdaptiveRoadmap(draft);

    test('Generated roadmap consists strictly of valid supported task types', () => {
      const validTaskTypes = new Set(['problem', 'concept', 'revision']);
      const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));

      for (const task of allTasks) {
        assert.ok(
          validTaskTypes.has(task.taskType),
          `Task "${task.id}" (${task.title}) has unsupported taskType: ${task.taskType}`
        );
      }
    });

    test('Zero phantom assessment tasks are scheduled without backing assessment implementation', () => {
      const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      const assessmentTasks = allTasks.filter((t) => t.taskType === 'assessment');
      assert.equal(assessmentTasks.length, 0, 'No assessment tasks should be generated until assessments are implemented');
    });

    test('All practice tasks have non-empty problem slug and title matching catalog', () => {
      const catalogBySlug = new Map(CANONICAL_CATALOG_PROBLEMS.map((p) => [p.slug, p]));
      const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      const practiceTasks = allTasks.filter((t) => t.taskType === 'problem');

      assert.equal(practiceTasks.length, CANONICAL_CATALOG_PROBLEMS.length);

      for (const pt of practiceTasks) {
        assert.ok(pt.problemSlug, `Practice task "${pt.id}" missing problemSlug`);
        assert.ok(catalogBySlug.has(pt.problemSlug), `Practice task "${pt.id}" references uncataloged slug: ${pt.problemSlug}`);
        const catEntry = catalogBySlug.get(pt.problemSlug);
        assert.equal(pt.problemTitle, catEntry.title);
        assert.equal(pt.problemDifficulty, catEntry.difficulty);
      }
    });

    test('Curriculum task count reconciles exactly: 11 Practice + 11 Concept + 47 Revision = 69', () => {
      const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      const practiceCount = allTasks.filter((t) => t.taskType === 'problem').length;
      const conceptCount = allTasks.filter((t) => t.taskType === 'concept').length;
      const revisionCount = allTasks.filter((t) => t.taskType === 'revision').length;

      assert.equal(practiceCount, 11);
      assert.equal(conceptCount, 11);
      assert.equal(revisionCount, 47);
      assert.equal(allTasks.length, 69);
      assert.equal(roadmap.totalTasks, 69);
    });

    test('Zero tasks are scheduled on rest days (days with 0 available hours)', () => {
      for (const w of roadmap.weeks) {
        for (const d of w.days) {
          if (d.isRestDay || d.availableHours === 0) {
            assert.equal(
              d.tasks.length,
              0,
              `Rest day ${d.date} (${d.dayOfWeek}) must have 0 tasks scheduled, found: ${d.tasks.length}`
            );
          }
        }
      }
    });
  });

  describe('4. Phase 3A.1 Canonical Problem Remediations & Catalog Integrity', () => {
    test('3Sum correctly references canonical record VRQ-000016', () => {
      const threeSum = CANONICAL_CATALOG_PROBLEMS.find((p) => p.slug === '3sum');
      assert.ok(threeSum, '3Sum must exist in canonical catalog');
      assert.equal(threeSum.verniqProblemId, 'VRQ-000016', '3Sum must have canonical ID VRQ-000016');
      assert.equal(threeSum.title, '3Sum');
      assert.equal(threeSum.difficulty, 'medium');
      assert.equal(threeSum.topic, 'Two Pointers');
      // Assert it is NOT using the incorrect old ID
      assert.notEqual(threeSum.verniqProblemId, 'VRQ-000008');
    });

    test('Container With Most Water correctly references canonical record VRQ-000012', () => {
      const container = CANONICAL_CATALOG_PROBLEMS.find((p) => p.slug === 'container-with-most-water');
      assert.ok(container, 'Container With Most Water must exist in canonical catalog');
      assert.equal(container.verniqProblemId, 'VRQ-000012', 'Container With Most Water must have canonical ID VRQ-000012');
      assert.equal(container.title, 'Container With Most Water');
      assert.equal(container.difficulty, 'medium');
      assert.equal(container.topic, 'Two Pointers');
      // Assert it is NOT using the incorrect old ID
      assert.notEqual(container.verniqProblemId, 'VRQ-000011');
    });

    test('Search in Rotated Sorted Array correctly references canonical record VRQ-000018', () => {
      const rotated = CANONICAL_CATALOG_PROBLEMS.find((p) => p.slug === 'search-in-rotated-sorted-array');
      assert.ok(rotated, 'Search in Rotated Sorted Array must exist in canonical catalog');
      assert.equal(rotated.verniqProblemId, 'VRQ-000018', 'Search in Rotated Sorted Array must have canonical ID VRQ-000018');
      assert.equal(rotated.title, 'Search in Rotated Sorted Array');
      assert.equal(rotated.difficulty, 'medium');
      assert.equal(rotated.topic, 'Binary Search');
      // Assert it is NOT using the colliding old ID
      assert.notEqual(rotated.verniqProblemId, 'VRQ-000012');
    });

    test('Ineligible tree problem (Invert Binary Tree) is completely removed from production registry', () => {
      const invertTree = CANONICAL_CATALOG_PROBLEMS.find((p) => p.slug === 'invert-binary-tree');
      assert.equal(invertTree, undefined, 'Draft/testless Invert Binary Tree must not be present in CANONICAL_CATALOG_PROBLEMS');
    });

    test('Replacement tree problem (Maximum Depth of Binary Tree) is valid and configured', () => {
      const maxDepth = CANONICAL_CATALOG_PROBLEMS.find((p) => p.slug === 'maximum-depth-of-binary-tree');
      assert.ok(maxDepth, 'Maximum Depth of Binary Tree must be present in canonical catalog');
      assert.equal(maxDepth.verniqProblemId, 'VRQ-000137', 'Maximum Depth of Binary Tree must have canonical ID VRQ-000137');
      assert.equal(maxDepth.title, 'Maximum Depth of Binary Tree');
      assert.equal(maxDepth.difficulty, 'easy');
      assert.equal(maxDepth.topic, 'Binary Trees');
      assert.ok(maxDepth.keyInvariant && maxDepth.keyInvariant.includes('max_depth'), 'Must define valid recursion invariant');
      assert.ok(maxDepth.acceptanceRate > 70, 'Acceptance rate must be realistic');
    });

    test('No canonical problem ID is associated with a mismatched title or slug', () => {
      const idToSlug = new Map(CANONICAL_CATALOG_PROBLEMS.map((p) => [p.verniqProblemId, p.slug]));
      // VRQ-000008 in master dataset is Group Anagrams, NOT 3Sum
      assert.ok(!idToSlug.has('VRQ-000008') || idToSlug.get('VRQ-000008') === 'group-anagrams');
      // VRQ-000011 in master dataset is Roman to Integer, NOT Container
      assert.ok(!idToSlug.has('VRQ-000011') || idToSlug.get('VRQ-000011') === 'roman-to-integer');
      // VRQ-000012 is Container With Most Water, NOT Search in Rotated
      assert.equal(idToSlug.get('VRQ-000012'), 'container-with-most-water');
      // VRQ-000018 is Search in Rotated Sorted Array
      assert.equal(idToSlug.get('VRQ-000018'), 'search-in-rotated-sorted-array');
      // VRQ-000016 is 3Sum
      assert.equal(idToSlug.get('VRQ-000016'), '3sum');
      // VRQ-000137 is Maximum Depth of Binary Tree
      assert.equal(idToSlug.get('VRQ-000137'), 'maximum-depth-of-binary-tree');
    });
  });

  describe('5. Production Eligibility, Status & Validated Test Cases Verification', () => {
    test('Every scheduled problem is published, judge-ready, and test-suite backed', () => {
      const reportPath = path.resolve(process.cwd(), 'docs/data/import_reports/curriculum_catalog_readiness_audit.json');
      assert.ok(fs.existsSync(reportPath), 'Audit report JSON must exist');

      const auditData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      assert.equal(auditData.canonicalProblems.length, 11, 'Audit must evaluate all 11 canonical problems');

      for (const item of auditData.canonicalProblems) {
        assert.equal(item.stages.stage1_recordExists, true, `${item.slug}: Record must exist in database`);
        assert.equal(item.stages.stage2_contentReviewed, true, `${item.slug}: Must be published`);
        assert.equal(item.stages.stage3_judgeAvailable, true, `${item.slug}: Must be JUDGE_READY`);
        assert.equal(item.stages.stage4_testsValidated, true, `${item.slug}: Test cases must be validated (>=50 tests)`);
        assert.ok(item.testCaseCount >= 50, `${item.slug}: Must have at least 50 test cases, found: ${item.testCaseCount}`);
        assert.equal(item.stages.stage5_productionEligible, true, `${item.slug}: Must be 100% production scheduling eligible`);
        assert.deepEqual(item.issues, [], `${item.slug}: Must have zero audit issues`);
      }

      assert.equal(auditData.mismatches.length, 0, 'Audit must report 0 identifier mismatches');
    });
  });

  describe('6. Prerequisite Topological Ordering & Zero Duplication', () => {
    const draft = {
      goal: 'coding_interview',
      customGoalText: '',
      targetCompanies: ['Google', 'Meta'],
      targetRole: 'SDE-1',
      skillLevel: 'intermediate',
      primaryLanguage: 'java',
      targetDeadline: '2026-12-31',
      timelineWeeks: 8,
      weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 4, sun: 0 },
      struggleTopics: [],
      masteredTopics: [],
      pacing: 'balanced',
    };

    const roadmap = generateAdaptiveRoadmap(draft);

    test('Foundation topics strictly precede advanced patterns', () => {
      const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      const twoSumIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000001');
      const threeSumIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000016');
      const containerIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000012');
      const trappingIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000010');
      const treeIdx = allTasks.findIndex((t) => t.verniqProblemId === 'VRQ-000137');

      assert.ok(twoSumIdx !== -1, 'Two Sum must be scheduled');
      assert.ok(threeSumIdx !== -1, '3Sum must be scheduled');
      assert.ok(containerIdx !== -1, 'Container With Most Water must be scheduled');
      assert.ok(trappingIdx !== -1, 'Trapping Rain Water must be scheduled');
      assert.ok(treeIdx !== -1, 'Maximum Depth of Binary Tree must be scheduled');

      // Arrays & Hashing precedes Two Pointers
      assert.ok(twoSumIdx < threeSumIdx, 'Two Sum (Arrays & Hashing) must precede 3Sum (Two Pointers)');
      assert.ok(twoSumIdx < containerIdx, 'Two Sum must precede Container With Most Water');
      // Two Pointers & Stacks precede Advanced Monotonic Stacks
      assert.ok(threeSumIdx < trappingIdx, '3Sum must precede Trapping Rain Water');
      // Foundation precedes Tree topics
      assert.ok(twoSumIdx < treeIdx, 'Foundation arrays must precede Binary Trees');
    });

    test('Zero duplicate problem assignments across entire generated roadmap', () => {
      const problemTasks = roadmap.weeks
        .flatMap((w) => w.days.flatMap((d) => d.tasks))
        .filter((t) => t.taskType === 'problem');

      const seenIds = new Set();
      const seenSlugs = new Set();
      const duplicateIds = [];

      for (const pt of problemTasks) {
        if (seenIds.has(pt.verniqProblemId)) {
          duplicateIds.push(pt.verniqProblemId);
        }
        seenIds.add(pt.verniqProblemId);
        seenSlugs.add(pt.problemSlug);
      }

      assert.deepEqual(duplicateIds, [], 'Must have zero duplicate problem assignments');
      assert.equal(seenIds.size, 11, 'Must schedule exactly 11 distinct canonical problems');
      assert.equal(seenSlugs.size, 11, 'Must schedule exactly 11 distinct problem slugs');
    });
  });

  describe('7. Saved Plan Backward Compatibility & History Preservation', () => {
    test('Reconciles legacy problem IDs in saved plans while preserving completed verdicts and timestamps', () => {
      // Simulate historical saved roadmap created with legacy/mismatched IDs
      const legacySavedRoadmap = {
        id: 'roadmap-legacy-1234',
        userId: 'user-legacy-001',
        title: 'Legacy Roadmap',
        profile: {},
        stages: [],
        totalTasks: 5,
        completedTasks: 2,
        missedTasks: 0,
        progressPercent: 40,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        weeks: [
          {
            weekNumber: 1,
            stageId: 'stage-1',
            stageName: 'Stage 1',
            theme: 'Foundations',
            days: [
              {
                date: '2026-09-01',
                dayOfWeek: 'mon',
                availableHours: 2,
                isRestDay: false,
                tasks: [
                  // Completed task with legacy 3Sum ID (VRQ-000008)
                  {
                    id: 'task-1',
                    type: 'problem',
                    taskType: 'problem',
                    title: 'Practice: 3Sum',
                    problemSlug: '3sum',
                    verniqProblemId: 'VRQ-000008',
                    status: 'completed',
                    completedAt: '2026-09-01T14:30:00.000Z',
                  },
                  // Uncompleted task with legacy Container ID (VRQ-000011)
                  {
                    id: 'task-2',
                    type: 'problem',
                    taskType: 'problem',
                    title: 'Practice: Container With Most Water',
                    problemSlug: 'container-with-most-water',
                    verniqProblemId: 'VRQ-000011',
                    status: 'upcoming',
                  },
                ],
              },
              {
                date: '2026-09-02',
                dayOfWeek: 'tue',
                availableHours: 2,
                isRestDay: false,
                tasks: [
                  // Uncompleted task with legacy Search in Rotated ID (VRQ-000012)
                  {
                    id: 'task-3',
                    type: 'problem',
                    taskType: 'problem',
                    title: 'Practice: Search in Rotated Sorted Array',
                    problemSlug: 'search-in-rotated-sorted-array',
                    verniqProblemId: 'VRQ-000012',
                    status: 'upcoming',
                  },
                  // User already completed Invert Binary Tree under old roadmap
                  {
                    id: 'task-4',
                    type: 'problem',
                    taskType: 'problem',
                    title: 'Practice: Invert Binary Tree',
                    problemSlug: 'invert-binary-tree',
                    verniqProblemId: 'VRQ-000007',
                    status: 'completed',
                    completedAt: '2026-09-02T16:00:00.000Z',
                  },
                  // User has not completed Invert Binary Tree in upcoming week
                  {
                    id: 'task-5',
                    type: 'problem',
                    taskType: 'problem',
                    title: 'Practice: Invert Binary Tree',
                    problemSlug: 'invert-binary-tree',
                    verniqProblemId: 'VRQ-000007',
                    status: 'upcoming',
                  },
                ],
              },
            ],
          },
        ],
      };

      const reconciled = reconcileLegacySavedRoadmap(legacySavedRoadmap);

      // Flatten reconciled tasks
      const allReconciled = reconciled.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
      assert.equal(allReconciled.length, 5, 'Total tasks must be strictly preserved without silent drops');

      // Task 1: 3Sum ID upgraded to VRQ-000016, completed status & timestamp preserved
      const task1 = allReconciled.find((t) => t.id === 'task-1');
      assert.equal(task1.verniqProblemId, 'VRQ-000016', '3Sum ID must be reconciled to VRQ-000016');
      assert.equal(task1.status, 'completed', 'Completed status must be preserved');
      assert.equal(task1.completedAt, '2026-09-01T14:30:00.000Z', 'Completed timestamp must be preserved');

      // Task 2: Container With Most Water upgraded to VRQ-000012
      const task2 = allReconciled.find((t) => t.id === 'task-2');
      assert.equal(task2.verniqProblemId, 'VRQ-000012', 'Container ID must be reconciled to VRQ-000012');
      assert.equal(task2.status, 'upcoming', 'Uncompleted task must not be assumed solved');

      // Task 3: Search in Rotated Sorted Array upgraded to VRQ-000018
      const task3 = allReconciled.find((t) => t.id === 'task-3');
      assert.equal(task3.verniqProblemId, 'VRQ-000018', 'Rotated Search ID must be reconciled to VRQ-000018');
      assert.equal(task3.status, 'upcoming');

      // Task 4: Previously completed Invert Binary Tree remains intact (preserves historical record)
      const task4 = allReconciled.find((t) => t.id === 'task-4');
      assert.equal(task4.problemSlug, 'invert-binary-tree', 'Completed legacy problem slug preserved');
      assert.equal(task4.status, 'completed', 'Completed status preserved');
      assert.equal(task4.completedAt, '2026-09-02T16:00:00.000Z', 'Completed timestamp preserved');

      // Task 5: Uncompleted Invert Binary Tree replaced with Maximum Depth of Binary Tree
      const task5 = allReconciled.find((t) => t.id === 'task-5');
      assert.equal(task5.problemSlug, 'maximum-depth-of-binary-tree', 'Uncompleted problem upgraded to replacement');
      assert.equal(task5.verniqProblemId, 'VRQ-000137', 'Replaced with VRQ-000137');
      assert.equal(task5.problemDifficulty, 'easy');
      assert.equal(task5.status, 'upcoming', 'Never marked completed by assumption');
      assert.equal(task5.completedAt, undefined);
    });
  });
});

