import { formatValue } from '../engine/format';
import type { BenchmarkVersion, Session } from '../types';

/** Display a scored test's result. The one-leg wall sit shows both legs. */
export function displayResult(v: BenchmarkVersion, key: string, s: Session): string | null {
  const parts = Object.values(v.tests).filter((t) => t.partOf === key);
  if (parts.length) {
    const logged = parts.filter((t) => typeof s.results[t.key] === 'number');
    if (!logged.length) return null;
    return parts
      .map((t) => `${legLabel(t.name)} ${formatValue(t.input, s.results[t.key])}`)
      .join(' · ');
  }
  const t = v.tests[key];
  const val = s.results[key];
  if (!t || typeof val !== 'number') return null;
  const c = v.companion(key);
  const extra = c ? s.results[c.key] : null;
  return typeof extra === 'number'
    ? `${formatValue(t.input, val)} · ${c!.format(extra)}`
    : formatValue(t.input, val);
}

/** "Wall sit, left leg" → "Left". */
function legLabel(name: string): string {
  const m = name.match(/(left|right)/i);
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : name;
}
