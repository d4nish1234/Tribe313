/**
 * Recurring events: which dates a series lands on, and what time that is.
 *
 * Shared by the Cloud Functions (which create the events) and the app (which
 * previews them), so both always agree. The app imports it via
 * src/lib/recurrence.ts. No imports: plain TypeScript only, so it builds in both.
 *
 * Dates are calendar days in Toronto, written 'YYYY-MM-DD'; times are 'HH:mm'
 * on the wall clock there. "8:00 AM every Saturday" stays 8:00 AM across the
 * clock changes.
 */

export const TIME_ZONE = 'America/Toronto';

/** How far ahead real events exist. Enough to RSVP ahead, short enough not to flood the list. */
export const WINDOW_DAYS = 35;

export type Repeat = 'weekly' | 'biweekly' | 'monthly';

export interface SeriesRule {
  repeat: Repeat;
  /** First occurrence (Toronto date). Also fixes the weekday. */
  startDate: string;
  /** 'HH:mm', Toronto wall clock. */
  timeOfDay: string;
  /** Monthly only: 1–4 for the first to fourth weekday of the month, -1 for the last. */
  monthlyWeek?: number | null;
  /** Last date it may land on (inclusive), or none. */
  endDate?: string | null;
  /** Dates an admin removed; they never come back. */
  skipDates?: string[];
}

// ---------- calendar dates ----------

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINALS: Record<string, string> = {
  '1': 'first',
  '2': 'second',
  '3': 'third',
  '4': 'fourth',
  '-1': 'last',
};

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

function key(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Days since 1970-01-01 for a calendar date (no time zone involved). */
function dayNumber(date: string): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function fromDayNumber(n: number): string {
  const t = new Date(n * DAY_MS);
  return key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  return (dayNumber(date) + 4) % 7; // 1970-01-01 was a Thursday
}

export function weekdayName(date: string): string {
  return WEEKDAYS[weekdayOf(date)];
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Which weekday-of-the-month a date is: 1–5 (the 5th only exists in some months). */
export function weekOfMonth(date: string): number {
  return Math.ceil(parts(date)[2] / 7);
}

/** True when there's no later same weekday in that month. */
export function isLastWeekdayOfMonth(date: string): boolean {
  const [y, m, d] = parts(date);
  return d + 7 > daysInMonth(y, m);
}

/** The monthly week a start date implies: its own week, or "last" for a 5th weekday. */
export function defaultMonthlyWeek(date: string): number {
  const w = weekOfMonth(date);
  return w === 5 ? -1 : w;
}

/** The `week`th `weekday` of a month (-1 = last), as a date. */
function nthWeekday(y: number, m: number, weekday: number, week: number): string {
  if (week === -1) {
    const last = key(y, m, daysInMonth(y, m));
    return addDays(last, -((weekdayOf(last) - weekday + 7) % 7));
  }
  const first = key(y, m, 1);
  return addDays(first, ((weekday - weekdayOf(first) + 7) % 7) + (week - 1) * 7);
}

/** Every date the series lands on between `from` and `to` (inclusive). */
export function occurrenceDates(rule: SeriesRule, from: string, to: string): string[] {
  const start = rule.startDate;
  const lo = from > start ? from : start;
  const hi = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (lo > hi) return [];
  const skip = new Set(rule.skipDates ?? []);
  const out: string[] = [];

  if (rule.repeat === 'monthly') {
    const weekday = weekdayOf(start);
    const week = rule.monthlyWeek ?? defaultMonthlyWeek(start);
    let [y, m] = parts(lo);
    const [hy, hm] = parts(hi);
    while (y < hy || (y === hy && m <= hm)) {
      const d = nthWeekday(y, m, weekday, week);
      if (d >= lo && d <= hi) out.push(d);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  } else {
    const step = rule.repeat === 'biweekly' ? 14 : 7;
    const gap = dayNumber(lo) - dayNumber(start);
    let d = addDays(start, Math.ceil(gap / step) * step);
    while (d <= hi) {
      out.push(d);
      d = addDays(d, step);
    }
  }
  return out.filter((d) => !skip.has(d));
}

// ---------- Toronto wall clock <-> instants ----------

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** The wall clock in `tz` at instant `ms`. */
function wallClock(ms: number, tz: string) {
  const p: Record<string, number> = {};
  for (const { type, value } of formatter(tz).formatToParts(new Date(ms))) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, min: p.minute, s: p.second };
}

/** How far `tz` is ahead of UTC at instant `ms`, in ms. */
function offsetAt(ms: number, tz: string): number {
  const w = wallClock(ms, tz);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s) - (ms - (ms % 1000));
}

/** The instant (ms) of a wall-clock date and time in `tz`. */
export function zonedTime(date: string, time: string, tz = TIME_ZONE): number {
  const [y, m, d] = parts(date);
  const [h, min] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min);
  // Two passes settle the offset on either side of a clock change.
  const first = asUtc - offsetAt(asUtc, tz);
  return asUtc - offsetAt(first, tz);
}

