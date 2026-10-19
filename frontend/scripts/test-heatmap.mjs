import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatLocalDate,
  parseLocalDate,
  isLeapYear,
  groupSubmissionsByLocalDate,
  buildRolling12MonthCalendar,
} from '../src/lib/heatmapUtils.ts';

test('formatLocalDate formats dates correctly into YYYY-MM-DD', () => {
  const d = new Date(2026, 9, 13); // Oct 13, 2026
  assert.equal(formatLocalDate(d), '2026-10-13');

  const dJan = new Date(2026, 0, 5); // Jan 5, 2026
  assert.equal(formatLocalDate(dJan), '2026-01-05');
});

test('rolling 12-month calendar generates exactly 365 dates ending on current date', () => {
  const refDate = new Date(2026, 9, 13); // Tuesday, Oct 13, 2026
  const calendar = buildRolling12MonthCalendar({
    activityMap: {},
    referenceDate: refDate,
  });

  assert.equal(calendar.endDateStr, '2026-10-13');
  assert.equal(calendar.startDateStr, '2025-10-14'); // 364 days back = 365 days total

  // Count days with isInRange === true
  let inRangeCount = 0;
  for (const w of calendar.weeks) {
    for (const d of w.days) {
      if (d.isInRange) inRangeCount++;
    }
  }
  assert.equal(inRangeCount, 365, 'Must generate exactly 365 calendar dates in range');

  // First day in range must be startDate
  const firstVisible = calendar.weeks[0].days.find((d) => d.isInRange);
  assert.equal(firstVisible?.dateStr, '2025-10-14');
  assert.equal(firstVisible?.dayOfWeek, 2, 'First day must be Tuesday (2)');

  // Last day in range must be endDate
  const lastWeek = calendar.weeks[calendar.weeks.length - 1];
  const lastVisible = [...lastWeek.days].reverse().find((d) => d.isInRange);
  assert.equal(lastVisible?.dateStr, '2026-10-13');
  assert.equal(lastVisible?.dayOfWeek, 2, 'Last day must be Tuesday (2)');
});

test('weekday offsets: days before start in week 0 and days after end in week 52 are offset', () => {
  const refDate = new Date(2026, 9, 13); // Tuesday (2)
  const calendar = buildRolling12MonthCalendar({
    activityMap: {},
    referenceDate: refDate,
  });

  const week0 = calendar.weeks[0];
  // Sunday (0) and Monday (1) of week 0 must be outside range
  assert.equal(week0.days[0].isInRange, false);
  assert.equal(week0.days[1].isInRange, false);
  // Tuesday (2) through Saturday (6) must be inside range
  assert.equal(week0.days[2].isInRange, true);
  assert.equal(week0.days[6].isInRange, true);

  const week52 = calendar.weeks[52];
  // Sunday (0), Monday (1), Tuesday (2) must be inside range
  assert.equal(week52.days[0].isInRange, true);
  assert.equal(week52.days[1].isInRange, true);
  assert.equal(week52.days[2].isInRange, true);
  // Wednesday (3) through Saturday (6) must be outside range
  assert.equal(week52.days[3].isInRange, false);
  assert.equal(week52.days[6].isInRange, false);
});

test('month labels alignment: every month present is labeled with no skipped months', () => {
  const refDate = new Date(2026, 9, 13); // Oct 13, 2026
  const calendar = buildRolling12MonthCalendar({
    activityMap: {},
    referenceDate: refDate,
  });

  // From Oct 2025 to Oct 2026: exactly 13 months
  const expectedMonths = [
    'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'
  ];

  const actualMonths = calendar.monthHeaders.map((h) => h.month);
  assert.deepEqual(actualMonths, expectedMonths, 'All 13 months must be present without skipping');

  // Verify alignment: each subsequent month header must align with week containing day 1
  for (let i = 1; i < calendar.monthHeaders.length; i++) {
    const header = calendar.monthHeaders[i];
    const week = calendar.weeks[header.weekIndex];
    const hasFirstOfMonth = week.days.some((d) => d.isInRange && parseLocalDate(d.dateStr).getDate() === 1);
    assert.ok(hasFirstOfMonth, `Month ${header.month} must align with the week containing day 1`);
  }
});

test('streak calculation: empty data yields 0 submissions, 0 active days, 0 max streak', () => {
  const refDate = new Date(2026, 9, 13);
  const calendar = buildRolling12MonthCalendar({
    activityMap: {},
    referenceDate: refDate,
  });

  assert.equal(calendar.totalSubmissions, 0);
  assert.equal(calendar.activeDays, 0);
  assert.equal(calendar.maxStreak, 0);
});

test('streak calculation matches active days and consecutive day counts', () => {
  const refDate = new Date(2026, 9, 13);
  const activityMap = {
    '2026-10-10': 3,
    '2026-10-11': 1,
    '2026-10-12': 4,
    '2026-10-13': 2, // 4 consecutive days
    '2026-09-01': 5, // Isolated day
  };

  const calendar = buildRolling12MonthCalendar({
    activityMap,
    referenceDate: refDate,
  });

  assert.equal(calendar.totalSubmissions, 15);
  assert.equal(calendar.activeDays, 5);
  assert.equal(calendar.maxStreak, 4);
});

test('timezone and local date submission grouping', () => {
  const rawSubs = [
    { created_at: '2026-10-12T18:30:00.000Z', verdict: 'accepted' },
    { created_at: '2026-10-12T10:00:00.000Z', verdict: 'wrong_answer' },
  ];

  const { activityMap, acceptedMap } = groupSubmissionsByLocalDate(rawSubs);
  const totalCount = Object.values(activityMap).reduce((a, b) => a + b, 0);
  const totalAc = Object.values(acceptedMap).reduce((a, b) => a + b, 0);

  assert.equal(totalCount, 2);
  assert.equal(totalAc, 1);
});

test('leap year handling: handles Feb 29 leap day accurately', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2025), false);
  assert.equal(isLeapYear(2026), false);

  // Leap year reference date: March 1, 2024
  const leapRef = new Date(2024, 2, 1); // March 1, 2024
  const calendar = buildRolling12MonthCalendar({
    activityMap: { '2024-02-29': 3 },
    referenceDate: leapRef,
  });

  // Verify Feb 29, 2024 is included and active
  let foundLeapDay = false;
  for (const w of calendar.weeks) {
    for (const d of w.days) {
      if (d.dateStr === '2024-02-29' && d.isInRange) {
        foundLeapDay = true;
        assert.equal(d.count, 3);
      }
    }
  }
  assert.ok(foundLeapDay, 'Feb 29 must exist in calendar during leap year window');
  assert.equal(calendar.totalSubmissions, 3);
  assert.equal(calendar.activeDays, 1);
});

test('year boundary transition: handles Dec 31 to Jan 1 accurately', () => {
  const newYearRef = new Date(2026, 0, 1); // Jan 1, 2026
  const calendar = buildRolling12MonthCalendar({
    activityMap: {
      '2025-12-31': 2,
      '2026-01-01': 5,
    },
    referenceDate: newYearRef,
  });

  assert.equal(calendar.endDateStr, '2026-01-01');
  assert.equal(calendar.totalSubmissions, 7);
  assert.equal(calendar.activeDays, 2);
  assert.equal(calendar.maxStreak, 2);

  // Month headers must include Dec and Jan
  const months = calendar.monthHeaders.map((h) => h.month);
  assert.ok(months.includes('Dec'));
  assert.ok(months.includes('Jan'));
});
