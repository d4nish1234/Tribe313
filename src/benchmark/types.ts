import type { Timestamp } from 'firebase/firestore';

export type Level = 0 | 1 | 2 | 3;

export type PlanKey =
  | 'Foundation -> Level 1'
  | 'Level 1 -> Level 2'
  | 'Level 2 -> Level 3'
  | 'Hold Level 3';

export const PLAN_KEYS: PlanKey[] = [
  'Foundation -> Level 1',
  'Level 1 -> Level 2',
  'Level 2 -> Level 3',
  'Hold Level 3',
];

export const PLAN_LABELS: Record<PlanKey, string> = {
  'Foundation -> Level 1': 'Reach L1',
  'Level 1 -> Level 2': 'Reach L2',
  'Level 2 -> Level 3': 'Reach L3',
  'Hold Level 3': 'Keep L3',
};

export type InputKind = 'in' | 'ftin' | 'lb' | 'reps' | 'ft' | 'time' | 'loops';

/** A drawn picture for tests the photo library has nothing for. */
export type FigureKind = 'wallsit' | 'wallsit1' | 'wallsquat' | 'sled';

export interface TestDef {
  key: string;
  name: string;
  input: InputKind | string;
  unit: string | null;
  better: 'higher' | 'lower' | null;
  scored: boolean;
  logged: boolean;
  workout: string | null;
  note: string | null;
  standards: string[] | null;
  /** Prose or {L1,L2,L3}; each version interprets its own. */
  thresholds?: unknown;
  howToTest: string[];
  plans: Record<PlanKey, string[]> | null;
  photos: string[] | null;
  /** Drawn picture, used when there are no photos. */
  figure?: FigureKind;
  /** A logged part of a scored test (each leg of the one-leg wall sit): the scored test's key. */
  partOf?: string;
}

export interface GlossaryEntry {
  term: string;
  matches: string[];
  explanation: string;
  photos: string[] | null;
}

export interface Fault {
  buttonLabel: string;
  area: string;
  explanation: string;
  drills: string[];
}

export interface Explainer {
  title: string;
  text: string;
}

export interface WorkoutDef {
  name: string;
  tests: string[];
}

/** One benchmark (stored as a "session" document, one per date). */
export interface Session {
  date: string; // YYYY-MM-DD, also the document ID
  version: number;
  bodyweight: number;
  heightIn: number | null;
  results: Record<string, number | null>;
  wallSquatFaults: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BenchmarkProfile {
  name: string;
  heightIn: number | null;
  /** The 3 weekdays the member trains (`Date.getDay()`: 0 = Sunday). See src/lib/schedule.ts. */
  workoutDays?: number[];
}

export interface Assignment {
  id: string;
  text: string;
  note: string | null;
  addedBy: string;
  addedByName: string;
  createdAt?: Timestamp;
}

/**
 * A second number logged with a test, such as the weight on the bench bar.
 * A level only counts when it meets the test's condition (bodyweight or more,
 * 5 reps or more, …). Benchmarks saved before it was asked have none, and
 * count as done under the test's standard conditions.
 */
export interface Companion {
  /** Key in `results`, e.g. 'benchlb'. */
  key: string;
  /** "Weight on the bar". */
  label: string;
  /**
   * Whether a new benchmark starts with last time's value. Weights set by
   * bodyweight don't: they start at today's bodyweight, so a "Same as" result
   * isn't failed by last month's lighter bar.
   */
  carries: boolean;
  /** What's shown and saved when the member doesn't change it. */
  fallback: (bodyweight: number | null) => number | null;
  /** The grey line under it; `set` is false while it's still the fallback. */
  hint: (set: boolean) => string;
  format: (value: number) => string;
}

export interface PickerColumn {
  values: number[];
  label: string;
  /**
   * The same value in another unit, shown on the left of each row so both
   * move together (metres next to feet: "61 m ··· 200 ft").
   */
  alt?: (value: number) => string;
}

export interface PickerSpec {
  title: string;
  subtitle?: string;
  columns: PickerColumn[];
  toValue: (cols: number[]) => number;
  fromValue: (value: number) => number[];
  /** Returns true if this value should be treated as "no result" (e.g. 0:00). */
  isEmpty: (value: number) => boolean;
}

export interface BenchmarkVersion {
  version: number;
  /** Logged test keys, in the order they appear on the entry screen. */
  logOrder: string[];
  /**
   * Second numbers saved in `results` next to a test's own number (the weight
   * on the bar, the reps, the distance carried). Not charted on their own.
   */
  extraKeys: string[];
  /** The second number logged with a test, or null if the test has only one. */
  companion: (key: string) => Companion | null;
  /** Scored test keys (14 in v1). */
  scoredKeys: string[];
  tests: Record<string, TestDef>;
  workouts: WorkoutDef[];
  faults: Record<string, Fault>;
  glossary: GlossaryEntry[];
  maxScore: number;
  /** Level for a scored test, or null if the benchmark has no result for it. */
  levelFor: (key: string, s: Session) => Level | null;
  /** "Your next goal" text, or null if there's nothing to say. */
  goal: (key: string, s: Session) => string | null;
  /**
   * The three level standards for a test, with weights worked out from this
   * bodyweight and the broad jump from this height (plain wording when unknown).
   */
  standardsFor: (key: string, ctx: { bodyweight: number | null; heightIn?: number | null }) => string[] | null;
  /** The grey line under a test on the New benchmark screen, or null. */
  entryNote: (key: string, bodyweight: number | null) => string | null;
  /** Picker for a logged test key, or 'bw' / 'height'. */
  picker: (key: string) => PickerSpec;
  pickerDefault: (key: string) => number;
  explainer: (key: string, ctx?: { coachName?: string }) => Explainer;
  /** Every exercise string in the plans and drills, for coach autocomplete. */
  allExercises: () => string[];
  /** Short tips shown under "Good to know". */
  goodToKnow: { label: string; explainer: string }[];
}
