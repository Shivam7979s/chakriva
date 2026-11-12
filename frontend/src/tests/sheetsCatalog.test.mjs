import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHEETS_CATALOG,
  getSheetById,
  resolveSheetCategoryQuery,
  resolveSheetSummary,
} from '../features/sheets/data/sheetsCatalog.ts';

const SAMPLE_PROBLEMS = [
  {
    id: 'p-1',
    verniq_id: 'VRQ-000001',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'easy',
    acceptance_rate: 82.4,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    domain: 'DSA',
    tags: ['Arrays', 'Hash Map'],
  },
  {
    id: 'p-2',
    verniq_id: 'VRQ-000002',
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    difficulty: 'easy',
    acceptance_rate: 76.5,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    domain: 'DSA',
    tags: ['Arrays', 'Greedy'],
  },
  {
    id: 'p-3',
    verniq_id: 'VRQ-000016',
    title: '3Sum',
    slug: '3sum',
    difficulty: 'medium',
    acceptance_rate: 68.2,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    domain: 'DSA',
    tags: ['Arrays', 'Two Pointers'],
  },
  {
    id: 'p-4',
    verniq_id: 'VRQ-000010',
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'hard',
    acceptance_rate: 58.6,
    description_markdown: '',
    constraints_markdown: '',
    starter_templates: {},
    is_premium: false,
    is_published: true,
    domain: 'DSA',
    tags: ['Monotonic Stack', 'Two Pointers'],
  },
];

test('CHAKRIVA Sheets Catalog — definitions, category queries, and deterministic resolution', () => {
  assert.equal(SHEETS_CATALOG.length, 8);
  assert.equal(resolveSheetCategoryQuery('company'), 'company');
  assert.equal(resolveSheetCategoryQuery('companies'), 'company');
  assert.equal(resolveSheetCategoryQuery('unknown'), 'all');

  const core = getSheetById('chakriva-core-150');
  assert.ok(core);

  const summary = resolveSheetSummary(
    core,
    SAMPLE_PROBLEMS,
    { 'p-1': 'solved', 'p-3': 'attempted' },
    { 'p-4': true }
  );

  assert.equal(summary.totalCount, 4);
  assert.equal(summary.solvedCount, 1);
  assert.equal(summary.attemptedCount, 1);
  assert.equal(summary.bookmarkedCount, 1);
  assert.equal(summary.completionPercent, 25);
  assert.equal(summary.difficultyCounts.easy.total, 2);
  assert.equal(summary.difficultyCounts.easy.solved, 1);
  assert.equal(summary.difficultyCounts.medium.total, 1);
  assert.equal(summary.difficultyCounts.hard.total, 1);

  const uniqueIds = new Set(summary.allProblems.map((p) => p.problem.id));
  assert.equal(uniqueIds.size, summary.totalCount, 'Problems inside a sheet must be deduplicated');

  const twoSum = summary.allProblems.find((p) => p.problem.slug === 'two-sum');
  assert.ok(twoSum?.keyInvariant, 'Canonical problem should hydrate keyInvariant hint');
});

