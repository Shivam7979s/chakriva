/**
 * Heatmap & Contribution Calendar Utility Functions
 *
 * Implements pure date aggregation, rolling 12-month calendar grid generation,
 * weekday offsets, month label alignment, streak calculations, and local timezone handling.
 */

export interface DayData {
  dateStr: string; // 'YYYY-MM-DD'
  formattedDate: string; // 'Oct 12, 2026'
  count: number;
  acceptedCount: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  isToday: boolean;
  isInRange: boolean; // false for weekday offset cells before startDate or after endDate
}

export interface WeekData {
  weekIndex: number;
  days: DayData[];
}

export interface MonthHeaderData {
  weekIndex: number;
  month: string;
  year: number;
}

export interface CalendarResult {
  weeks: WeekData[];
  monthHeaders: MonthHeaderData[];
  totalSubmissions: number;
  totalAccepted: number;
  activeDays: number;
  maxStreak: number;
  startDateStr: string;
  endDateStr: string;
}

/**
 * Formats a Date instance as YYYY-MM-DD in the user's local timezone.
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a local Date instance centered at noon to avoid DST edge anomalies.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Formats a Date instance as e.g. "Oct 12, 2026".
 */
export function formatTooltipDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Leap year check for calendar leap year boundaries.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Groups raw submissions into user's local YYYY-MM-DD date buckets.
 */
export function groupSubmissionsByLocalDate(
  submissions: Array<{ created_at: string; verdict?: string }>
): {
  activityMap: Record<string, number>;
  acceptedMap: Record<string, number>;
} {
  const activityMap: Record<string, number> = {};
  const acceptedMap: Record<string, number> = {};

  for (const sub of submissions) {
    if (!sub.created_at) continue;
    const d = new Date(sub.created_at);
    if (isNaN(d.getTime())) continue;

    const dateStr = formatLocalDate(d);
    activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;

    const v = (sub.verdict || '').toLowerCase().trim();
    if (v === 'accepted' || v === 'ac') {
      acceptedMap[dateStr] = (acceptedMap[dateStr] || 0) + 1;
    }
  }

  return { activityMap, acceptedMap };
}

/**
 * Computes maximum consecutive-day streak and total active days from an activity map.
 */
export function calculateStreakFromCalendar(
  activityMap: Record<string, number>,
  startDate: Date,
  endDate: Date
): {
  maxStreak: number;
  activeDays: number;
  totalSubmissions: number;
} {
  let maxStreak = 0;
  let currentStreak = 0;
  let activeDays = 0;
  let totalSubmissions = 0;

  const cursor = new Date(startDate);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  while (cursor <= end) {
    const dateStr = formatLocalDate(cursor);
    const count = activityMap[dateStr] || 0;
    if (count > 0) {
      totalSubmissions += count;
      activeDays += 1;
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { maxStreak, activeDays, totalSubmissions };
}

/**
 * Constructs a genuine rolling 12-month contribution calendar ending on the current date.
 * Accurately aligns every month label with the actual first date of that month, never skips months,
 * supports weekday offsets at the start and end, and computes totals and streaks from the exact same dataset.
 */
export function buildRolling12MonthCalendar(options: {
  activityMap: Record<string, number>;
  acceptedMap?: Record<string, number>;
  referenceDate?: Date;
}): CalendarResult {
  const ref = options.referenceDate ? new Date(options.referenceDate) : new Date();

  // Normalize reference date to local noon
  const endDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0);
  const endDateStr = formatLocalDate(endDate);

  // A rolling 365-day period ending on current date (364 days back = 365 days total)
  // 364 % 7 === 0, so startDate has the exact same day of week as endDate!
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 364);
  startDate.setHours(12, 0, 0, 0);
  const startDateStr = formatLocalDate(startDate);
  const startDayOfWeek = startDate.getDay();

  // Week 0 begins on Sunday of the week containing startDate
  const calendarStartSunday = new Date(startDate);
  calendarStartSunday.setDate(startDate.getDate() - startDayOfWeek);
  calendarStartSunday.setHours(12, 0, 0, 0);

  const weeks: WeekData[] = [];
  const monthHeaders: MonthHeaderData[] = [];
  const seenMonths = new Set<string>();

  let sumSubmissions = 0;
  let sumAccepted = 0;
  let activeDaysCount = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  const cursor = new Date(calendarStartSunday);

  // 53 week columns (0 to 52)
  for (let w = 0; w < 53; w++) {
    const days: DayData[] = [];

    for (let d = 0; d < 7; d++) {
      const dateStr = formatLocalDate(cursor);
      const isBeforeStart = cursor < startDate;
      const isAfterEnd = cursor > endDate;
      const isInRange = !isBeforeStart && !isAfterEnd;
      const isToday = dateStr === endDateStr;

      const count = isInRange ? options.activityMap[dateStr] || 0 : 0;
      const acceptedCount = isInRange ? options.acceptedMap?.[dateStr] || 0 : 0;

      if (isInRange) {
        if (count > 0) {
          sumSubmissions += count;
          sumAccepted += acceptedCount;
          activeDaysCount++;
          currentStreak++;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }

        // Track month label alignment
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        if (!seenMonths.has(monthKey)) {
          // If cursor is on the 1st of the month, OR if this is the start of the visible range
          if (cursor.getDate() === 1 || dateStr === startDateStr) {
            monthHeaders.push({
              weekIndex: w,
              month: cursor.toLocaleString('en-US', { month: 'short' }),
              year: cursor.getFullYear(),
            });
            seenMonths.add(monthKey);
          }
        }
      }

      days.push({
        dateStr,
        formattedDate: formatTooltipDate(cursor),
        count,
        acceptedCount,
        dayOfWeek: d,
        isToday,
        isInRange,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({ weekIndex: w, days });
  }

  return {
    weeks,
    monthHeaders,
    totalSubmissions: sumSubmissions,
    totalAccepted: sumAccepted,
    activeDays: activeDaysCount,
    maxStreak,
    startDateStr,
    endDateStr,
  };
}

// Backward compatibility alias
export const build52WeekCalendar = buildRolling12MonthCalendar;
