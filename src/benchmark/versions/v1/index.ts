/**
 * Benchmark v1: 14 scored tests, 42 points.
 *
 * Until the app launches, v1 is still being refined and `data.json` may be
 * edited. Once members have saved real benchmarks it is frozen: benchmarks
 * saved as v1 are scored with these rules forever, and changing tests,
 * thresholds or plans means adding versions/v2.
 *
 * One change was made after the first real benchmarks, without a v2: bench,
 * deadlift, farmer's carry and sled gained a second number (COMPANIONS). A
 * benchmark without it scores as before, apart from the 5 lb allowance.
 */
import type {
  BenchmarkVersion,
  Companion,
  Explainer,
  Fault,
  GlossaryEntry,
  Level,
  PickerSpec,
  Session,
  TestDef,
} from '../../types';
import { LEVEL_SHORT, formatDuration, formatFeet, formatFtIn, formatTime, ftToM } from '../../engine/format';
import { ceilTo5, floorTo5, perHand } from '../../engine/weights';
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

/**
 * Wording changed after benchmarks were saved, when bench, deadlift, farmer's
 * carry and sled started logging a second number (see COMPANIONS). The data
 * keeps the original text.
 */
const REWORDED: Record<string, Partial<TestDef>> = {
  bench: {
    name: 'Bench press',
    howToTest: [
      'Load the bar to your bodyweight, rounded down to the nearest 5 lb.',
      'Lower to your chest, press to straight arms. No bouncing.',
      'A spotter must stand behind you every set.',
      'Log how many clean reps you did without racking the bar, and the weight on the bar. A lighter bar doesn’t count toward a level.',
    ],
  },
  dl: {
    name: 'Trap bar deadlift',
    howToTest: [
      'Stand inside the trap bar, grab the handles, chest up, back flat.',
      'Stand up tall, then lower with control. That’s 1 rep.',
      'Warm up with lighter sets, adding weight until 5 reps is hard but your form stays good.',
      'Log the heaviest weight you lifted and how many reps in a row. It counts toward a level at 5 reps or more.',
    ],
  },
  farmer: {
    howToTest: [
      'Mark out 200 ft (61 m). The lane is marked every 50 ft (15 m).',
      'Pick two dumbbells of the same weight, half the total in each hand.',
      'Stand tall and walk at a steady pace without putting them down.',
      'Log the total (both hands added up) and how far you carried it, in 50 ft (15 m) steps. It counts toward a level at 200 ft (61 m).',
    ],
  },
  sled: {
    howToTest: [
      'Set two cones 50 ft apart. Load the sled so sled plus plates weigh about your bodyweight.',
      'Start the clock. Push the sled from the first cone to the second, hands on the tall handles.',
      'Grab the straps, walk backward and drag it back to the first cone. That’s 1 loop.',
      'Keep going until 1 minute is up. Log the loops you finished. A half loop doesn’t count.',
      'Enter the sled weight you used. A sled lighter than your bodyweight doesn’t count toward a level.',
    ],
  },
};

const tests: Record<string, TestDef> = Object.fromEntries(
  data.tests.map((t) => [t.key, { ...t, ...REWORDED[t.key] }]),
);
// Scored tests in logging order; a logged part (each wall sit leg) stands for its scored test.
const scoredKeys = [
  ...new Set(data.testDayOrder.map((k) => tests[k]?.partOf ?? k).filter((k) => tests[k]?.scored)),
];
for (const t of data.tests) if (t.scored && !scoredKeys.includes(t.key)) scoredKeys.push(t.key);

/**
 * Plates come in 5 lb steps, so a weight up to 5 lb under a target still
 * counts: a 187 lb member benching 185 lb is "at bodyweight".
 */
const ALLOWANCE = 5;

/** The farmer's carry distance, in feet, for a weight to count. */
const CARRY_FT = 200;
const DEADLIFT_REPS = 5;

const atBodyweight = (bw: number | null) => (hasBw(bw) ? floorTo5(bw) : null);
const lb = (n: number) => `${n} lb`;

/**
 * The second number logged with a test. Each level is a fixed target: the
 * level only counts when this number meets the test's condition too.
 */
