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
    // open -> matched: notify requester and admins
    if (before.status === 'open' && after.status === 'matched') {
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
        return;
    }
    // matched -> open: driver backed out, notify requester and admins
    if (before.status === 'matched' && after.status === 'open') {
        const driverUid = before.driverUid;
        const requesterUid = before.requesterUid;
        const driver = driverUid ? (await admin_1.db.doc(`users/${driverUid}`).get()).data() : null;
        const driverName = driver?.firstName ?? 'The driver';
        const evSnap = await admin_1.db.doc(`events/${event.params.eventId}`).get();
        const ev = evSnap.data();
        const requesterTargets = await (0, push_1.targetForUser)(requesterUid);
        const adminTargets = await (0, push_1.targetsForAdmins)(driverUid);
        await (0, push_1.sendPushes)(requesterTargets, {
            title: 'Driver unmatched',
            body: `${driverName} can no longer give you a ride to ${ev?.title ?? 'the event'}.`,
            data: { type: 'ride-unmatch', eventId: event.params.eventId },
        });
        await (0, push_1.sendPushes)(adminTargets, {
            title: 'Driver unmatched',
            body: `${driverName} backed out of a ride for ${ev?.title ?? 'an event'}.`,
            data: { type: 'ride-unmatch', eventId: event.params.eventId },
        });
        return;
    }
    // matched -> cancelled: notify the driver their ride was cancelled
    if (before.status === 'matched' && after.status === 'cancelled') {
        const driverUid = before.driverUid;
        if (!driverUid)
            return;
        const requesterUid = before.requesterUid;
        const evSnap = await admin_1.db.doc(`events/${event.params.eventId}`).get();
        const ev = evSnap.data();
        const requester = (await admin_1.db.doc(`users/${requesterUid}`).get()).data();
        const requesterName = requester?.firstName ?? 'A member';
        const driverTargets = await (0, push_1.targetForUser)(driverUid);
        await (0, push_1.sendPushes)(driverTargets, {
            title: 'Ride cancelled',
            body: `${requesterName} cancelled their ride to ${ev?.title ?? 'an event'}.`,
            data: { type: 'ride-cancel', eventId: event.params.eventId },
        });
    }
});
//# sourceMappingURL=onRideAccept.js.map