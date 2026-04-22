import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from '../lib/admin';
import { sendPushes, targetForUser, targetsForAdmins } from '../push';

export const onRideAccept = onDocumentUpdated(
  'events/{eventId}/rides/{rideId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === 'matched' || after.status !== 'matched') return;

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
  },
);
