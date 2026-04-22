import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

const MILESTONES: { count: number; badge: string }[] = [
  { count: 1, badge: 'first-event' },
  { count: 5, badge: 'five-events' },
  { count: 10, badge: 'ten-events' },
  { count: 25, badge: 'twenty-five-events' },
  { count: 50, badge: 'fifty-events' },
  { count: 100, badge: 'hundred-events' },
  { count: 200, badge: 'two-hundred-events' },
];

export const onRsvpWrite = onDocumentWritten(
  'events/{eventId}/rsvps/{uid}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const { eventId, uid } = event.params;

    // Early-bird: RSVP yes within 1h of event creation.
    if (!before && after?.status === 'yes') {
      const evSnap = await db.doc(`events/${eventId}`).get();
      const ev = evSnap.data();
      if (ev?.createdAt && (after.updatedAt as Timestamp)?.toMillis) {
        const createdMs = (ev.createdAt as Timestamp).toMillis();
        const nowMs = (after.updatedAt as Timestamp).toMillis();
        if (nowMs - createdMs <= 60 * 60 * 1000) {
          await db.doc(`users/${uid}`).update({
            badges: FieldValue.arrayUnion('early-bird'),
          });
        }
      }
    }

    if (!after) return;
    const wasAttended = !!before?.attended;
    const isAttended = !!after.attended;
    if (wasAttended === isAttended) return;

    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    const user = userSnap.data() ?? {};

    const attended = new Set<string>(user.attendedEventIds ?? []);
    if (isAttended) attended.add(eventId);
    else attended.delete(eventId);
    const attendedIds = Array.from(attended);
    const count = attendedIds.length;

    const badges = new Set<string>(user.badges ?? []);
    for (const m of MILESTONES) {
      if (count >= m.count) badges.add(m.badge);
    }

    // 3-event streak: latest 3 attended events are consecutive in time order.
    if (count >= 3) {
      const evs = await db
        .collection('events')
        .orderBy('startsAt', 'asc')
        .get();
      const allIds = evs.docs.map((d) => d.id);
      // Walk through the chronological event list and check if any 3
      // consecutive events were all attended.
      let run = 0;
      let maxRun = 0;
      for (const id of allIds) {
        if (attended.has(id)) {
          run += 1;
          maxRun = Math.max(maxRun, run);
        } else {
          run = 0;
        }
      }
      if (maxRun >= 3) badges.add('streak-3');
    }

    // Compute lastAttendedAt + missedEventCount (# past events since lastAttended).
    const pastSnap = await db
      .collection('events')
      .where('startsAt', '<=', Timestamp.now())
      .orderBy('startsAt', 'desc')
      .get();

    let lastAttendedAt: Timestamp | null = null;
    let missed = 0;
    for (const d of pastSnap.docs) {
      if (attended.has(d.id)) {
        lastAttendedAt = d.data().startsAt as Timestamp;
        break;
      }
      missed += 1;
    }

    await userRef.update({
      attendedEventIds: attendedIds,
      badges: Array.from(badges),
      lastAttendedAt,
      missedEventCount: missed,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);
