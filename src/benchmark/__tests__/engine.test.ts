import { v1 } from '../versions/v1';
import { getVersion, LATEST_VERSION } from '../registry';
import { scoreSession, weakestFirst } from '../engine/score';
import { buildWorkouts } from '../engine/workouts';
import { explainSets, tokenize } from '../engine/explain';
import { formatFtIn, formatTime, formatValue } from '../engine/format';
import { buildReportHtml } from '../engine/report';
import { displayResult } from '../components/display';
import type { Session } from '../types';

const base = (results: Session['results'], extra: Partial<Session> = {}): Session => ({
  date: '2026-11-01',
  version: 1,
  bodyweight: 200,
  heightIn: 70,
  results,
  wallSquatFaults: [],
  ...extra,
});

describe('registry', () => {
  it('knows v1 and returns null for unknown versions', () => {
    expect(LATEST_VERSION).toBe(1);
    expect(getVersion(1)).toBe(v1);
    expect(getVersion(2)).toBeNull();
    expect(getVersion(undefined)).toBeNull();
  });

  it('v1 has 14 scored tests worth 42 points and logs 15 entries', () => {
    expect(v1.scoredKeys).toHaveLength(14);
    expect(v1.maxScore).toBe(42);
    expect(v1.logOrder).toHaveLength(15);
    expect(v1.logOrder[0]).toBe('splat');
  });
});

describe('v1 scoring', () => {
  const lvl = (key: string, results: Session['results'], extra?: Partial<Session>) =>
    v1.levelFor(key, base(results, extra));

  it('wall squat: lower is better', () => {
    expect(lvl('splat', { splat: 14 })).toBe(0);
    expect(lvl('splat', { splat: 12 })).toBe(1);
    expect(lvl('splat', { splat: 6 })).toBe(2);
    expect(lvl('splat', { splat: 0 })).toBe(3);
  });

  it('deadlift uses that benchmark’s bodyweight', () => {
    expect(lvl('dl', { dl: 275 })).toBe(0);
    expect(lvl('dl', { dl: 300 })).toBe(1);
    expect(lvl('dl', { dl: 400 })).toBe(2);
    expect(lvl('dl', { dl: 500 })).toBe(3);
    expect(lvl('dl', { dl: 300 }, { bodyweight: 250 })).toBe(0);
  });

  it('broad jump uses height', () => {
    expect(lvl('bj', { bj: 69 })).toBe(0);
    expect(lvl('bj', { bj: 70 })).toBe(1);
    expect(lvl('bj', { bj: 82 })).toBe(2);
    expect(lvl('bj', { bj: 94 })).toBe(3);
    expect(lvl('bj', { bj: 94 }, { heightIn: null })).toBeNull();
  });

  it('reps / hold: higher is better', () => {
    expect(lvl('bench', { bench: 4 })).toBe(0);
    expect(lvl('bench', { bench: 5 })).toBe(1);
    expect(lvl('bench', { bench: 10 })).toBe(2);
    expect(lvl('bench', { bench: 15 })).toBe(3);
    expect(lvl('pull', { pull: 0 })).toBe(0);
    expect(lvl('pull', { pull: 9 })).toBe(0);
    expect(lvl('pull', { pull: 20 })).toBe(3);
    expect(lvl('plank', { plank: 179 })).toBe(2);
  });

  it('farmer’s carry: total weight for 200 ft, set by that benchmark’s bodyweight', () => {
    // 200 lb: 150 / 200 / 300 lb total.
    expect(lvl('farmer', { farmer: 145 })).toBe(0);
    expect(lvl('farmer', { farmer: 150 })).toBe(1);
    expect(lvl('farmer', { farmer: 200 })).toBe(2);
    expect(lvl('farmer', { farmer: 300 })).toBe(3);
    expect(lvl('farmer', { farmer: 200 }, { bodyweight: 250 })).toBe(1);
  });

  it('sled: loops in 1 minute, 0 is Foundation', () => {
    expect(lvl('sled', { sled: 0 })).toBe(0);
    expect(lvl('sled', { sled: 1 })).toBe(1);
    expect(lvl('sled', { sled: 2 })).toBe(1);
    expect(lvl('sled', { sled: 3 })).toBe(2);
    expect(lvl('sled', { sled: 4 })).toBe(2);
    expect(lvl('sled', { sled: 5 })).toBe(3);
    expect(lvl('sled', { sled: 9 })).toBe(3);
    // The sled weight is kept for the record and never changes the level.
    expect(lvl('sled', { sled: 3, sledlb: 50 })).toBe(2);
  });

  it('timed races: lower is better', () => {
    expect(lvl('run', { run: 196 })).toBe(0);
    expect(lvl('run', { run: 195 })).toBe(1);
    expect(lvl('bike', { bike: 50 })).toBe(3);
  });

  it('wall sits: both legs, and one leg scored on the weaker leg', () => {
    expect(lvl('ws2', { ws2: 59 })).toBe(0);
    expect(lvl('ws2', { ws2: 60 })).toBe(1);
    expect(lvl('ws2', { ws2: 90 })).toBe(2);
    expect(lvl('ws2', { ws2: 120 })).toBe(3);
    expect(lvl('ws1', {})).toBeNull();
    expect(lvl('ws1', { ws1l: 120 })).toBeNull(); // needs both legs
    expect(lvl('ws1', { ws1l: 120, ws1r: 89 })).toBe(1);
    expect(lvl('ws1', { ws1l: 95, ws1r: 120 })).toBe(2);
    expect(lvl('ws1', { ws1l: 120, ws1r: 120 })).toBe(3);
    expect(lvl('ws1', { ws1l: 30, ws1r: 120 })).toBe(0);
  });

  it('skipped tests have no level', () => {
    expect(lvl('pull', { pull: null })).toBeNull();
    expect(lvl('pull', {})).toBeNull();
  });
});

