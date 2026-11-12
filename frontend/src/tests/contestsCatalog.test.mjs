import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTEST_FILTER_TABS,
  CONTESTS_CATALOG,
  formatCountdown,
  formatScheduleCountdown,
  getContestById,
  getFeaturedContests,
  getNextScheduledStartMs,
  getRemainingSeconds,
  resolveContestSummary,
} from '../features/contests/data/contestsCatalog.ts';

test('CONTESTS_CATALOG resolves every contest problem cleanly even without network problems', () => {
  assert.ok(CONTESTS_CATALOG.length >= 6);
  assert.ok(CONTEST_FILTER_TABS.some((t) => t.id === 'featured'));
  assert.equal(getFeaturedContests().length, 2);
  assert.equal(getContestById('weekly-contest-01')?.durationMinutes, 90);

  for (const contest of CONTESTS_CATALOG) {
    const summary = resolveContestSummary(contest, [], {});
    assert.equal(
      summary.totalCount,
      contest.problems.length,
      `Contest ${contest.id} should resolve all problems`
    );
    assert.ok(summary.totalPoints > 0);
    assert.equal(summary.solvedCount, 0);
    assert.equal(summary.earnedPoints, 0);
    assert.equal(summary.isCompleted, false);
  }
});

test('resolveContestSummary credits LeetCode-style scaled points strictly from progressMap', () => {
  const sprint = getContestById('pointers-window-drill');
  assert.ok(sprint);

  const partial = resolveContestSummary(sprint, [], {
    'best-time-to-buy-and-sell-stock': 'solved',
    'container-with-most-water': 'attempted',
  });
  assert.equal(partial.solvedCount, 1);
  assert.equal(partial.attemptedCount, 1);
  assert.equal(partial.earnedPoints, 3);
  assert.equal(partial.isCompleted, false);

  const full = resolveContestSummary(sprint, [], {
    'best-time-to-buy-and-sell-stock': 'solved',
    'container-with-most-water': 'solved',
    '3sum': 'solved',
  });
  assert.equal(full.solvedCount, 3);
  assert.equal(full.earnedPoints, full.totalPoints);
  assert.equal(full.totalPoints, 12);
  assert.equal(full.isCompleted, true);
});

test('schedule and virtual timers calculate countdowns deterministically', () => {
  const now = Date.UTC(2026, 10, 12, 12, 0, 0); // Thursday
  const session = {
    contestId: 'oa-screening-sprint-01',
    startedAtMs: now - 125_000,
    durationMinutes: 60,
  };

  assert.equal(getRemainingSeconds(session, now), 60 * 60 - 125);
  assert.equal(formatCountdown(3599), '59:59');
  assert.equal(formatCountdown(5400), '1:30:00');
  assert.equal(getRemainingSeconds(session, now + 100 * 60_000), 0);
  assert.equal(formatCountdown(0), '00:00');

  const nextWeekly = getNextScheduledStartMs('weekly', now);
  const nextBiweekly = getNextScheduledStartMs('biweekly', now);
  assert.ok(nextWeekly > now);
  assert.ok(nextBiweekly > now);
  assert.equal(new Date(nextWeekly).getUTCDay(), 0); // Sunday
  assert.equal(new Date(nextBiweekly).getUTCDay(), 6); // Saturday
  assert.ok(formatScheduleCountdown(nextWeekly, now).includes('d'));
});
