import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { sendPushes, targetsForAllApproved } from '../push';
import {
  TIME_ZONE,
  describeRepeat,
  formatTimeOfDay,
  occurrenceId,
  planSync,
  upcomingOccurrences,
  type SeriesRule,
} from '../shared/recurrence';

/**
 * Recurring events. An admin saves a series in `eventSeries`; these functions
 * keep real `events` docs for the next 5 weeks of it (src/shared/recurrence.ts
 * says which dates). Generated events are ordinary events plus `seriesId` and
 * `seriesDate`, so RSVPs, rides and attendance work unchanged.
 *
 * - A series is created or edited: sync its future events straight away.
 *   A new series also tells everyone once ("New weekly event").
 * - Every night: sync every series, so the 5-week window keeps rolling.
 * - A series is deleted: remove its future events that nobody has RSVPed to.
 *
 * Syncing is idempotent: event ids are `<seriesId>_<date>`, so running twice
 * (retries, overlapping runs) never makes a second event for a date.
 */

function ruleOf(s: DocumentData): SeriesRule {
  return {
    repeat: s.repeat,
    startDate: s.startDate,
    timeOfDay: s.timeOfDay,
    monthlyWeek: s.monthlyWeek ?? null,
    endDate: s.endDate ?? null,
    skipDates: s.skipDates ?? [],
  };
}

/** The series' future events, and whether each has any RSVPs or rides (which make it keep). */
async function futureEvents(seriesId: string, now: number) {
  const snap = await db.collection('events').where('seriesId', '==', seriesId).get();
  return snap.docs.filter((d) => (d.data().startsAt as Timestamp).toMillis() > now);
}

/** Delete an event unless people have RSVPed or asked for rides; returns whether it went. */
async function removeIfUnused(id: string): Promise<boolean> {
  const ref = db.doc(`events/${id}`);
  const [rsvps, rides] = await Promise.all([
    ref.collection('rsvps').limit(1).get(),
    ref.collection('rides').limit(1).get(),
  ]);
  if (!rsvps.empty || !rides.empty) return false;
  await ref.delete();
  return true;
}

export async function syncSeries(seriesId: string, series: DocumentData | null, now = Date.now()) {
  const docs = await futureEvents(seriesId, now);
  const existing = docs.map((d) => ({ id: d.id, date: d.data().seriesDate as string }));
  const wanted = series ? upcomingOccurrences(ruleOf(series), now) : [];
  const plan = planSync(wanted, existing);

  const details = series
    ? {
        title: series.title,
        description: series.description ?? '',
        location: series.location,
        seriesLabel: describeRepeat(ruleOf(series)),
      }
    : null;

  let created = 0;
  for (const o of plan.create) {
    try {
      await db.doc(`events/${occurrenceId(seriesId, o.date)}`).create({
        ...details,
        startsAt: Timestamp.fromMillis(o.startsAt),
        seriesId,
        seriesDate: o.date,
        createdBy: series!.createdBy,
        createdAt: FieldValue.serverTimestamp(),
      });
      created++;
    } catch (e: any) {
      // 6 = ALREADY_EXISTS: another run made it first. Anything else is real.
      if (e?.code !== 6) throw e;
    }
  }

  // Edits to the series (title, place, time) reach events that haven't happened.
  // Only write events that differ, so the nightly run doesn't rewrite them all.
  const byId = new Map(docs.map((d) => [d.id, d.data()]));
  let updated = 0;
  for (const u of plan.update) {
    const want = { ...details, startsAt: Timestamp.fromMillis(u.startsAt) };
    const have = byId.get(u.id)!;
    const same =
      have.title === want.title &&
      have.description === want.description &&
      have.seriesLabel === want.seriesLabel &&
      JSON.stringify(have.location) === JSON.stringify(want.location) &&
      (have.startsAt as Timestamp).toMillis() === u.startsAt;
    if (same) continue;
    await db.doc(`events/${u.id}`).update(want);
    updated++;
  }

  let removed = 0;
  for (const id of plan.remove) if (await removeIfUnused(id)) removed++;

  console.log(`series ${seriesId}: +${created} ~${updated} -${removed}/${plan.remove.length}`);
}

export const onSeriesWrite = onDocumentWritten('eventSeries/{seriesId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data() ?? null;
  const { seriesId } = event.params;

  await syncSeries(seriesId, after);

  if (after && !before) {
    const word =
      after.repeat === 'weekly' ? 'weekly' : after.repeat === 'biweekly' ? 'every-2-weeks' : 'monthly';
    await sendPushes(await targetsForAllApproved(after.createdBy), {
      title: `New ${word} event`,
      body: `${after.title} · ${describeRepeat(ruleOf(after))} at ${formatTimeOfDay(after.timeOfDay)}`,
      data: { type: 'series', seriesId },
    });
  }
});

/** Every night, roll each series' 5-week window forward. */
export const extendSeries = onSchedule({ schedule: 'every day 03:00', timeZone: TIME_ZONE }, async () => {
  const all = await db.collection('eventSeries').get();
  for (const s of all.docs) {
    try {
      await syncSeries(s.id, s.data());
    } catch (e) {
      console.error(`series ${s.id} failed`, e); // one bad series shouldn't stop the rest
    }
  }
});
