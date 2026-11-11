/**
 * Benchmark v1: the original 313 Tribe spec (14 scored tests, 42 points).
 *
 * `data.json` is a verbatim copy of 313-benchmark-data.json and must never be
 * edited after release. Benchmarks saved as v1 are scored with these rules
 * forever. To change tests, thresholds or plans, add versions/v2 instead.
 */
import type {
  BenchmarkVersion,
  Explainer,
  Fault,
  GlossaryEntry,
  Level,
  PickerSpec,
  Session,
  TestDef,
} from '../../types';
import { formatDuration, formatFtIn, formatTime } from '../../engine/format';
import raw from './data.json';

const data = raw as unknown as {
  testDayOrder: string[];
  maxScore: number;
  workouts: Record<string, { exampleDay: string; tests: string[] }>;
  tests: TestDef[];
  wallSquatFaults: Record<string, Fault>;
  glossary: GlossaryEntry[];
  explainers: Record<string, Explainer>;
  pickerDefaults: Record<string, number>;
};

const tests: Record<string, TestDef> = Object.fromEntries(data.tests.map((t) => [t.key, t]));
const scoredKeys = data.tests.filter((t) => t.scored).map((t) => t.key);

type Thresholds = [number, number, number];

function levelFromThresholds(v: number, t: Thresholds, better: 'higher' | 'lower'): Level {
  if (better === 'higher') {
    if (v >= t[2]) return 3;
    if (v >= t[1]) return 2;
    if (v >= t[0]) return 1;
    return 0;
  }
  if (v <= t[2]) return 3;
  if (v <= t[1]) return 2;
  if (v <= t[0]) return 1;
  return 0;
}

function has(v: number | null | undefined): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/** Absolute thresholds for a test in this benchmark, or null if they can't be computed. */
function thresholdsFor(key: string, s: Session): Thresholds | null {
  switch (key) {
    case 'splat':
      return [12, 6, 2];
    case 'dl':
      return has(s.bodyweight) ? [1.5 * s.bodyweight, 2 * s.bodyweight, 2.5 * s.bodyweight] : null;
    case 'bj':
      return has(s.heightIn) ? [s.heightIn, s.heightIn + 12, s.heightIn + 24] : null;
    default: {
      const th = tests[key]?.thresholds as unknown;
      if (th && typeof th === 'object' && 'L1' in (th as object)) {
        const o = th as { L1: number; L2: number; L3: number };
        return [o.L1, o.L2, o.L3];
      }
      return null;
    }
  }
}

function levelFor(key: string, s: Session): Level | null {
  if (key === 'ws') {
    const both = s.results.ws2;
    const one = s.results.ws1;
    if (!has(both) && !has(one)) return null;
    if (has(one) && one >= 60) return 3;
    if (has(one) && one >= 30) return 2;
    if (has(both) && both >= 60) return 1;
    return 0;
  }
  const v = s.results[key];
  if (!has(v)) return null;
  const t = tests[key];
  const th = thresholdsFor(key, s);
  if (!t || !th || !t.better) return null;
  return levelFromThresholds(v, th, t.better);
}

function goal(key: string, s: Session): string | null {
  const level = levelFor(key, s);
  if (level === null) return 'Do this test to see your goal.';
  if (level === 3) return 'You’re at Level 3. Keep it there.';

  if (key === 'ws') {
    const both = s.results.ws2 ?? 0;
    const one = s.results.ws1 ?? 0;
    if (level === 0) {
      const gap = 60 - both;
      return `Hold the wall sit for 1 min on both legs.${both > 0 ? ` That’s ${formatDuration(gap)} more.` : ''}`;
    }
    const target = level === 1 ? 30 : 60;
    return `Hold the wall sit for ${formatDuration(target)} on one leg (your weaker leg).${
      one > 0 ? ` That’s ${formatDuration(target - one)} more.` : ''
    }`;
  }

  const v = s.results[key] as number;
  const th = thresholdsFor(key, s)!;
  const raw = th[level];

  switch (key) {
    case 'splat': {
      return `Pass with your toes ${raw} in from the wall. That’s ${v - raw} in closer.`;
    }
    case 'dl': {
      const target = Math.ceil(raw / 5) * 5;
      return `Lift ${target} lb for 5 reps. That’s ${target - v} lb more.`;
    }
    case 'bj': {
      const target = Math.ceil(raw);
      return `Jump ${formatFtIn(target)}. That’s ${target - v} in further.`;
    }
    case 'bench':
      return `Do ${raw} reps with the bar at your bodyweight. That’s ${raw - v} more.`;
    case 'pull':
    case 'hrp':
      return `Do ${raw} reps. That’s ${raw - v} more.`;
    case 'carry':
      return `Carry for ${raw} ft. That’s ${raw - v} ft more.`;
    case 'hang':
    case 'plank':
      return `Hold for ${formatDuration(raw)}. That’s ${formatDuration(raw - v)} more.`;
    case 'run':
    case 'bike':
    case 'sledpush':
    case 'sledpull':
      return `Finish in ${formatTime(raw)} or less. That’s ${formatDuration(v - raw)} faster.`;
    default:
      return null;
  }
}

