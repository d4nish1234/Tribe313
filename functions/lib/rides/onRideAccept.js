"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRideAccept = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../lib/admin");
const push_1 = require("../push");
exports.onRideAccept = (0, firestore_1.onDocumentUpdated)('events/{eventId}/rides/{rideId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.status === 'matched' || after.status !== 'matched')
        return;
    const driverUid = after.driverUid;
    const requesterUid = after.requesterUid;
    const driver = driverUid ? (await admin_1.db.doc(`users/${driverUid}`).get()).data() : null;
    const driverName = driver?.firstName ?? 'A driver';
    const requesterTargets = await (0, push_1.targetForUser)(requesterUid);
    const adminTargets = await (0, push_1.targetsForAdmins)(requesterUid);
    await (0, push_1.sendPushes)(requesterTargets, {
        title: 'Ride matched',
        body: `${driverName} offered you a ride.`,
        data: { type: 'ride-accept', eventId: event.params.eventId },
    });
    await (0, push_1.sendPushes)(adminTargets, {
        title: 'Ride matched',
        body: `${driverName} is giving a ride.`,
        data: { type: 'ride-accept', eventId: event.params.eventId },
    });
});
//# sourceMappingURL=onRideAccept.js.map