describe('scoreSession', () => {
  it('is "In progress" until all 14 tests are done', () => {
    const s = scoreSession(base({ bench: 10, pull: 10 }))!;
    expect(s.score).toBe(3);
    expect(s.tested).toBe(2);
    expect(s.overall).toBeNull();
  });

  it('overall = lowest level when complete', () => {
    const all = {
      splat: 2, bj: 94, farmer: 300, sled: 5, dl: 500, bench: 15, pull: 20, hrp: 40,
      hang: 120, plank: 180, ws2: 120, ws1l: 120, ws1r: 125, run: 165, bike: 50,
    };
    const full = scoreSession(base(all))!;
    expect(full.score).toBe(42);
    expect(full.overall).toBe(3);
    const oneWeak = scoreSession(base({ ...all, pull: 12 }))!;
    expect(oneWeak.overall).toBe(1);
    expect(oneWeak.score).toBe(40);
  });

  it('returns null for a version this build does not know', () => {
    expect(scoreSession(base({ pull: 10 }, { version: 2 }))).toBeNull();
  });
});

describe('goals', () => {
  it('deadlift goal rounds up to 5 lb and shows the gap', () => {
    expect(v1.goal('dl', base({ dl: 275 }))).toBe('Lift 300 lb for 5 reps. That’s 25 lb more.');
    // 183 lb: 275 ≥ 274.5 is Level 1; Level 2 needs 366, rounded up to 370.
    expect(v1.goal('dl', base({ dl: 275 }, { bodyweight: 183 }))).toBe('Lift 370 lb for 5 reps. That’s 95 lb more.');
  });

  it('timed goals say how much faster', () => {
    expect(v1.goal('run', base({ run: 210 }))).toBe('Finish in 3:15 or less. That’s 15 sec faster.');
  });

  it('wall sit goals', () => {
    expect(v1.goal('ws2', base({ ws2: 45 }))).toBe('Hold for 1 min. That’s 15 sec more.');
    expect(v1.goal('ws1', base({ ws1l: 70, ws1r: 50 }))).toBe(
      'Hold for 1 min on each leg. That’s 10 sec more on your right leg.',
    );
    expect(v1.goal('ws1', base({ ws1l: 70 }))).toBe('Log both legs to see your level.');
    expect(v1.goal('ws1', base({}))).toBe('Do this test to see your goal.');
  });

  it('weight goals use this benchmark’s bodyweight', () => {
    // 200 lb: Level 2 is 200 lb in total, 100 lb in each hand.
    expect(v1.goal('farmer', base({ farmer: 160 }))).toBe(
      'Carry 200 lb for 200 ft (100 lb in each hand). That’s 40 lb more.',
    );
    // 183 lb: Level 1 is 137.25 lb, so 70 lb in each hand.
    expect(v1.goal('farmer', base({ farmer: 100 }, { bodyweight: 183 }))).toBe(
      'Carry 140 lb for 200 ft (70 lb in each hand). That’s 40 lb more.',
    );
    expect(v1.goal('bench', base({ bench: 3 }, { bodyweight: 187 }))).toBe(
      'Do 5 reps with 185 lb on the bar. That’s 2 more.',
    );
    expect(v1.goal('sled', base({ sled: 1 }))).toBe('Do 3 loops in 1 minute. That’s 2 more.');
  });

  it('level 3 and untested', () => {
    expect(v1.goal('pull', base({ pull: 25 }))).toContain('Level 3');
    expect(v1.goal('pull', base({}))).toBe('Do this test to see your goal.');
  });
});

