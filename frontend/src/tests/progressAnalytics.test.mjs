import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDeduplicatedCatalog,
  safePercentage,
  evaluateTopicAssessment,
  getAssessmentPillConfig,
  deriveDifficultyStatsFromProgress,
  deriveTopicStatsFromProgress,
  deriveDefaultCodingStats,
  generateFallbackInsights,
} from '../features/progress/utils/progressAnalytics.ts';

describe('CHAKRIVA Progress & Analytics Suite', () => {
  it('1. Deduplicated catalog integrity', () => {
    const catalog = getDeduplicatedCatalog();
    assert.ok(catalog.length > 0, 'Catalog should contain canonical problems');

    const seen = new Set();
    for (const p of catalog) {
      const key = p.slug || p.verniqProblemId;
      assert.ok(!seen.has(key), `Catalog contains duplicate key: ${key}`);
      seen.add(key);
      assert.ok(['easy', 'medium', 'hard'].includes(p.difficulty), `Problem ${key} has valid difficulty`);
      assert.ok(p.topic && p.topic.length > 0, `Problem ${key} has non-empty topic`);
    }
  });

  it('2. Safe percentage calculation', () => {
    assert.strictEqual(safePercentage(0, 0), 0);
    assert.strictEqual(safePercentage(5, 0), 0);
    assert.strictEqual(safePercentage(-1, 0), 0);
    assert.strictEqual(safePercentage(1, 4), 25);
    assert.strictEqual(safePercentage(2, 3), 67);
    assert.strictEqual(safePercentage(10, 10), 100);
    assert.strictEqual(safePercentage(15, 10), 100, 'Should clamp to 100');
  });

  it('3. Sample-size safe topic assessment logic', () => {
    // Under 3 attempts: ALWAYS EXPLORING regardless of solve rate
    assert.strictEqual(evaluateTopicAssessment(0, 0), 'EXPLORING');
    assert.strictEqual(evaluateTopicAssessment(1, 100), 'EXPLORING', 'Single 100% attempt must not be flagged strong');
    assert.strictEqual(evaluateTopicAssessment(2, 0), 'EXPLORING', 'Two 0% attempts must not be flagged as weakness');

    // 3 or more attempts: accurate tiering
    assert.strictEqual(evaluateTopicAssessment(3, 100), 'STRONG');
    assert.strictEqual(evaluateTopicAssessment(4, 75), 'STRONG');
    assert.strictEqual(evaluateTopicAssessment(5, 70), 'STRONG');

    assert.strictEqual(evaluateTopicAssessment(3, 66), 'DEVELOPING');
    assert.strictEqual(evaluateTopicAssessment(5, 40), 'DEVELOPING');

    assert.strictEqual(evaluateTopicAssessment(3, 33), 'NEEDS_PRACTICE');
    assert.strictEqual(evaluateTopicAssessment(10, 20), 'NEEDS_PRACTICE');
  });

  it('4. Assessment pill configuration formatting (no screamers)', () => {
    const strong = getAssessmentPillConfig('STRONG');
    assert.strictEqual(strong.label, 'Strong');
    assert.ok(!strong.label.includes('≥'), 'Pill label should be clean and readable');

    const developing = getAssessmentPillConfig('DEVELOPING');
    assert.strictEqual(developing.label, 'Developing');

    const needsPractice = getAssessmentPillConfig('NEEDS_PRACTICE');
    assert.strictEqual(needsPractice.label, 'Needs Practice');

    const exploring = getAssessmentPillConfig('EXPLORING');
    assert.strictEqual(exploring.label, 'Exploring');
  });

  it('5. Difficulty stats derived accurately from progress map', () => {
    // Mock progress map with Two Sum solved (easy) and 3Sum attempted (medium)
    const mockMap = {
      'two-sum': 'solved',
      '3sum': 'attempted',
    };

    const diff = deriveDifficultyStatsFromProgress(mockMap);
    assert.ok(diff.totalCatalog > 0, 'Total catalog count should be positive');
    assert.strictEqual(diff.easy.solved, 1, 'Two Sum is easy and solved');
    assert.strictEqual(diff.easy.attempted, 1);
    assert.strictEqual(diff.medium.solved, 0);
    assert.ok(diff.medium.attempted >= 1, '3Sum was attempted');
    assert.strictEqual(diff.totalSolved, 1);
  });

  it('6. Topic stats grouping and activity ranking', () => {
    const mockMap = {
      'two-sum': 'solved',
      'group-anagrams': 'solved',
      'longest-consecutive-sequence': 'attempted',
    };

    const topics = deriveTopicStatsFromProgress(mockMap);
    assert.ok(topics.length > 0, 'Should produce topic breakdown');

    // Arrays & Hashing should have 2 solved
    const arraysTopic = topics.find((t) => t.name === 'Arrays & Hashing');
    assert.ok(arraysTopic, 'Arrays & Hashing topic must be present');
    assert.strictEqual(arraysTopic.solved, 2);
    assert.strictEqual(arraysTopic.attempted, 3);
    assert.strictEqual(arraysTopic.assessment, 'DEVELOPING');

    // Active topics should sort before inactive topics
    assert.strictEqual(topics[0].slug, arraysTopic.slug, 'Active topic should be sorted first');
  });

  it('7. Default coding stats synthesis and profile count reconciliation', () => {
    const mockMap = {
      'two-sum': 'solved',
    };

    const stats = deriveDefaultCodingStats(mockMap, 5);
    // Profile count (5) is higher than catalog-matched map (1)
    assert.strictEqual(stats.problemsSolved, 5, 'Should respect higher profile solved count');
    assert.strictEqual(stats.problemsAttempted, 5);
    assert.strictEqual(stats.problemSolveRate, 100);
    assert.strictEqual(stats.verdictDistribution.accepted, 5);
  });

  it('8. Fallback insights generation without jargon', () => {
    const zeroInsights = generateFallbackInsights(0, null);
    assert.ok(zeroInsights.length >= 1);
    assert.strictEqual(zeroInsights[0].category, 'WELCOME');
    assert.ok(zeroInsights[0].actionUrl.includes('two-sum'));

    const activeInsights = generateFallbackInsights(12, '12-Week Meta Readiness');
    assert.ok(activeInsights.length === 2);
    assert.strictEqual(activeInsights[0].category, 'STRENGTH');
    assert.strictEqual(activeInsights[1].category, 'RECOMMENDATION');
    assert.ok(activeInsights[1].title.includes('12-Week Meta Readiness'));
  });
});