function range(from: number, to: number, step = 1): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
}

function nearest(values: number[], v: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - v) < Math.abs(values[best] - v)) best = i;
  }
  return values[best];
}

function single(title: string, values: number[], label: string, subtitle?: string): PickerSpec {
  return {
    title,
    subtitle,
    columns: [{ values, label }],
    toValue: ([a]) => a,
    fromValue: (v) => [nearest(values, v)],
    isEmpty: () => false,
  };
}

function feetInches(title: string, feet: number[], subtitle?: string): PickerSpec {
  const inches = range(0, 11);
  return {
    title,
    subtitle,
    columns: [
      { values: feet, label: 'ft' },
      { values: inches, label: 'in' },
    ],
    toValue: ([ft, inch]) => ft * 12 + inch,
    fromValue: (v) => [nearest(feet, Math.floor(v / 12)), Math.round(v % 12)],
    isEmpty: (v) => v === 0,
  };
}

function picker(key: string): PickerSpec {
  if (key === 'bw') return single('Bodyweight', range(100, 400), 'lb', 'Weigh in at the gym');
  if (key === 'height') return feetInches('Height', range(4, 7), 'Used for the broad jump');
  const t = tests[key];
  const title = t?.name ?? key;
  const subtitle = t?.note ?? undefined;
  switch (t?.input) {
    case 'time': {
      const mins = range(0, 9);
      const secs = range(0, 59);
      return {
        title,
        subtitle,
        columns: [
          { values: mins, label: 'min' },
          { values: secs, label: 'sec' },
        ],
        toValue: ([m, sec]) => m * 60 + sec,
        fromValue: (v) => [Math.min(9, Math.floor(v / 60)), Math.round(v % 60)],
        isEmpty: (v) => v === 0,
      };
    }
    case 'reps':
      return single(title, range(0, 100), 'reps', subtitle);
    case 'lb':
      return single(title, range(45, 800, 5), 'lb', subtitle);
    case 'ft':
      return single(title, range(0, 600, 10), 'ft', subtitle);
    case 'in':
      return single(title, range(0, 24), 'in', subtitle);
    case 'ftin':
      return feetInches(title, range(0, 12), subtitle);
    default:
      return single(title, range(0, 100), '', subtitle);
  }
}

/**
 * Display-time copy fixes. data.json stays verbatim; these replace explainers
 * whose wording assumed a single coach, a fixed test-day schedule or the old
 * web layout.
 */