/** The calendar date in `tz` at instant `ms`. */
export function dateIn(ms: number, tz = TIME_ZONE): string {
  const w = wallClock(ms, tz);
  return key(w.y, w.m, w.d);
}

/** 'HH:mm' in `tz` at instant `ms`. */
export function timeIn(ms: number, tz = TIME_ZONE): string {
  const w = wallClock(ms, tz);
  return `${String(w.h).padStart(2, '0')}:${String(w.min).padStart(2, '0')}`;
}

// ---------- what the generator works from ----------

export interface Occurrence {
  date: string;
  startsAt: number;
}

/** Occurrences still to come within the window: the events that should exist right now. */
export function upcomingOccurrences(
  rule: SeriesRule,
  now: number,
  days = WINDOW_DAYS,
  tz = TIME_ZONE,
): Occurrence[] {
  const today = dateIn(now, tz);
  return occurrenceDates(rule, today, addDays(today, days))
    .map((date) => ({ date, startsAt: zonedTime(date, rule.timeOfDay, tz) }))
    .filter((o) => o.startsAt > now);
}

export interface ExistingOccurrence {
  id: string;
  /** The series date this event was made for. */
  date: string;
}

/**
 * Bring a series' future events in line with its rule. `existing` is its
 * events that haven't started yet. Returns which dates to create, which events
 * to update with the series' current details, and which no longer fit (the
 * caller removes those unless someone has RSVPed).
 */
export function planSync(wanted: Occurrence[], existing: ExistingOccurrence[]) {
  const wantedDates = new Map(wanted.map((o) => [o.date, o]));
  const have = new Set(existing.map((e) => e.date));
  return {
    create: wanted.filter((o) => !have.has(o.date)),
    update: existing
      .filter((e) => wantedDates.has(e.date))
      .map((e) => ({ id: e.id, ...wantedDates.get(e.date)! })),
    remove: existing.filter((e) => !wantedDates.has(e.date)).map((e) => e.id),
  };
}

/** The id of a series' event on a date, so a retry can never make a second one. */
export function occurrenceId(seriesId: string, date: string): string {
  return `${seriesId}_${date}`;
}

// ---------- wording ----------

/** "Every Saturday", "Every 2 weeks on Saturday", "Monthly on the last Saturday". */
export function describeRepeat(rule: Pick<SeriesRule, 'repeat' | 'startDate' | 'monthlyWeek'>): string {
  const day = weekdayName(rule.startDate);
  if (rule.repeat === 'weekly') return `Every ${day}`;
  if (rule.repeat === 'biweekly') return `Every 2 weeks on ${day}`;
  const week = rule.monthlyWeek ?? defaultMonthlyWeek(rule.startDate);
  return `Monthly on the ${ORDINALS[String(week)]} ${day}`;
}

/** "8:00 AM" from 'HH:mm'. */
export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
