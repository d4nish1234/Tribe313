/**
 * Which workout falls on which day, from the 3 weekdays a member picks.
 *
 * Days are JavaScript weekdays (`Date.getDay()`: 0 = Sunday … 6 = Saturday),
 * which is how they're stored. Weeks run Monday to Sunday: the first picked
 * day in that order gets the first workout (Leg Day), the next the second,
 * and so on. The schedule repeats every week.
 */

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Weekdays in the order the app shows them: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** How many days a member picks: one per workout. */
export const WORKOUT_DAY_COUNT = 3;

const weekPos = (day: number) => WEEK_ORDER.indexOf(day as (typeof WEEK_ORDER)[number]);

/** Valid, unique weekdays in Monday-first order. Anything else is dropped. */
export function normalizeDays(days: readonly unknown[] | null | undefined): number[] {
  const valid = (days ?? []).filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6);
  return [...new Set(valid)].sort((a, b) => weekPos(a) - weekPos(b));
}

/**
 * Tap a day on or off. Picking a 4th day is refused (`full`): unpick one
 * first, so a member never loses a day they didn't mean to change.
 */
export function toggleDay(days: readonly number[], day: number): { days: number[]; full: boolean } {
  if (days.includes(day)) return { days: normalizeDays(days.filter((d) => d !== day)), full: false };
  if (days.length >= WORKOUT_DAY_COUNT) return { days: normalizeDays(days), full: true };
  return { days: normalizeDays([...days, day]), full: false };
}

/**
 * Weekday → workout name. Empty until exactly as many days as workouts are
 * picked, so a half-made choice never shows a lopsided week.
 */
export function weekSchedule(days: readonly number[], workoutNames: readonly string[]): Map<number, string> {
  const ordered = normalizeDays(days);
  if (ordered.length !== workoutNames.length || ordered.length === 0) return new Map();
  return new Map(ordered.map((d, i) => [d, workoutNames[i]]));
}

/** Picked days that come straight after another picked day (Sunday → Monday counts). */
export function backToBackDays(days: readonly number[]): [number, number][] {
  const set = new Set(normalizeDays(days));
  const pairs: [number, number][] = [];
  for (const d of WEEK_ORDER) {
    const next = (d + 1) % 7;
    if (set.has(d) && set.has(next) && set.size > 1) pairs.push([d, next]);
  }
  return pairs;
}

/**
 * The weeks of a month for a calendar grid, Monday first. Days outside the
 * month are null. `month` is 0-based like `Date`.
 */
export function monthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(weekPos(first.getDay())).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
