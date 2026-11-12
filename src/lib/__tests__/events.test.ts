import { eventHasPassed, splitEvents } from '../events';
import type { EventDoc } from '../../types';

const ev = (id: string, ms: number) => ({ id, title: id, startsAt: { toMillis: () => ms } }) as unknown as EventDoc;

describe('splitEvents', () => {
  const now = 1_000;
  const events = [ev('old', 100), ev('later', 3_000), ev('recent', 900), ev('soon', 2_000), ev('now', 1_000)];

  it('puts upcoming soonest first, so the first one is "Up next"', () => {
    expect(splitEvents(events, now).upcoming.map((e) => e.id)).toEqual(['now', 'soon', 'later']);
  });

  it('puts past events most recent first', () => {
    expect(splitEvents(events, now).past.map((e) => e.id)).toEqual(['recent', 'old']);
  });

  it('handles no events', () => {
    expect(splitEvents([], now)).toEqual({ upcoming: [], past: [] });
  });
});

describe('eventHasPassed', () => {
  it('is past from its start time on, matching the Past list', () => {
    expect(eventHasPassed(999, 1_000)).toBe(true);
    expect(eventHasPassed(1_000, 1_000)).toBe(false);
    expect(eventHasPassed(2_000, 1_000)).toBe(false);
  });
});
