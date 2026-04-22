import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { db } from '../lib/admin';
import { sendPushes, targetsForAllApproved } from '../push';

export const onRideRequest = onDocumentCreated(
  'events/{eventId}/rides/{rideId}',
  async (event) => {
    const ride = event.data?.data();
    if (!ride) return;
    const { eventId } = event.params;
    const evSnap = await db.doc(`events/${eventId}`).get();
    const ev = evSnap.data();
    const reqSnap = await db.doc(`users/${ride.requesterUid}`).get();
    const reqName = reqSnap.data()?.firstName ?? 'A member';

    const targets = await targetsForAllApproved(ride.requesterUid);
    await sendPushes(targets, {
      title: 'Ride request',
      body: `${reqName} needs a ride to ${ev?.title ?? 'an event'}.`,
      data: { type: 'ride-request', eventId, rideId: event.params.rideId },
    });
  },
);
