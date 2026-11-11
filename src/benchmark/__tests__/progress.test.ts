import { v1 } from '../versions/v1';
import {
  bodyweightPoints,
  changeSinceFirst,
  formatChange,
  layoutPoints,
  prefillFrom,
  scorePoints,
  testPoints,
} from '../engine/progress';
import type { Session } from '../types';

const s = (date: string, results: Session['results'], extra: Partial<Session> = {}): Session => ({
  date,
  version: 1,
  bodyweight: 200,
  heightIn: 70,
  results,
  wallSquatFaults: [],
  ...extra,
});

// Newest first, like the sessions listener returns them.
const sessions = [
  s('2026-11-09', { dl: 340, run: 215 }, { bodyweight: 195 }),
  s('2026-09-01', { dl: 300, run: 240, splat: 8 }, { wallSquatFaults: ['ankle'] }),
  s('2026-07-01', { dl: 280 }, { version: 99 }), // a version this build doesn't know
];

describe('series', () => {
  it('lists results oldest first, skipping benchmarks without that test or with an unknown version', () => {
    expect(testPoints(sessions, 'dl', v1.tests.dl)).toEqual([
      { date: '2026-09-01', value: 300 },
      { date: '2026-11-09', value: 340 },
    ]);
    expect(testPoints(sessions, 'splat', v1.tests.splat)).toEqual([{ date: '2026-09-01', value: 8 }]);
  });

  it('scores each benchmark and says how many tests it had', () => {
    const pts = scorePoints(sessions);
    expect(pts.map((p) => p.date)).toEqual(['2026-09-01', '2026-11-09']);
    expect(pts[1]).toMatchObject({ max: 42, tested: 2, total: 14 });
  });

  it('tracks bodyweight', () => {
    expect(bodyweightPoints(sessions).map((p) => p.value)).toEqual([200, 195]);
  });
});

describe('changeSinceFirst', () => {
  const pts = (a: number, b: number) => [
    { date: '2026-09-01', value: a },
    { date: '2026-11-09', value: b },
  ];
  it('higher is better, lower is better, or neither', () => {
    expect(changeSinceFirst(pts(300, 340), 'higher')).toEqual({ diff: 40, direction: 'better' });
    expect(changeSinceFirst(pts(240, 215), 'lower')).toEqual({ diff: -25, direction: 'better' });
    expect(changeSinceFirst(pts(8, 10), 'lower')).toEqual({ diff: 2, direction: 'worse' });
    expect(changeSinceFirst(pts(5, 5), 'higher')).toEqual({ diff: 0, direction: 'same' });
    expect(changeSinceFirst(pts(200, 195), null)).toEqual({ diff: -5, direction: null });
  });
  it('needs two results', () => {
    expect(changeSinceFirst([{ date: '2026-09-01', value: 1 }], 'higher')).toBeNull();
  });
});

describe('formatChange', () => {
  it('uses each test’s unit', () => {
    expect(formatChange('lb', 40)).toBe('+40 lb');
    expect(formatChange('time', -25)).toBe('−25 sec');
    expect(formatChange('time', 90)).toBe('+1 min 30 sec');
    expect(formatChange('reps', 1)).toBe('+1 rep');
    expect(formatChange('ftin', 6)).toBe('+6 in');
  });
});

describe('prefillFrom', () => {
  it('takes each test’s latest result and where it came from', () => {
    const pre = prefillFrom(sessions, v1);
    expect(pre.results).toEqual({ dl: 340, run: 215, splat: 8 });
    expect(pre.from).toEqual({ dl: '2026-11-09', run: '2026-11-09', splat: '2026-09-01' });
    expect(pre.wallSquatFaults).toEqual(['ankle']); // they go with the wall squat result
  });
  it('is empty with no benchmarks', () => {
    expect(prefillFrom([], v1)).toEqual({ results: {}, from: {}, wallSquatFaults: [] });
  });
});

describe('layoutPoints', () => {
  const box = { width: 120, height: 60, padX: 10, padY: 10 };
  it('spaces points by date and scales values into the box', () => {
    const pts = layoutPoints(
      [
        { date: '2026-01-01', value: 0 },
        { date: '2026-01-04', value: 10 },
        { date: '2026-01-11', value: 20 },
      ],
      box,
      [0, 20],
    );
    expect(pts.map((p) => Math.round(p.x))).toEqual([10, 40, 110]);
    expect(pts.map((p) => p.y)).toEqual([50, 30, 10]);
  });
  it('centres a single point', () => {
    expect(layoutPoints([{ date: '2026-01-01', value: 5 }], box)).toEqual([{ x: 60, y: 30 }]);
  });
});
