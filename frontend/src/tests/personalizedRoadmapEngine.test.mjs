/**
 * CHAKRIVA — Personalized Roadmap Engine V1 Test Suite
 * ===================================================
 * Automated empirical verification of Hybrid AI Interpretation +
 * Deterministic Curriculum Planning:
 *
 * 1. Profile A: Beginner (Placement prep, no DSA mastery, gradual foundation)
 * 2. Profile B: Intermediate (Demonstrated Arrays/TwoPointers, weak on Trees/System, skips basic drills)
 * 3. Profile C: Different Goal (Competitive programming, different target skills)
 * 4. Profile D: Limited Availability (4 hrs/wk, multiple zero-hour rest days strictly respected)
 * 5. Profile E: Infeasible Deadline (Ambitious goal, 2 weeks, honest deficit & alternative weeks)
 * 6. Profile F: Missing / Draft Content (Honest judge readiness, no hallucinated tests)
 * 7. Goal Interpretation & Fallback Logic (Unknown company, AI failure fallback)
 * 8. Prerequisite DAG Validation & Cycle Detection
 * 9. Multi-factor Problem Ranking & Deterministic Tie-breaking
 * 10. Saved Plan Reconciliation & Judge-Authoritative Progress Preservation
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  generatePersonalizedRoadmap,
  generateAdaptiveRoadmap,
  evaluateFeasibility,
  reconcileLegacySavedRoadmap,
} from '../features/roadmap/utils/adaptiveEngine.ts';

import {
  resolveGoalToSkills,
  SUPPORTED_GOAL_PROFILES,
  COMPANY_SKILL_PROFILES,
} from '../features/roadmap/utils/goalSkillMapper.ts';

import {
  calculateSkillGaps,
  determineStartingStage,
} from '../features/roadmap/utils/skillGapEngine.ts';

import {
  rankCandidateProblems,
  selectProblemsForStage,
} from '../features/roadmap/utils/problemSelector.ts';

import {
  TOPIC_PREREQUISITE_DAG,
  validateTopicDagAcyclicity,
  resolveTransitivePrerequisites,
  curateCurriculumStages,
} from '../features/roadmap/utils/curriculumPlanner.ts';

import {
  validatePersonalizedPlan,
} from '../features/roadmap/utils/planValidator.ts';

import {
  BASELINE_CANONICAL_PROBLEMS,
  EXTENDED_CATALOG_PROBLEMS,
} from '../features/roadmap/utils/catalogRegistry.ts';

// -----------------------------------------------------------------------------
// Test Helpers & Mock Profiles
// -----------------------------------------------------------------------------

const BASE_WIZARD_DRAFT = {
  goal: 'entry_level',
  customGoalText: '',
  companyTargetType: 'product_based',
  targetRegion: 'india',
  targetCompanies: ['Google'],
  targetRole: 'Software Development Engineer (SDE-1)',
  skillLevel: 'intermediate',
  primaryLanguage: 'java',
  topicComfort: {},
  approxProblemsSolved: 40,
  inferredFromActivity: false,
  biggestChallenge: 'patterns',
  targetDeadline: '2026-12-31',
  timelineWeeks: 8,
  isFlexibleTimeline: false,
  weeklyAvailability: {
    mon: 2,
    tue: 2,
    wed: 2,
    thu: 2,
    fri: 2,
    sat: 3,
    sun: 0, // Rest day
  },
  studyDaysPerWeek: 6,
  sessionPreference: 'shorter_daily',
  learningStyle: 'balanced',
  revisionFrequency: 'weekly',
  includeTimedPractice: true,
  includeMockInterviews: false,
  struggleTopics: [],
  masteredTopics: [],
  pacing: 'balanced',
};

describe('CHAKRIVA — Personalized Roadmap Engine V1 Suite', () => {

  // ===========================================================================
  // 1. PROFILE A: Beginner (Placement Prep, Low Starting DSA, Linear Foundation)
  // ===========================================================================
  test('Profile A — Beginner starts with linear foundations and respects rest days', () => {
    const profileA = {
      ...BASE_WIZARD_DRAFT,
      goal: 'entry_level',
      targetRole: 'Junior SDE / Campus Placement',
      skillLevel: 'beginner',
      approxProblemsSolved: 5,
      struggleTopics: [],
      masteredTopics: [],
      weeklyAvailability: {
        mon: 1,
        tue: 1,
        wed: 1,
        thu: 1,
        fri: 1,
        sat: 1,
        sun: 0, // 6 hrs/week, Sun rest day
      },
    };

    const roadmap = generatePersonalizedRoadmap(profileA, {
      catalogProblems: EXTENDED_CATALOG_PROBLEMS,
    });

    // 1. Must produce a valid roadmap
    assert.ok(roadmap.id);
    assert.strictEqual(roadmap.weeks.length, 8);

    // 2. Stage 1 must be foundational
    assert.ok(roadmap.stages.length >= 1);
    const firstStage = roadmap.stages[0];
    assert.match(firstStage.title, /Foundation|Linear/i);
    assert.ok(
      firstStage.topics.includes('Arrays & Hashing') ||
      firstStage.topics.includes('Two Pointers')
    );

    // 3. Sundays must have strictly 0 tasks (zero-hour rest day enforcement)
    for (const week of roadmap.weeks) {
      const sunday = week.days.find((d) => d.dayOfWeek === 'sun');
      assert.ok(sunday, 'Sunday must exist in weekly schedule');
      assert.strictEqual(
        sunday.tasks.length,
        0,
        `Sunday in week ${week.weekNumber} must have 0 tasks`
      );
    }

    // 4. Plan validation check
    const validation = validatePersonalizedPlan(roadmap, EXTENDED_CATALOG_PROBLEMS);
    assert.strictEqual(validation.isValid, true, `Validation failed: ${validation.errors.join(', ')}`);

    // 5. Explanation check
    assert.ok(roadmap.explanation);
    assert.ok(roadmap.explanation.startingPointReason.length > 0);
    assert.match(roadmap.explanation.startingPointReason, /foundation|introductory/i);
  });

  // ===========================================================================
  // 2. PROFILE B: Intermediate (Mastered Arrays/Two Pointers, Weak on Trees/Graphs)
  // ===========================================================================
  test('Profile B — Intermediate skips mastered introductory drills and prioritizes weak topics', () => {
    const profileB = {
      ...BASE_WIZARD_DRAFT,
      goal: 'entry_level',
      targetRole: 'SDE-1',
      skillLevel: 'intermediate',
      approxProblemsSolved: 80,
      masteredTopics: ['Arrays & Hashing', 'Two Pointers'],
      struggleTopics: ['Binary Trees', 'Composite Design & Caching'],
      weeklyAvailability: {
        mon: 2,
        tue: 2,
        wed: 2,
        thu: 2,
        fri: 2,
        sat: 4,
        sun: 0, // 14 hrs/week
      },
    };

    // Calculate skill gaps directly
    const gapAnalysis = calculateSkillGaps(
      profileB,
      resolveGoalToSkills(profileB).recommendedTopics
    );
    const startingStage = determineStartingStage(profileB, gapAnalysis);

    // Intermediate with mastered arrays should start at Stage 2 or beyond
    assert.ok(startingStage >= 2, `Expected startingStage >= 2, got ${startingStage}`);

    const roadmap = generatePersonalizedRoadmap(profileB, {
      catalogProblems: EXTENDED_CATALOG_PROBLEMS,
    });

    assert.ok(roadmap.stages.length >= 1);

    // Verify tasks are allocated for weak topics
    const allTaskTopics = roadmap.weeks
      .flatMap((w) => w.days.flatMap((d) => d.tasks))
      .map((t) => t.topic)
      .filter(Boolean);

    const hasTreeOrSystem = allTaskTopics.some(
      (t) => t === 'Binary Trees' || t === 'Composite Design & Caching'
    );
    assert.ok(hasTreeOrSystem, 'Should schedule tasks for struggle topics');

    // Explanation should mention skipped foundations or accelerated starting point
    assert.ok(roadmap.explanation);
    assert.match(roadmap.explanation.startingPointReason, /demonstrated|accelerated|skipped|bypassed/i);
  });

  // ===========================================================================
  // 3. PROFILE C: Different Career Goal (Competitive Programming)
  // ===========================================================================
  test('Profile C — Competitive programming calibrates topics for speed and advanced patterns', () => {
    const profileC = {
      ...BASE_WIZARD_DRAFT,
      goal: 'competitive_programming',
      targetRole: 'ICPC / Codeforces Contestant',
      skillLevel: 'advanced',
      approxProblemsSolved: 250,
      struggleTopics: ['Binary Search'],
      masteredTopics: ['Arrays & Hashing', 'Two Pointers', 'Stacks & Queues'],
      weeklyAvailability: {
        mon: 2,
        tue: 2,
        wed: 2,
        thu: 2,
        fri: 2,
        sat: 4,
        sun: 0,
      },
    };

    const resolution = resolveGoalToSkills(profileC);
    assert.strictEqual(resolution.goal, 'competitive_programming');
    assert.strictEqual(resolution.targetProficiency, 'competitive_speed');

    // High priority on Binary Search
    const bsTopic = resolution.recommendedTopics.find((t) => t.topic === 'Binary Search');
    assert.ok(bsTopic);
    assert.strictEqual(bsTopic.priority, 'critical');

    const roadmap = generatePersonalizedRoadmap(profileC, {
      catalogProblems: EXTENDED_CATALOG_PROBLEMS,
    });

    assert.ok(roadmap.id);
    assert.ok(roadmap.explanation);
    assert.match(roadmap.explanation.primaryGoalRationale, /competitive/i);
  });

  // ===========================================================================
  // 4. PROFILE D: Limited Availability & Multiple Zero-Hour Rest Days
  // ===========================================================================
  test('Profile D — Limited availability (4 hrs/wk) respects all rest days strictly', () => {
    const profileD = {
      ...BASE_WIZARD_DRAFT,
      goal: 'dsa_fundamentals',
      weeklyAvailability: {
        mon: 1,
        tue: 0, // Rest day
        wed: 1,
        thu: 0, // Rest day
        fri: 1,
        sat: 1,
        sun: 0, // Rest day (Total: 4 hrs/week)
      },
    };

    const roadmap = generatePersonalizedRoadmap(profileD, {
      catalogProblems: EXTENDED_CATALOG_PROBLEMS,
    });

    assert.strictEqual(roadmap.feasibility.weeklyHours, 4);

    // Verify Tue, Thu, Sun have strictly 0 tasks across all weeks
    for (const week of roadmap.weeks) {
      for (const day of week.days) {
        if (day.dayOfWeek === 'tue' || day.dayOfWeek === 'thu' || day.dayOfWeek === 'sun') {
          assert.strictEqual(
            day.tasks.length,
            0,
            `${day.dayOfWeek.toUpperCase()} in week ${week.weekNumber} must have 0 tasks`
          );
        }
      }
    }

    // Active days should not exceed their 60-minute limit by an excessive amount
    for (const week of roadmap.weeks) {
      for (const day of week.days) {
        if (day.dailyMinutes > 0) {
          const totalEstimated = day.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
          // Allow reasonable slack for concept study + practice, but avoid overloading
          assert.ok(
            totalEstimated <= day.dailyMinutes + 35,
            `Day ${day.dayOfWeek} allocated ${totalEstimated} mins vs capacity ${day.dailyMinutes}`
          );
        }
      }
    }
  });

  // ===========================================================================
  // 5. PROFILE E: Infeasible Deadline (2 Weeks for Ambitious Goal)
  // ===========================================================================
  test('Profile E — Infeasible deadline produces honest deficit and alternative weeks', () => {
    const profileE = {
      ...BASE_WIZARD_DRAFT,
      goal: 'faang_competitive',
      companyTargetType: 'faang_competitive',
      targetRole: 'Senior SDE-2',
      skillLevel: 'beginner',
      timelineWeeks: 2,
      targetDeadline: '2026-03-01',
      weeklyAvailability: {
        mon: 1,
        tue: 1,
        wed: 1,
        thu: 1,
        fri: 1,
        sat: 1,
        sun: 0, // 6 hrs/week
      },
    };

    const feasibility = evaluateFeasibility(profileE);
    // 2 weeks * 6 hrs = 12 hrs vs typical ~50 hrs minimum for comprehensive curriculum
    assert.strictEqual(feasibility.isRealistic, false);
    assert.ok(feasibility.deficitHours > 0);
    assert.ok(feasibility.feasibleAlternativeWeeks > profileE.timelineWeeks);

    const roadmap = generatePersonalizedRoadmap(profileE, {
      catalogProblems: EXTENDED_CATALOG_PROBLEMS,
    });

    assert.strictEqual(roadmap.feasibility.isRealistic, false);
    assert.ok(roadmap.explanation);
    assert.match(roadmap.explanation.timeFitExplanation, /infeasible|tight|compressed|deficit/i);
  });

  // ===========================================================================
  // 6. PROFILE F: Missing / Draft Content (Honest Judge Readiness)
  // ===========================================================================
  test('Profile F — Unverified or draft records are identified honestly without hallucinated test cases', () => {
    // Extended catalog includes VRQ-000392 Invert Binary Tree which is marked as draft (isJudgeReady: false)
    const draftProblem = EXTENDED_CATALOG_PROBLEMS.find((p) => p.verniqProblemId === 'VRQ-000392');
    assert.ok(draftProblem, 'Draft test problem VRQ-000392 must be in catalog');
    assert.strictEqual(draftProblem.isJudgeReady, false);

    // Problem ranker includes it with proper content readiness notes
    const ranked = rankCandidateProblems(
      [draftProblem],
      'Binary Trees',
      'medium',
      'interview_ready',
      new Set()
    );

    assert.strictEqual(ranked.length, 1);
    assert.match(ranked[0].notes, /Draft|not currently judge-executable/i);

    // Scheduling with only this problem should generate conceptual invariant tasks rather than claiming judge readiness
    const selected = selectProblemsForStage(
      'Binary Trees',
      'interview_ready',
      1,
      [draftProblem],
      new Set()
    );

    assert.strictEqual(selected.problems.length, 1);
    assert.strictEqual(selected.problems[0].isJudgeReady, false);
  });

  // ===========================================================================
  // 7. GOAL INTERPRETATION & FALLBACK LOGIC
  // ===========================================================================
  test('Goal-to-Skill Mapper — Supports standard companies and falls back safely on unknown companies', () => {
    // 1. Google target
    const googleDraft = {
      ...BASE_WIZARD_DRAFT,
      targetCompanies: ['Google'],
    };
    const googleRes = resolveGoalToSkills(googleDraft);
    assert.strictEqual(googleRes.isFallback, false);
    assert.ok(googleRes.assumptions.length > 0);
    assert.match(googleRes.assumptions[0], /Google/);

    // 2. Unknown company falls back to role-based interview profile
    const unknownDraft = {
      ...BASE_WIZARD_DRAFT,
      targetCompanies: ['Acme Corp 999'],
    };
    const fallbackRes = resolveGoalToSkills(unknownDraft);
    assert.strictEqual(fallbackRes.isFallback, true);
    assert.match(fallbackRes.assumptions[0], /role-based interview-preparation fallback/i);
    assert.ok(fallbackRes.recommendedTopics.length >= 4);
  });

  // ===========================================================================
  // 8. PREREQUISITE DAG VALIDATION & CYCLE DETECTION
  // ===========================================================================
  test('Prerequisite DAG — Acyclicity passes on valid DAG and detects artificial cycles', () => {
    // 1. Valid production DAG
    const validation = validateTopicDagAcyclicity(TOPIC_PREREQUISITE_DAG);
    assert.strictEqual(validation.hasCycle, false);
    assert.strictEqual(validation.cycleNodes.length, 0);

    // 2. Transitive prerequisites resolution
    const slidingWindowPrereqs = resolveTransitivePrerequisites('Sliding Window', TOPIC_PREREQUISITE_DAG);
    assert.ok(slidingWindowPrereqs.includes('Two Pointers'));
    assert.ok(slidingWindowPrereqs.includes('Arrays & Hashing'));

    // 3. Artificial cycle detection
    const cyclicDag = {
      ...TOPIC_PREREQUISITE_DAG,
      'Arrays & Hashing': ['Binary Search'], // Cycle: Arrays -> Binary Search -> Arrays
    };
    const cycleValidation = validateTopicDagAcyclicity(cyclicDag);
    assert.strictEqual(cycleValidation.hasCycle, true);
    assert.ok(cycleValidation.cycleNodes.length > 0);
  });

  // ===========================================================================
  // 9. MULTI-FACTOR PROBLEM RANKING & DETERMINISTIC TIE-BREAKING
  // ===========================================================================
  test('Problem Selector — Produces deterministic ranking and tie-breaking on identical inputs', () => {
    const candidates = EXTENDED_CATALOG_PROBLEMS.filter((p) => p.topic === 'Two Pointers');
    assert.ok(candidates.length >= 2);

    const ranking1 = rankCandidateProblems(
      candidates,
      'Two Pointers',
      'medium',
      'interview_ready',
      new Set()
    );

    const ranking2 = rankCandidateProblems(
      candidates,
      'Two Pointers',
      'medium',
      'interview_ready',
      new Set()
    );

    // Exact reproducible score & ordering
    assert.strictEqual(ranking1.length, ranking2.length);
    for (let i = 0; i < ranking1.length; i++) {
      assert.strictEqual(ranking1[i].problem.verniqProblemId, ranking2[i].problem.verniqProblemId);
      assert.strictEqual(ranking1[i].score, ranking2[i].score);
    }
  });

  // ===========================================================================
  // 10. RECONCILIATION & JUDGE PROGRESS PRESERVATION
  // ===========================================================================
  test('Saved Plan Reconciliation — Preserves completed task history and legacy IDs', () => {
    const baselineRoadmap = generatePersonalizedRoadmap(BASE_WIZARD_DRAFT, {
      catalogProblems: BASELINE_CANONICAL_PROBLEMS,
    });

    // Mark task 1 as completed
    const firstTask = baselineRoadmap.weeks[0].days[0].tasks[0];
    assert.ok(firstTask);
    firstTask.status = 'completed';
    firstTask.completedAt = '2026-10-15T10:00:00.000Z';

    // Simulate saving and reconciling legacy plan
    const reconciled = reconcileLegacySavedRoadmap(baselineRoadmap);

    const reconciledTask = reconciled.weeks[0].days[0].tasks[0];
    assert.strictEqual(reconciledTask.status, 'completed');
    assert.strictEqual(reconciledTask.completedAt, '2026-10-15T10:00:00.000Z');
  });

  // ===========================================================================
  // 11. BACKWARD COMPATIBILITY: Legacy generateAdaptiveRoadmap
  // ===========================================================================
  test('Legacy generateAdaptiveRoadmap defaults to 11-problem canonical baseline for Phase 3A regressions', () => {
    const legacyPlan = generateAdaptiveRoadmap(BASE_WIZARD_DRAFT);
    assert.strictEqual(legacyPlan.weeks.length, 8);
    // Phase 3A invariant: exactly 69 tasks across 8 weeks (11 practice + 11 concept + 47 revision)
    assert.strictEqual(legacyPlan.totalTasks, 69);
  });

  // ===========================================================================
  // 12. MULTI-SUBJECT & FINALIZE METADATA (Page 3 & Page 6 Enhancements)
  // ===========================================================================
  test('Multi-Subject Preparation — Schedules non-DSA study modules honestly without fake VRQ IDs', () => {
    const multiSubjectDraft = {
      ...BASE_WIZARD_DRAFT,
      planName: 'SDE-2 Architecture & DSA Sprint',
      experienceLevel: '2_5',
      targetRegion: 'us',
      selectedSubjects: ['dsa', 'system_design', 'dbms'],
      subjectProficiencies: {
        dsa: 'intermediate',
        system_design: 'beginner',
        dbms: 'intermediate',
      },
      startDateOption: 'tomorrow',
    };

    const roadmap = generatePersonalizedRoadmap(multiSubjectDraft, {
      catalogProblems: EXTENDED_CATALOG_PROBLEMS,
    });

    assert.strictEqual(roadmap.title, 'SDE-2 Architecture & DSA Sprint');
    assert.strictEqual(roadmap.status, 'active');
    assert.ok(roadmap.nonDsaTracks && roadmap.nonDsaTracks.length === 2);

    const allTasks = roadmap.weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
    const nonDsaTasks = allTasks.filter((t) => t.subject && t.subject !== 'dsa');
    assert.ok(nonDsaTasks.length > 0, 'Must schedule concept modules for non-DSA subjects');

    for (const nt of nonDsaTasks) {
      assert.strictEqual(nt.verniqProblemId, undefined, 'Non-DSA module must never fabricate VRQ problem IDs');
      assert.strictEqual(nt.taskType, 'concept');
    }

    // Rest days remain strictly zero tasks
    for (const w of roadmap.weeks) {
      for (const d of w.days) {
        if (d.isRestDay) {
          assert.strictEqual(d.tasks.length, 0);
        }
      }
    }
  });
});
