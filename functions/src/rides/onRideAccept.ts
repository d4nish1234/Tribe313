import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from '../lib/admin';
import { sendPushes, targetForUser, targetsForAdmins } from '../push';

export const onRideAccept = onDocumentUpdated(
  'events/{eventId}/rides/{rideId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // open -> matched: notify requester and admins
    if (before.status === 'open' && after.status === 'matched') {
      const driverUid = after.driverUid as string | undefined;
      const requesterUid = after.requesterUid as string;
      const driver = driverUid ? (await db.doc(`users/${driverUid}`).get()).data() : null;
      const driverName = driver?.firstName ?? 'A driver';

      const requesterTargets = await targetForUser(requesterUid);
      const adminTargets = await targetsForAdmins(requesterUid);
      await sendPushes(requesterTargets, {
        title: 'Ride matched',
        body: `${driverName} offered you a ride.`,
        data: { type: 'ride-accept', eventId: event.params.eventId },
      });
      await sendPushes(adminTargets, {
        title: 'Ride matched',
        body: `${driverName} is giving a ride.`,
        data: { type: 'ride-accept', eventId: event.params.eventId },
      });
      return;
    }

    // matched -> open: driver backed out, notify requester and admins
    if (before.status === 'matched' && after.status === 'open') {
      const driverUid = before.driverUid as string | undefined;
      const requesterUid = before.requesterUid as string;
      const driver = driverUid ? (await db.doc(`users/${driverUid}`).get()).data() : null;
      const driverName = driver?.firstName ?? 'The driver';
      const evSnap = await db.doc(`events/${event.params.eventId}`).get();
      const ev = evSnap.data();

      const requesterTargets = await targetForUser(requesterUid);
      const adminTargets = await targetsForAdmins(driverUid);
      await sendPushes(requesterTargets, {
        title: 'Driver unmatched',
        body: `${driverName} can no longer give you a ride to ${ev?.title ?? 'the event'}.`,
        data: { type: 'ride-unmatch', eventId: event.params.eventId },
      });
      await sendPushes(adminTargets, {
        title: 'Driver unmatched',
        body: `${driverName} backed out of a ride for ${ev?.title ?? 'an event'}.`,
        data: { type: 'ride-unmatch', eventId: event.params.eventId },
      });
      return;
    }

    // matched -> cancelled: notify the driver their ride was cancelled
    if (before.status === 'matched' && after.status === 'cancelled') {
      const driverUid = before.driverUid as string | undefined;
      if (!driverUid) return;
      const requesterUid = before.requesterUid as string;
      const evSnap = await db.doc(`events/${event.params.eventId}`).get();
      const ev = evSnap.data();
      const requester = (await db.doc(`users/${requesterUid}`).get()).data();
      const requesterName = requester?.firstName ?? 'A member';

      const driverTargets = await targetForUser(driverUid);
      await sendPushes(driverTargets, {
        title: 'Ride cancelled',
        body: `${requesterName} cancelled their ride to ${ev?.title ?? 'an event'}.`,
        data: { type: 'ride-cancel', eventId: event.params.eventId },
      });
    }
  },
);
