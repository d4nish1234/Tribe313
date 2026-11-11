import type { EventDoc } from '../types';

const millis = (e: EventDoc) => e.startsAt?.toMillis?.() ?? 0;

/**
 * Upcoming events (soonest first) and past events (most recent first).
 * An event counts as upcoming until its start time.
 */
export function splitEvents(events: EventDoc[], now: number): { upcoming: EventDoc[]; past: EventDoc[] } {
  const upcoming = events.filter((e) => millis(e) >= now).sort((a, b) => millis(a) - millis(b));
  const past = events.filter((e) => millis(e) < now).sort((a, b) => millis(b) - millis(a));
  return { upcoming, past };
}
