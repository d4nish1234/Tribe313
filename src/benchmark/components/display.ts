import { formatValue } from '../engine/format';
import type { BenchmarkVersion, Session } from '../types';

/** Display a scored test's result. The wall sit shows its one-leg time if logged, else both-leg. */
export function displayResult(v: BenchmarkVersion, key: string, s: Session): string | null {
  if (key === 'ws') {
    const one = s.results.ws1;
    const both = s.results.ws2;
    if (typeof one === 'number') return `${formatValue('time', one)} one leg`;
    if (typeof both === 'number') return `${formatValue('time', both)} both legs`;
    return null;
  }
  const t = v.tests[key];
  const val = s.results[key];
  if (!t || typeof val !== 'number') return null;
  return formatValue(t.input, val);
}