describe('workouts', () => {
  it('before any benchmark, every test uses Reach L1 and the weakest-first rule picks 3 then 2', () => {
    const w = buildWorkouts(v1, null);
    expect(w.map((x) => x.name)).toEqual(['Leg Day', 'Upper Body Day', 'Grip & Cardio Day']);
    for (const workout of w) {
      expect(workout.blocks[0].exercises.length).toBe(3);
      workout.blocks.slice(1).forEach((b) => expect(b.exercises.length).toBeLessThanOrEqual(2));
      workout.blocks.forEach((b) => expect(b.plan).toBe('Foundation -> Level 1'));
    }
  });

  it('orders by weakest and picks the plan for each level', () => {
    const s = base({ bench: 20, pull: 5, hrp: 30 });
    const upper = buildWorkouts(v1, s).find((w) => w.name === 'Upper Body Day')!;
    expect(upper.blocks.map((b) => b.testKey)).toEqual(['pull', 'hrp', 'bench']);
    expect(upper.blocks[0].plan).toBe('Foundation -> Level 1');
    expect(upper.blocks[1].plan).toBe('Level 2 -> Level 3');
    expect(upper.blocks[2].plan).toBe('Hold Level 3');
  });

  it('removes duplicate exercises within a workout', () => {
    const s = base({ bj: 82, sled: 3, splat: 2, dl: 500, ws2: 120, ws1l: 60, ws1r: 60 });
    const leg = buildWorkouts(v1, s).find((w) => w.name === 'Leg Day')!;
    const all = leg.blocks.flatMap((b) => b.exercises.map((e) => e.toLowerCase()));
    const nonHold = leg.blocks.filter((b) => b.plan !== 'Hold Level 3').flatMap((b) => b.exercises);
    expect(new Set(nonHold).size).toBe(nonHold.length);
    expect(all.length).toBeGreaterThan(0);
  });

  it('untested tests rank after tested Foundation tests', () => {
    expect(weakestFirst(base({ hrp: 5 }), ['bench', 'pull', 'hrp'])).toEqual(['hrp', 'bench', 'pull']);
  });
});

describe('explain', () => {
  const g = v1.glossary;

  it('matches the longest glossary phrase first', () => {
    const spans = tokenize('Heavy trap bar deadlift 5×3', g);
    expect(spans[0]).toMatchObject({ kind: 'term', text: 'Heavy trap bar deadlift' });
    expect(spans.find((s) => s.kind === 'sets')).toMatchObject({ text: '5×3' });
  });

  it('matches case-insensitively and on whole words only', () => {
    const spans = tokenize('Broad jump and stick it 5×2', g);
    expect(spans.filter((s) => s.kind === 'term').map((s) => s.text)).toEqual(['Broad jump', 'stick it']);
    expect(tokenize('Druckers', g).every((s) => s.kind === 'text')).toBe(true);
  });

  it('explains N×M patterns in plain words', () => {
    expect(explainSets('3×8')!.explanation).toBe(
      'Do this 3 times (3 sets), 8 reps each time. Rest 1–2 minutes between sets.',
    );
    expect(explainSets('4×30 sec')!.explanation).toContain('hold for 30 seconds each time');
    expect(explainSets('2×10 each')!.explanation).toContain('on each side');
    expect(explainSets('3×8 each leg')!.explanation).toContain('on each leg');
    expect(explainSets('4 × max')!.explanation).toContain('as many reps as you can');
  });

  it('every plan line tokenizes without losing text', () => {
    for (const t of Object.values(v1.tests)) {
      if (!t.plans) continue;
      for (const lines of Object.values(t.plans)) {
        for (const line of lines) {
          expect(tokenize(line, g).map((s) => s.text).join('')).toBe(line);
        }
      }
    }
  });
});

