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

export type InputKind = 'in' | 'ftin' | 'lb' | 'reps' | 'ft' | 'time';

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
}

export interface Assignment {
  id: string;
  text: string;
  note: string | null;
  addedBy: string;
  addedByName: string;
  createdAt?: Timestamp;
}

export interface PickerColumn {
  values: number[];
  label: string;
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
  /** Picker for a logged test key, or 'bw' / 'height'. */
  picker: (key: string) => PickerSpec;
  pickerDefault: (key: string) => number;
  explainer: (key: string, ctx?: { coachName?: string }) => Explainer;
  /** Every exercise string in the plans and drills, for coach autocomplete. */
  allExercises: () => string[];
  /** Short tips shown under "Good to know". */
  goodToKnow: { label: string; explainer: string }[];
}
