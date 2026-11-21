import { ceilTo5, floorTo5, perHand, roundTo5, withWeights } from '../engine/weights';
import { v1 } from '../versions/v1';

describe('rounding', () => {
  it('rounds to 5 lb steps', () => {
    expect(roundTo5(148)).toBe(150);
    expect(roundTo5(147)).toBe(145);
    expect(ceilTo5(271.5)).toBe(275);
    expect(floorTo5(187)).toBe(185);
    expect(perHand(137.25)).toBe(70);
    expect(perHand(200)).toBe(100);
  });
});

describe('withWeights', () => {
  it('adds pounds after each bodyweight-relative weight', () => {
    expect(withWeights('Farmer’s carry at 80% of bodyweight 4×100 ft', 185)).toBe(
      'Farmer’s carry at 80% of bodyweight (150 lb) 4×100 ft',
    );
    expect(withWeights('Bench at 85–90% of bodyweight 5×6', 200)).toBe(
      'Bench at 85–90% of bodyweight (170–180 lb) 5×6',
    );
    expect(withWeights('Backward sled drag at half bodyweight 5×50 ft', 200)).toBe(
      'Backward sled drag at half bodyweight (100 lb) 5×50 ft',
    );
    expect(withWeights('Sled push at bodyweight 5×50 ft, 90 sec rest', 187)).toBe(
      'Sled push at bodyweight (185 lb) 5×50 ft, 90 sec rest',
    );
    expect(withWeights('Load the bar to your bodyweight, rounded down', 187)).toBe(
      'Load the bar to your bodyweight (185 lb), rounded down',
    );
    expect(withWeights('1.5× your bodyweight', 183)).toBe('1.5× your bodyweight (275 lb)');
  });

  it('leaves text alone without a bodyweight, and never annotates twice', () => {
    const line = 'Sled push at 75% of bodyweight 6×50 ft';
    expect(withWeights(line, null)).toBe(line);
    expect(withWeights(line, undefined)).toBe(line);
    const once = withWeights(line, 200);
    expect(withWeights(once, 200)).toBe(once);
  });

  it('leaves lines without a weight unchanged', () => {
    expect(withWeights('Dead hang 3×30 sec', 200)).toBe('Dead hang 3×30 sec');
    expect(withWeights('Bodyweight squats 3×15', 200)).toBe('Bodyweight squats 3×15');
  });

  it('no plan line or how-to step mentions a fixed example person', () => {
    for (const t of Object.values(v1.tests)) {
      const lines = [...t.howToTest, ...Object.values(t.plans ?? {}).flat()];
      for (const line of lines) expect(line).not.toMatch(/\d+ lb man/);
    }
  });
});