function explainer(key: string, ctx?: { coachName?: string }): Explainer {
  const coach = ctx?.coachName || 'your coach';
  const Coach = ctx?.coachName || 'Your coach';
  switch (key) {
    case 'howlog':
      return {
        title: 'Doing a benchmark',
        text: 'Pick the date and enter your bodyweight. Weigh in at the gym. A new benchmark starts with your last results, marked “Same as” and greyed out. Do the tests in any order. After each one, tap its box and scroll to your result. Did the test and got the same result? Tap it and press Done to keep it. Skipped a test? Leave it, or tap it and choose Clear. Tap Save at the bottom. You can save as often as you like and it updates this benchmark. Not sure how a test works? Tap its picture.',
      };
    case 'height':
      return {
        title: 'Why height?',
        text: 'The broad jump target is based on your height. Level 1 is jumping your own height. It’s filled in from last time, so only change it if it’s wrong.',
      };
    case 'levels':
      return {
        title: 'How levels work',
        text: 'Every test has three levels. Each level is harder than the one before. Foundation: not at Level 1 yet. Everyone starts somewhere. Level 1, 2, 3: you passed that standard. The three bars next to each test show your level. Two filled bars means Level 2. Gold bars mean Level 3.',
      };
    case 'score':
      return {
        title: 'Your score',
        text: 'Each test gives you points: Foundation = 0, Level 1 = 1, Level 2 = 2, Level 3 = 3. 14 tests × 3 points = 42 points maximum. Watch this number go up with each benchmark.',
      };
    case 'week':
      return {
        title: 'Your 3 workouts',
        text: 'You train 3 times a week. Each workout is already built for you from your latest benchmark. Leg Day: legs, jumping and mobility. Upper Body Day: pushing and pulling. Grip & Cardio Day: grip, core and fitness. Leave a rest day between them. Monday, Wednesday, Friday works well, but any 3 days with a day off in between is fine. Open the workout, warm up, then do the exercises top to bottom. Your weakest test comes first, while you’re fresh. About 50–60 minutes. When you do a new benchmark, the workouts update by themselves.',
      };
    case 'between':
      return {
        title: 'Between benchmarks',
        text: 'Don’t test your maxes in training. Train hard but leave 1–2 reps in the tank. Save your all-out effort for benchmark day.',
      };
    case 'coachinfo':
      return {
        title: `Extra work from ${coach}`,
        text: `${Coach} added these exercises just for you, on top of your normal plan. Do them as written. Tap any underlined word to see how it’s done. If something doesn’t feel right, tell ${coach}.`,
      };
    case 'coachhow':
      return {
        title: 'Assigning exercises',
        text: 'Type an exercise. Start typing to pick from the app’s exercise list, or write your own. Add a note if it helps, like “every morning” or “before Leg Day”. Tap Add. It shows up on his Training tab right away. Only coaches can see this screen. Each brother only sees his own exercises.',
      };
    case 'coachgrid':
      return {
        title: 'Reading the group table',
        text: 'One row per brother, showing his latest benchmark. F = Foundation (not at Level 1 yet). L1, L2, L3 = level reached. — = skipped that test. Swipe sideways to see every test. Tap a name to assign him exercises. Progress shows one brother’s results over time. Export PDF shares every benchmark from every brother.',
      };
    case 'faults':
      return {
        title: 'What stopped you?',
        text: 'If you couldn’t get closer to the wall, pick what went wrong. The Training tab adds drills to fix it.',
      };
    case 'sets':
      return {
        title: 'Sets and reps',
        text: '“3×8” means do the exercise 8 times in a row (8 reps), rest, and repeat until you’ve done 3 rounds (3 sets).',
      };
    default:
      return data.explainers[key] ?? { title: key, text: '' };
  }
}

function allExercises(): string[] {
  const set = new Set<string>();
  for (const t of data.tests) {
    if (!t.plans) continue;
    for (const [k, items] of Object.entries(t.plans)) {
      if (k === 'Hold Level 3') continue;
      items.forEach((i) => set.add(i));
    }
  }
  for (const f of Object.values(data.wallSquatFaults)) f.drills.forEach((d) => set.add(d));
  return [...set].sort((a, b) => a.localeCompare(b));
}

export const v1: BenchmarkVersion = {
  version: 1,
  logOrder: data.testDayOrder,
  scoredKeys,
  tests,
  workouts: Object.entries(data.workouts).map(([name, w]) => ({ name, tests: w.tests })),
  faults: data.wallSquatFaults,
  glossary: data.glossary,
  maxScore: data.maxScore,
  levelFor,
  goal,
  picker,
  pickerDefault: (key) => data.pickerDefaults[key] ?? 0,
  explainer,
  allExercises,
  goodToKnow: [
    { label: 'Rest a day between workouts', explainer: 'week' },
    { label: 'Warm up for 10 minutes first', explainer: 'warmup' },
    { label: 'Easy cardio on 1–2 rest days', explainer: 'cardio' },
    { label: 'Every 4th week, go lighter', explainer: 'deload' },
    { label: 'Save max efforts for benchmark day', explainer: 'between' },
  ],
};
