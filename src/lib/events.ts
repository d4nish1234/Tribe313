import type { EventDoc } from '../types';

const millis = (e: EventDoc) => e.startsAt?.toMillis?.() ?? 0;

/**
 * Whether an event has started. From then on it's "past": it moves to the
 * Past list, and RSVPs, rides and edits are closed (only admins' attendance
 * and delete remain).
 */
export function eventHasPassed(startsAtMs: number, now: number): boolean {
  return startsAtMs < now;
}

/**
 * Upcoming events (soonest first) and past events (most recent first).
 * An event counts as upcoming until its start time.
 */
export function splitEvents(events: EventDoc[], now: number): { upcoming: EventDoc[]; past: EventDoc[] } {
  const upcoming = events.filter((e) => !eventHasPassed(millis(e), now)).sort((a, b) => millis(a) - millis(b));
  const past = events.filter((e) => eventHasPassed(millis(e), now)).sort((a, b) => millis(b) - millis(a));
  return { upcoming, past };
}
