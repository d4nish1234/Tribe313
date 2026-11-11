import { getVersion } from '../registry';
import type { BenchmarkVersion, Session, TestDef } from '../types';
import { formatDuration } from './format';
import { knownSessions, scoreSession } from './score';

/**
 * What the Progress screen draws: a member's benchmarks turned into series,
 * oldest first, plus the change since their first result.
 */

export interface Point {
  date: string;
  value: number;
}

export interface ScorePoint extends Point {
  max: number;
  /** Tests with a result, of `total`. A benchmark with tests missing scores low for that reason alone. */
  tested: number;
  total: number;
}

/** Overall score per benchmark, oldest first. */
export function scorePoints(sessions: Session[]): ScorePoint[] {
  return knownSessions(sessions)
    .reverse()
    .map((s) => {
      const sc = scoreSession(s)!;
      return { date: s.date, value: sc.score, max: sc.maxScore, tested: sc.tested, total: sc.total };
    });
}

/**
 * One logged test's results, oldest first. Only benchmarks whose version logs
 * this test the same way count, so a later version that changes a test's unit
 * never ends up on the same line.
 */
export function testPoints(sessions: Session[], key: string, t: TestDef): Point[] {
  return knownSessions(sessions)
    .reverse()
    .filter((s) => getVersion(s.version)?.tests[key]?.input === t.input)
    .flatMap((s) => {
      const value = s.results?.[key];
      return typeof value === 'number' ? [{ date: s.date, value }] : [];
    });
}

export function bodyweightPoints(sessions: Session[]): Point[] {
  return knownSessions(sessions)
    .reverse()
    .filter((s) => typeof s.bodyweight === 'number')
    .map((s) => ({ date: s.date, value: s.bodyweight }));
}

export type Direction = 'better' | 'worse' | 'same';

/** Latest minus first, and whether that's an improvement. Null with fewer than 2 points. */
export function changeSinceFirst(
  points: Point[],
  better: 'higher' | 'lower' | null,
): { diff: number; direction: Direction | null } | null {
  if (points.length < 2) return null;
  const diff = points[points.length - 1].value - points[0].value;
  if (diff === 0) return { diff, direction: 'same' };
  if (!better) return { diff, direction: null };
  const up = diff > 0;
  return { diff, direction: up === (better === 'higher') ? 'better' : 'worse' };
}

/** A signed change in a test's own unit: "+40 lb", "−25 sec", "+1 rep", "+6 in". */
export function formatChange(input: TestDef['input'], diff: number): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const n = Math.abs(diff);
  switch (input) {
    case 'time':
      return `${sign}${formatDuration(n)}`;
    case 'reps':
      return `${sign}${n} rep${n === 1 ? '' : 's'}`;
    case 'lb':
      return `${sign}${n} lb`;
    case 'ft':
      return `${sign}${n} ft`;
    case 'in':
    case 'ftin':
      return `${sign}${n} in`;
    default:
      return `${sign}${n}`;
  }
}

/**
 * Starting values for a new benchmark: each test's most recent result from
 * earlier benchmarks on the same version, and the date it came from (the
 * form shows "Same as Nov 9" until it's changed or confirmed). Wall squat
 * faults come with the wall squat result they were logged with.
 */
export function prefillFrom(
  sessions: Session[],
  v: BenchmarkVersion,
): { results: Record<string, number>; from: Record<string, string>; wallSquatFaults: string[] } {
  const same = knownSessions(sessions).filter((s) => s.version === v.version);
  const results: Record<string, number> = {};
  const from: Record<string, string> = {};
  let wallSquatFaults: string[] = [];
  for (const key of v.logOrder) {
    const s = same.find((x) => typeof x.results?.[key] === 'number');
    if (!s) continue;
    results[key] = s.results[key] as number;
    from[key] = s.date;
    if (key === 'splat') wallSquatFaults = [...(s.wallSquatFaults ?? [])];
  }
  return { results, from, wallSquatFaults };
}

/**
 * Screen positions for a line of points: x by date (benchmarks aren't evenly
 * spaced), y by value within `domain`. A single point sits in the middle.
 */
export function layoutPoints(
  points: Point[],
  box: { width: number; height: number; padX: number; padY: number },
  domain?: [number, number],
): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const days = points.map((p) => Date.parse(`${p.date}T00:00:00Z`) / 86_400_000);
  const d0 = days[0];
  const span = days[days.length - 1] - d0;
  const values = points.map((p) => p.value);
  let [lo, hi] = domain ?? [Math.min(...values), Math.max(...values)];
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const w = box.width - box.padX * 2;
  const h = box.height - box.padY * 2;
  return points.map((p, i) => ({
    x: box.padX + (span === 0 ? w / 2 : ((days[i] - d0) / span) * w),
    y: box.padY + h - ((p.value - lo) / (hi - lo)) * h,
  }));
}
