import { getVersion } from '../registry';
import type { BenchmarkVersion, Level, Session } from '../types';

export interface SessionScore {
  version: BenchmarkVersion;
  levels: Record<string, Level | null>;
  score: number;
  maxScore: number;
  /** Lowest level across all scored tests, or null while any is missing ("In progress"). */
  overall: Level | null;
  tested: number;
  total: number;
}

/** Score a benchmark with the rules of its own version. Null if this build doesn't know the version. */
export function scoreSession(s: Session): SessionScore | null {
  const v = getVersion(s.version);
  if (!v) return null;
  const levels: Record<string, Level | null> = {};
  let score = 0;
  let tested = 0;
  let min: Level = 3;
  for (const key of v.scoredKeys) {
    const l = v.levelFor(key, s);
    levels[key] = l;
    if (l !== null) {
      tested++;
      score += l;
      if (l < min) min = l;
    }
  }
  const total = v.scoredKeys.length;
  return {
    version: v,
    levels,
    score,
    maxScore: v.maxScore,
    overall: tested === total ? min : null,
    tested,
    total,
  };
}

/** Sort benchmarks newest first. */
export function newestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Benchmarks this build can read, newest first. */
export function knownSessions(sessions: Session[]): Session[] {
  return newestFirst(sessions).filter((s) => getVersion(s.version) !== null);
}

/**
 * The latest known result for each test key across the member's benchmarks,
 * and the first one. Used for "First / Latest" progress tables.
 */
export function firstAndLatest(sessions: Session[]): {
  first: Session | null;
  latest: Session | null;
} {
  const known = knownSessions(sessions);
  return { latest: known[0] ?? null, first: known.length > 1 ? known[known.length - 1] : null };
}

/**
 * Scored test keys ordered weakest first. An untested test is treated as
 * Foundation (it gets the "Reach L1" plan) but ranks after tested Foundation
 * tests, since we know those are weak.
 */
export function weakestFirst(s: Session, keys?: string[]): string[] {
  const v = getVersion(s.version);
  if (!v) return [];
  const list = keys ?? v.scoredKeys;
  const rank = (k: string) => {
    const l = v.levelFor(k, s);
    return l === null ? 0.5 : l;
  };
  return list
    .map((k, i) => ({ k, i, r: rank(k) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.k);
}