const COMPANIONS: Record<string, Companion> = {
  bench: {
    key: 'benchlb',
    label: 'Weight on the bar',
    carries: false,
    fallback: atBodyweight,
    hint: (set) =>
      set ? 'Your bodyweight or more counts' : 'Your bodyweight. Change it if you used a different weight.',
    format: lb,
  },
  dl: {
    key: 'dlreps',
    label: 'Reps',
    carries: true,
    fallback: () => DEADLIFT_REPS,
    hint: () => '5 reps or more counts',
    format: (n) => plural(n, 'rep'),
  },
  farmer: {
    key: 'farmerft',
    label: 'Distance',
    carries: true,
    fallback: () => CARRY_FT,
    hint: () => `${formatFeet(CARRY_FT)} or more counts`,
    format: formatFeet,
  },
  sled: {
    key: 'sledlb',
    label: 'Sled weight',
    carries: false,
    fallback: atBodyweight,
    hint: (set) =>
      set ? 'Sled plus plates. Your bodyweight or more counts' : 'Your bodyweight. Change it if the sled was different.',
    format: lb,
  },
};

/**
 * Whether a test's second number meets its condition. A benchmark saved
 * before it was asked has none, and was done under the standard conditions.
 */
function companionOk(key: string, s: Session): boolean {
  const c = COMPANIONS[key];
  const x = c ? s.results[c.key] : null;
  if (!has(x)) return true;
  switch (key) {
    case 'bench':
    case 'sled':
      return !hasBw(s.bodyweight) || x >= s.bodyweight - ALLOWANCE;
    case 'dl':
      return x >= DEADLIFT_REPS;
    case 'farmer':
      return x >= CARRY_FT;
    default:
      return true;
  }
}

/** Farmer's carry: total weight carried 200 ft, as a share of bodyweight per level. */
const FARMER = [0.75, 1, 1.5] as const;
const DEADLIFT = [1.5, 2, 2.5] as const;

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

function hasBw(bw: number | null | undefined): bw is number {
  return has(bw) && bw > 0;
}

function times(m: readonly [number, number, number], bw: number): Thresholds {
  return [m[0] * bw, m[1] * bw, m[2] * bw];
}

