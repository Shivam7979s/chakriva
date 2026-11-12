import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COACHING_MODES,
  buildCoachStarters,
  buildFallbackMentorReply,
  buildFocusProblemOptions,
  buildFollowUpPrompts,
  deriveTopicFocusSignals,
  extractRoadmapFocus,
  formatVerdictLabel,
  getPrimaryTopic,
} from '../features/mentor/utils/mentorInsights.ts';

const MOCK_PROBLEMS = [
  {
    id: 'p-1',
    verniq_id: 'VRQ-1',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'easy',
    acceptance_rate: 80,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    topics: ['Arrays & Hashing'],
    domain: 'DSA',
  },
  {
    id: 'p-2',
    verniq_id: 'VRQ-2',
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    difficulty: 'medium',
    acceptance_rate: 58,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    topics: ['Binary Search'],
    domain: 'DSA',
  },
  {
    id: 'p-3',
    verniq_id: 'VRQ-3',
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    difficulty: 'medium',
    acceptance_rate: 62,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    topics: ['Intervals'],
    domain: 'DSA',
  },
];

test('COACHING_MODES includes 4 distinct modes mapped to valid mentor actions', () => {
  assert.equal(COACHING_MODES.length, 4);
  const ids = new Set(COACHING_MODES.map((m) => m.id));
  assert.deepEqual([...ids], ['hint', 'pattern', 'approach', 'review']);
});

test('buildFocusProblemOptions ranks revision due and attempted items ahead of solved/catalog items', () => {
  const options = buildFocusProblemOptions(
    MOCK_PROBLEMS,
    { 'p-1': 'solved', 'p-2': 'attempted' },
    { 'p-3': true },
    []
  );

  assert.equal(options[0].id, 'p-3');
  assert.equal(options[0].signalLabel, 'Revision Due');
  assert.equal(options[1].id, 'p-2');
  assert.equal(options[1].signalLabel, 'Attempted');
  assert.equal(options[2].id, 'p-1');
  assert.equal(options[2].signalLabel, 'Solved');
});

test('deriveTopicFocusSignals aggregates attempted, revision, and non-accepted submissions honestly', () => {
  const signals = deriveTopicFocusSignals(
    MOCK_PROBLEMS,
    { 'p-1': 'solved', 'p-2': 'attempted' },
    { 'p-3': true },
    [
      {
        id: 's-1',
        user_id: 'u-1',
        problem_id: 'p-2',
        language: 'python',
        code: '',
        verdict: 'time_limit_exceeded',
        created_at: '2026-11-12T10:00:00Z',
        problemTitle: 'Search in Rotated Sorted Array',
        problemSlug: 'search-in-rotated-sorted-array',
      },
    ]
  );

  const byTopic = Object.fromEntries(signals.map((s) => [s.topic, s]));
  assert.ok(byTopic['Binary Search']);
  assert.equal(byTopic['Binary Search'].attemptedCount, 1);
  assert.equal(byTopic['Binary Search'].nonAcceptedCount, 1);
  assert.ok(byTopic['Intervals']);
  assert.equal(byTopic['Intervals'].revisionCount, 1);
  assert.equal(byTopic['Arrays & Hashing'], undefined);
});

test('extractRoadmapFocus returns first pending or missed task accurately', () => {
  const focus = extractRoadmapFocus({
    id: 'rm-1',
    title: 'Backend Sprint',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-12T00:00:00Z',
    profile: {
      goal: 'internship',
      targetCompanies: [],
      targetRole: 'SDE Intern',
      skillLevel: 'intermediate',
      primaryLanguage: 'python',
      targetDeadline: '2026-12-15',
      timelineWeeks: 6,
      weeklyAvailability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 2, sun: 0 },
      struggleTopics: ['Binary Search'],
      masteredTopics: [],
      pacing: 'balanced',
    },
    feasibility: {
      isRealistic: true,
      totalAvailableHours: 40,
      estimatedRequiredHours: 36,
      weeklyHours: 12,
      pacingSummary: 'Balanced',
      recommendation: 'Keep steady',
    },
    stages: [],
    weeks: [
      {
        weekNumber: 1,
        startDate: '2026-11-01',
        endDate: '2026-11-07',
        title: 'Week 1',
        objective: 'Foundations',
        stageName: 'Foundations',
        days: [
          {
            date: '2026-11-01',
            dayOfWeek: 'sun',
            dayNumber: 1,
            availableHours: 2,
            isRestDay: false,
            tasks: [
              {
                id: 't-1',
                title: 'Two Sum Warmup',
                taskType: 'practice',
                estimatedMinutes: 30,
                scheduledDate: '2026-11-01',
                status: 'completed',
                topic: 'Arrays',
              },
              {
                id: 't-2',
                title: 'Rotated Array Invariant',
                taskType: 'practice',
                estimatedMinutes: 45,
                scheduledDate: '2026-11-02',
                status: 'not_started',
                topic: 'Binary Search',
              },
            ],
          },
        ],
      },
    ],
    totalTasks: 2,
    completedTasks: 1,
    missedTasks: 0,
    progressPercent: 50,
  });

  assert.ok(focus);
  assert.equal(focus.roadmapTitle, 'Backend Sprint');
  assert.equal(focus.progressPercent, 50);
  assert.equal(focus.nextTask?.id, 't-2');
});

test('buildCoachStarters and buildFallbackMentorReply preserve Socratic zero-spoilers discipline', () => {
  const starters = buildCoachStarters(
    {
      id: 'p-2',
      slug: 'search-in-rotated-sorted-array',
      title: 'Search in Rotated Sorted Array',
      difficulty: 'medium',
      topic: 'Binary Search',
      signalLabel: 'Attempted',
      problem: MOCK_PROBLEMS[1],
    },
    [],
    'hint',
    null
  );
  assert.equal(starters.length, 3);
  assert.ok(starters[0].includes('Search in Rotated Sorted Array'));

  const reply = buildFallbackMentorReply(
    'give me the code for binary search',
    'hint',
    'Search in Rotated Sorted Array',
    'OFFLINE'
  );
  assert.ok(reply.includes('Zero-Spoilers'));
});

test('getPrimaryTopic resolves Supabase tags while ignoring generic placeholders', () => {
  assert.equal(
    getPrimaryTopic({
      ...MOCK_PROBLEMS[0],
      topics: undefined,
      tags: ['General', 'Sliding Window'],
    }),
    'Sliding Window'
  );
  assert.equal(
    getPrimaryTopic({
      ...MOCK_PROBLEMS[0],
      topics: undefined,
      tags: ['General'],
      domain: 'Algorithms',
    }),
    'Algorithms'
  );
});

test('problem-aware fallback enriches pattern matching and varies progressive hints', () => {
  const hint1 = buildFallbackMentorReply(
    'What is the first clue here?',
    'hint',
    { title: 'Container With Most Water', topic: 'Two Pointers', difficulty: 'medium' },
    'OFFLINE',
    1
  );
  const hint2 = buildFallbackMentorReply(
    'What is the next clue?',
    'hint',
    { title: 'Container With Most Water', topic: 'Two Pointers', difficulty: 'medium' },
    'OFFLINE',
    2
  );

  assert.ok(hint1.includes('Bounding Dimension Invariant'));
  assert.ok(hint2.includes('Hint #2'));
  assert.notEqual(hint1, hint2);
  assert.equal(formatVerdictLabel('time_limit_exceeded'), 'TLE');
  assert.equal(buildFollowUpPrompts('Two Sum', 'hint').length, 3);
});

