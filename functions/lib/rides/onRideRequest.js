"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRideRequest = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../lib/admin");
const push_1 = require("../push");
exports.onRideRequest = (0, firestore_1.onDocumentCreated)('events/{eventId}/rides/{rideId}', async (event) => {
    const ride = event.data?.data();
    if (!ride)
        return;
    const { eventId } = event.params;
    const evSnap = await admin_1.db.doc(`events/${eventId}`).get();
    const ev = evSnap.data();
    const reqSnap = await admin_1.db.doc(`users/${ride.requesterUid}`).get();
    const reqName = reqSnap.data()?.firstName ?? 'A member';
    const targets = await (0, push_1.targetsForAllApproved)(ride.requesterUid);
    await (0, push_1.sendPushes)(targets, {
        title: 'Ride request',
        body: `${reqName} needs a ride to ${ev?.title ?? 'an event'}.`,
        data: { type: 'ride-request', eventId, rideId: event.params.rideId },
    });
});
//# sourceMappingURL=onRideRequest.js.map