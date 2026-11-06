import type { TestDef } from '../types';

export function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 70 → 5′ 10″ */
export function formatFtIn(inches: number): string {
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches % 12);
  return `${ft}′ ${inch}″`;
}

/** Plain-English duration: 90 → "1 min 30 sec", 45 → "45 sec". */
export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
}

export function formatValue(input: TestDef['input'], value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  switch (input) {
    case 'time':
      return formatTime(value);
    case 'reps':
      return `${value} rep${value === 1 ? '' : 's'}`;
    case 'lb':
      return `${value} lb`;
    case 'ft':
      return `${value} ft`;
    case 'in':
      return `${value} in`;
    case 'ftin':
      return formatFtIn(value);
    default:
      return String(value);
  }
}

/** "2026-11-04" → "Wed, Nov 4, 2026" without timezone drift. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Local date → "YYYY-MM-DD". */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const LEVEL_SHORT = ['F', 'L1', 'L2', 'L3'] as const;
export const LEVEL_LONG = ['Foundation', 'Level 1', 'Level 2', 'Level 3'] as const;
