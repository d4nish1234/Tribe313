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
    const data = ev.data();
    if (data.reminderSentAt) continue;

    const declined = await ev.ref.collection('rsvps').where('status', '==', 'no').get();
    const out = new Set(declined.docs.map((d) => d.id));
    const time = formatTimeOfDay(timeIn((data.startsAt as Timestamp).toMillis()));

    // Mark first: a crash after sending would otherwise send twice on retry,
    // and a missed reminder is the lesser problem.
    await ev.ref.update({ reminderSentAt: FieldValue.serverTimestamp() });
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
