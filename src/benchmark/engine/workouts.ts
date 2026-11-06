import { PLAN_KEYS, type BenchmarkVersion, type Level, type PlanKey, type Session } from '../types';
import { weakestFirst } from './score';

export interface WorkoutBlock {
  testKey: string;
  testName: string;
  level: Level | null;
  plan: PlanKey;
  exercises: string[];
}

export interface Workout {
  name: string;
  blocks: WorkoutBlock[];
}

export function planForLevel(level: Level | null): PlanKey {
  return PLAN_KEYS[level ?? 0];
}

/** Hold-plan lines are generic ("Keep its main exercise…"), so they only make sense under their own test. */
const HOLD = 'Hold Level 3';

/**
 * Build the three weekly workouts from the member's latest benchmark.
 * Weakest test first; it gets 3 exercises, the others 2. An exercise already
 * listed earlier in the same workout is skipped.
 * With no benchmark yet, every test uses the "Reach L1" plan in listed order.
 */
export function buildWorkouts(v: BenchmarkVersion, latest: Session | null): Workout[] {
  return v.workouts.map((w) => {
    const ordered = latest && latest.version === v.version ? weakestFirst(latest, w.tests) : w.tests;
    const seen = new Set<string>();
    const blocks: WorkoutBlock[] = [];
    ordered.forEach((key, i) => {
      const t = v.tests[key];
      if (!t?.plans) return;
      const level = latest && latest.version === v.version ? v.levelFor(key, latest) : null;
      const plan = planForLevel(level);
      const want = i === 0 ? 3 : 2;
      const exercises: string[] = [];
      for (const ex of t.plans[plan]) {
        if (exercises.length >= want) break;
        const dedupeKey = plan === HOLD ? `${key}:${ex}` : ex.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        exercises.push(ex);
      }
      if (exercises.length) blocks.push({ testKey: key, testName: t.name, level, plan, exercises });
    });
    return { name: w.name, blocks };
  });
}

/** Which workout a test belongs to, for the "Part of your Leg Day workout" footer. */
export function workoutFor(v: BenchmarkVersion, key: string): string | null {
  return v.workouts.find((w) => w.tests.includes(key))?.name ?? null;
}
