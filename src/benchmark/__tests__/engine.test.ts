import { v1 } from '../versions/v1';
import { getVersion, LATEST_VERSION } from '../registry';
import { scoreSession, weakestFirst } from '../engine/score';
import { buildWorkouts } from '../engine/workouts';
import { explainSets, tokenize } from '../engine/explain';
import { formatFtIn, formatTime, formatValue } from '../engine/format';
import { buildReportHtml } from '../engine/report';
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

  it('reps / distance / hold: higher is better', () => {
    expect(lvl('bench', { bench: 9 })).toBe(0);
    expect(lvl('bench', { bench: 15 })).toBe(2);
    expect(lvl('pull', { pull: 20 })).toBe(3);
    expect(lvl('carry', { carry: 250 })).toBe(2);
    expect(lvl('plank', { plank: 179 })).toBe(2);
  });

  it('timed races: lower is better', () => {
    expect(lvl('run', { run: 196 })).toBe(0);
    expect(lvl('run', { run: 195 })).toBe(1);
    expect(lvl('bike', { bike: 50 })).toBe(3);
    expect(lvl('sledpull', { sledpull: 24 })).toBe(2);
  });

  it('wall sit combines both entries', () => {
    expect(lvl('ws', {})).toBeNull();
    expect(lvl('ws', { ws2: 45 })).toBe(0);
    expect(lvl('ws', { ws2: 60 })).toBe(1);
    expect(lvl('ws', { ws2: 60, ws1: 30 })).toBe(2);
    expect(lvl('ws', { ws1: 60 })).toBe(3);
    expect(lvl('ws', { ws2: 90, ws1: 20 })).toBe(1);
  });

  it('skipped tests have no level', () => {
    expect(lvl('pull', { pull: null })).toBeNull();
    expect(lvl('pull', {})).toBeNull();
  });
});

describe('scoreSession', () => {
  it('is "In progress" until all 14 tests are done', () => {
    const s = scoreSession(base({ bench: 15, pull: 10 }))!;
    expect(s.score).toBe(3);
    expect(s.tested).toBe(2);
    expect(s.overall).toBeNull();
  });

  it('overall = lowest level when complete', () => {
    const all = {
      splat: 2, bj: 94, dl: 500, bench: 20, pull: 20, carry: 300, hang: 120, hrp: 40,
      plank: 180, ws2: 90, ws1: 60, sledpush: 15, sledpull: 18, run: 165, bike: 50,
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

  it('wall sit goals step through both-leg then one-leg', () => {
    expect(v1.goal('ws', base({ ws2: 45 }))).toContain('1 min on both legs. That’s 15 sec more.');
    expect(v1.goal('ws', base({ ws2: 60, ws1: 20 }))).toContain('30 sec on one leg');
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
    // At Level 1, both broad jump (L1→L2) and sled push (L2→L3) plans include "Broad jump 5×3, full rest".
    const s = base({ bj: 82, sledpush: 20, splat: 2, dl: 500, ws1: 60 });
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

describe('format', () => {
  it('formats values', () => {
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
    expect(v.logOrder).toEqual([
      'splat', 'bj', 'dl', 'bench', 'pull', 'carry', 'hang', 'hrp', 'plank',
      'ws2', 'ws1', 'sledpush', 'sledpull', 'run', 'bike',
    ]);
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