/** Absolute thresholds for a test in this benchmark, or null if they can't be computed. */
function thresholdsFor(key: string, s: Pick<Session, 'bodyweight' | 'heightIn'>): Thresholds | null {
  switch (key) {
    case 'splat':
      return [12, 6, 2];
    case 'dl':
      return hasBw(s.bodyweight) ? times(DEADLIFT, s.bodyweight) : null;
    case 'farmer':
      return hasBw(s.bodyweight) ? times(FARMER, s.bodyweight) : null;
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

/** The one-leg wall sit is scored on the weaker leg, so it needs both legs. */
function weakerLeg(s: Session): number | null {
  const l = s.results.ws1l;
  const r = s.results.ws1r;
  return has(l) && has(r) ? Math.min(l, r) : null;
}

const WS1: Thresholds = [60, 90, 120];

function levelFor(key: string, s: Session): Level | null {
  if (key === 'ws1') {
    const weaker = weakerLeg(s);
    return weaker === null ? null : levelFromThresholds(weaker, WS1, 'higher');
  }
  const v = s.results[key];
  if (!has(v)) return null;
  const t = tests[key];
  const th = thresholdsFor(key, s);
  if (!t || !th || !t.better) return null;
  if (!companionOk(key, s)) return 0;
  // Weight targets allow for 5 lb plate steps.
  const allowed: Thresholds =
    key === 'dl' || key === 'farmer' ? [th[0] - ALLOWANCE, th[1] - ALLOWANCE, th[2] - ALLOWANCE] : th;
  return levelFromThresholds(v, allowed, t.better);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function goal(key: string, s: Session): string | null {
  if (key === 'ws1') {
    const l = s.results.ws1l;
    const r = s.results.ws1r;
    if (!has(l) || !has(r)) {
      return has(l) || has(r) ? 'Log both legs to see your level.' : 'Do this test to see your goal.';
    }
  }
  const level = levelFor(key, s);
  if (level === null) return 'Do this test to see your goal.';
  if (level === 3) return 'You’re at Level 3. Keep it there.';

  if (key === 'ws1') {
    const weaker = weakerLeg(s)!;
    const target = WS1[level];
    const which = s.results.ws1l === s.results.ws1r ? 'each leg' : `your ${weaker === s.results.ws1l ? 'left' : 'right'} leg`;
    return `Hold for ${formatDuration(target)} on each leg. That’s ${formatDuration(target - weaker)} more on ${which}.`;
  }

  const v = s.results[key] as number;
  const th = thresholdsFor(key, s)!;
  const raw = th[level];

  if (!companionOk(key, s)) {
    const x = s.results[COMPANIONS[key].key] as number;
    switch (key) {
      case 'bench':
        return `Do ${raw} reps with ${floorTo5(s.bodyweight)} lb on the bar. ${x} lb is under your bodyweight, so it doesn’t count yet.`;
      case 'sled':
        return `Do ${plural(raw, 'loop')} in 1 minute with ${floorTo5(s.bodyweight)} lb on the sled. ${x} lb is under your bodyweight, so it doesn’t count yet.`;
      case 'dl':
        return `Lift ${ceilTo5(raw)} lb for 5 reps. ${plural(x, 'rep')} doesn’t count yet.`;
      case 'farmer': {
        const hand = perHand(raw);
        return `Carry ${hand * 2} lb for ${formatFeet(CARRY_FT)}. ${formatFeet(x)} doesn’t count yet.`;
      }
    }
  }

  switch (key) {
    case 'splat': {
      return `Pass with your toes ${raw} in from the wall. That’s ${v - raw} in closer.`;
    }
    case 'dl': {
      const target = ceilTo5(raw);
      return `Lift ${target} lb for 5 reps. That’s ${target - v} lb more.`;
    }
    case 'farmer': {
      const hand = perHand(raw);
      return `Carry ${hand * 2} lb for 200 ft (${hand} lb in each hand). That’s ${hand * 2 - v} lb more.`;
    }
    case 'bj': {
      const target = Math.ceil(raw);
      return `Jump ${formatFtIn(target)}. That’s ${target - v} in further.`;
    }
    case 'bench':
      return `Do ${raw} reps with ${floorTo5(s.bodyweight)} lb on the bar. That’s ${raw - v} more.`;
    case 'pull':
    case 'hrp':
      return `Do ${raw} reps. That’s ${raw - v} more.`;
    case 'sled':
      return `Do ${plural(raw, 'loop')} in 1 minute. That’s ${raw - v} more.`;
    case 'hang':
    case 'plank':
    case 'ws2':
      return `Hold for ${formatDuration(raw)}. That’s ${formatDuration(raw - v)} more.`;
    case 'run':
    case 'bike':
      return `Finish in ${formatTime(raw)} or less. That’s ${formatDuration(v - raw)} faster.`;
    default:
      return null;
  }
}

/** Level standards with this member's numbers filled in where they depend on bodyweight or height. */
function standardsFor(key: string, ctx: { bodyweight: number | null; heightIn?: number | null }): string[] | null {
  const plain = tests[key]?.standards ?? (tests[key]?.partOf ? tests[tests[key].partOf!]?.standards : null) ?? null;
  const bw = ctx.bodyweight;
  switch (key) {
    case 'dl':
      return hasBw(bw) ? DEADLIFT.map((m) => `${ceilTo5(m * bw)} lb for 5 reps (${m}× your bodyweight)`) : plain;
    case 'farmer':
      return hasBw(bw)
        ? FARMER.map((m, i) => {
            const hand = perHand(m * bw);
            return `${hand * 2} lb in total for 200 ft, ${hand} lb in each hand (${plain?.[i] ?? ''})`;
          })
        : plain;
    case 'bench':
      return hasBw(bw) && plain ? plain.map((s) => `${s} at ${floorTo5(bw)} lb`) : plain;
    case 'sled':
      return hasBw(bw) && plain ? plain.map((s) => `${s} with ${floorTo5(bw)} lb`) : plain;
    case 'bj':
      return has(ctx.heightIn)
        ? [0, 12, 24].map((extra, i) => `${formatFtIn(ctx.heightIn! + extra)} (${plain?.[i] ?? ''})`)
        : plain;
    default:
      return plain;
  }
}

/** The grey line under each test on the New benchmark screen. */
function entryNote(key: string, bodyweight: number | null): string | null {
  const t = tests[key];
  if (!t) return null;
  switch (key) {
    case 'dl':
      return hasBw(bodyweight)
        ? `5 reps or more · ${DEADLIFT.map((m, i) => `${LEVEL_SHORT[i + 1]} ${ceilTo5(m * bodyweight)}`).join(' · ')} lb`
        : '5 reps or more. Add your bodyweight to see your targets.';
    case 'farmer':
      return hasBw(bodyweight)
        ? `Total of both hands, 200 ft · ${FARMER.map((m, i) => `${LEVEL_SHORT[i + 1]} ${perHand(m * bodyweight) * 2}`).join(' · ')} lb`
        : `${t.note}. Add your bodyweight to see your targets.`;
    case 'bench':
      return hasBw(bodyweight) ? `Reps with ${floorTo5(bodyweight)} lb or more on the bar (your bodyweight)` : t.note;
    default:
      return t.note;
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

function single(
  title: string,
  values: number[],
  label: string,
  subtitle?: string,
  alt?: (v: number) => string,
): PickerSpec {
  return {
    title,
    subtitle,
    columns: [{ values, label, alt }],
    toValue: ([a]) => a,
    fromValue: (v) => [nearest(values, v)],
    isEmpty: () => false,
  };
}

/** A distance in feet shows metres beside it on the same wheel row. */
const metres = (ft: number) => `${ftToM(ft)} m`;

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
  if (key === 'sledlb') return single('Sled weight', range(50, 800, 5), 'lb', 'Sled plus plates');
  if (key === 'benchlb') return single('Weight on the bar', range(45, 600, 5), 'lb', 'Bench press');
  if (key === 'dlreps') return single('Reps in a row', range(1, 15), 'reps', 'Trap bar deadlift');
  if (key === 'farmerft') return single('Distance', range(50, 600, 50), 'ft', 'Farmer’s carry', metres);
  const t = tests[key];
  const title = t?.name ?? key;
  const subtitle = (key === 'dl' ? 'Heaviest weight lifted' : t?.note) ?? undefined;
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
      return single(title, range(key === 'farmer' ? 20 : 45, 800, 5), 'lb', subtitle);
    case 'loops':
      return single(title, range(0, 20), 'loops', subtitle);
    case 'ft':
      return single(title, range(0, 600, 10), 'ft', subtitle, metres);
    case 'in':
      return single(title, range(0, 24), 'in', subtitle);
    case 'ftin':
      return feetInches(title, range(0, 12), subtitle);
    default:
      return single(title, range(0, 100), '', subtitle);
  }
}

/**
 * Display-time copy fixes for explainers whose wording assumed a single coach,
 * a fixed test-day schedule or the old web layout.
 */
function explainer(key: string, ctx?: { coachName?: string }): Explainer {
  const coach = ctx?.coachName || 'your coach';
  const Coach = ctx?.coachName || 'Your coach';
  switch (key) {
    case 'bw':
      return {
        title: 'Why bodyweight?',
        text: 'Four tests are set by what you weigh: farmer’s carry, deadlift, bench press and the sled. The weights in your workouts are worked out from it too. Weigh in on test day so your targets are accurate. A weight up to 5 lb under a target still counts, because plates go up in 5 lb steps.',
      };
    case 'howlog':
      return {
        title: 'Doing a benchmark',
        text: 'Pick the date and enter your bodyweight. Weigh in at the gym. A new benchmark starts with your last results, marked “Same as” and greyed out. Do the tests in any order. After each one, tap its box and scroll to your result. Some tests have a second number under them, like the weight on the bar or the reps. It starts at the usual amount; change it if you did something different. Did the test and got the same result? Tap it and press Done to keep it. Skipped a test? Leave it, or tap it and choose Clear. Tap Save at the bottom. You can save as often as you like and it updates this benchmark. Not sure how a test works? Tap its picture.',
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
  extraKeys: Object.values(COMPANIONS).map((c) => c.key),
  companion: (key) => COMPANIONS[key] ?? null,
  scoredKeys,
  tests,
  workouts: Object.entries(data.workouts).map(([name, w]) => ({ name, tests: w.tests })),
  faults: data.wallSquatFaults,
  glossary: data.glossary,
  maxScore: data.maxScore,
  levelFor,
  goal,
  standardsFor,
  entryNote,
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