describe('standards and notes', () => {
  it('fills in weights and height when known', () => {
    expect(v1.standardsFor('dl', { bodyweight: 185 })).toEqual([
      '280 lb (1.5× your bodyweight)',
      '370 lb (2× your bodyweight)',
      '465 lb (2.5× your bodyweight)',
    ]);
    expect(v1.standardsFor('farmer', { bodyweight: 200 })![0]).toBe(
      '150 lb in total, 75 lb in each hand (75% of your bodyweight)',
    );
    expect(v1.standardsFor('bench', { bodyweight: 187 })![0]).toBe('5 reps at 185 lb');
    expect(v1.standardsFor('bj', { bodyweight: null, heightIn: 70 })![0]).toBe('5′ 10″ (Your height)');
    expect(v1.standardsFor('dl', { bodyweight: null })).toEqual(v1.tests.dl.standards);
  });

  it('each wall sit leg shows the one-leg standards', () => {
    expect(v1.standardsFor('ws1l', { bodyweight: 200 })).toEqual(v1.tests.ws1.standards);
  });

  it('entry notes show targets for the weighed tests', () => {
    expect(v1.entryNote('dl', 200)).toBe('Heaviest for 5 reps · L1 300 · L2 400 · L3 500 lb');
    expect(v1.entryNote('farmer', 200)).toBe('Total of both hands, 200 ft · L1 150 · L2 200 · L3 300 lb');
    expect(v1.entryNote('bench', 200)).toBe('Reps with 200 lb on the bar (your bodyweight)');
    expect(v1.entryNote('dl', null)).toContain('Add your bodyweight');
    expect(v1.entryNote('pull', 200)).toBeNull();
  });
});

describe('format', () => {
  it('formats values', () => {
    expect(formatValue('loops', 1)).toBe('1 loop');
    expect(formatValue('loops', 4)).toBe('4 loops');
    expect(formatTime(193)).toBe('3:13');
    expect(formatFtIn(70)).toBe('5′ 10″');
    expect(formatValue('reps', 12)).toBe('12 reps');
    expect(formatValue('ft', 250)).toBe('250 ft');
    expect(formatValue('time', null)).toBe('—');
  });
});

describe('versioning', () => {
  it('a v1 benchmark renders v1’s rows in v1’s order regardless of the latest version', () => {
    const s = base({ pull: 10 });
    const v = getVersion(s.version)!;
    // Distance, then strength and reps, then holds, then cardio; the wall squat first.
    expect(v.logOrder).toEqual([
      'splat', 'bj', 'farmer', 'sled', 'dl', 'bench', 'pull', 'hrp',
      'hang', 'plank', 'ws2', 'ws1l', 'ws1r', 'run', 'bike',
    ]);
    expect(v.scoredKeys).toEqual([
      'splat', 'bj', 'farmer', 'sled', 'dl', 'bench', 'pull', 'hrp',
      'hang', 'plank', 'ws2', 'ws1', 'run', 'bike',
    ]);
  });

  it('every scored test is in a workout and has plans; every logged test has a picture', () => {
    const inWorkouts = v1.workouts.flatMap((w) => w.tests);
    for (const k of v1.scoredKeys) {
      expect(inWorkouts).toContain(k);
      expect(v1.tests[k].plans).not.toBeNull();
    }
    for (const k of v1.logOrder) {
      const t = v1.tests[k];
      expect(Boolean(t.photos?.length) || Boolean(t.figure)).toBe(true);
    }
  });
});

describe('displayResult', () => {
  it('shows both legs of the one-leg wall sit', () => {
    expect(displayResult(v1, 'ws1', base({ ws1l: 65, ws1r: 50 }))).toBe('Left 1:05 · Right 0:50');
    expect(displayResult(v1, 'ws1', base({ ws1l: 65 }))).toBe('Left 1:05 · Right —');
    expect(displayResult(v1, 'ws1', base({}))).toBeNull();
    expect(displayResult(v1, 'sled', base({ sled: 3 }))).toBe('3 loops');
  });
});

describe('report', () => {
  it('includes every benchmark and member', () => {
    const html = buildReportHtml({
      title: '313 Benchmark',
      generatedOn: '2026-11-04',
      includeGroupTable: true,
      members: [
        { name: 'Ali <A>', heightIn: 70, sessions: [base({ pull: 10 }), base({ pull: 12 }, { date: '2026-12-01' })] },
        { name: 'Bilal', heightIn: null, sessions: [] },
      ],
    });
    expect(html).toContain('Ali &lt;A&gt;');
    expect(html).toContain('2026-11-01');
    expect(html).toContain('2026-12-01');
    expect(html).toContain('No benchmarks yet');
  });
});
