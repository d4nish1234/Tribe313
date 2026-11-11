import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { sendPushes, targetsForAllApproved } from '../push';
import { TIME_ZONE, addDays, dateIn, formatTimeOfDay, timeIn, zonedTime } from '../shared/recurrence';

/**
 * The evening before: "Tomorrow: Workout · 8:00 AM · Aspire" for every event
 * happening tomorrow (Toronto calendar day), one-off or recurring. Goes to
 * everyone with notifications on, except people who've RSVPed "no".
 * `reminderSentAt` makes a retry or a second run skip events already done.
 */
export const remindTomorrow = onSchedule({ schedule: 'every day 18:00', timeZone: TIME_ZONE }, async () => {
  const tomorrow = addDays(dateIn(Date.now()), 1);
  const from = Timestamp.fromMillis(zonedTime(tomorrow, '00:00'));
  const to = Timestamp.fromMillis(zonedTime(addDays(tomorrow, 1), '00:00'));

  const events = await db.collection('events').where('startsAt', '>=', from).where('startsAt', '<', to).get();
  if (events.empty) return;
  const everyone = await targetsForAllApproved();

  for (const ev of events.docs) {
    if (ev.data().reminderSentAt) continue;

    // Claim the event in a transaction before sending, so two overlapping runs
    // (Cloud Scheduler can deliver a job twice) can't both send it. Claiming
    // first also means a crash after this point misses the reminder rather than
    // sending it twice on a retry; the miss is the lesser problem.
    const data = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ev.ref);
      if (!snap.exists || snap.get('reminderSentAt')) return null;
      tx.update(ev.ref, { reminderSentAt: FieldValue.serverTimestamp() });
      return snap.data()!;
    });
    if (!data) continue;

    const declined = await ev.ref.collection('rsvps').where('status', '==', 'no').get();
    const out = new Set(declined.docs.map((d) => d.id));
    const time = formatTimeOfDay(timeIn((data.startsAt as Timestamp).toMillis()));

    await sendPushes(
      everyone.filter((t) => !out.has(t.uid)),
      {
        title: `Tomorrow: ${data.title}`,
        body: [time, data.location?.label].filter(Boolean).join(' · '),
        data: { type: 'event', eventId: ev.id },
      },
    );
  }
});
