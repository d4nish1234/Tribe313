"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeUserData = purgeUserData;
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
/**
 * Removes everything a member left in Firestore outside their `users/{uid}`
 * doc, so deleting an account deletes its data (App Store 5.1.1(v), Play's
 * account deletion policy, and our privacy policy).
 *
 * Kept on purpose: events the user created as an admin (they belong to the
 * group) and coach assignments they wrote on other members' benchmarks.
 *
 * Rides are unwound rather than just dropped so other members find out
 * through the existing onRideAccept notifications:
 * - rides they requested: a matched one is cancelled first (tells the
 *   driver), then every one is deleted (pickup can be a home address);
 * - rides they were driving: reopened so the requester can find a new driver.
 */
async function purgeUserData(uid) {
    // Benchmark profile plus its benchmarkSessions and benchmarkAssignments.
    await admin_1.db.recursiveDelete(admin_1.db.doc(`benchmarkProfiles/${uid}`));
    // Per-event queries rather than collection-group ones: those need a
    // collection-group index on requesterUid/driverUid, which we don't have.
    const events = await admin_1.db.collection('events').select().get();
    let rsvps = 0;
    let ridesDeleted = 0;
    let ridesReopened = 0;
    for (const ev of events.docs) {
        const rsvpRef = ev.ref.collection('rsvps').doc(uid);
        if ((await rsvpRef.get()).exists) {
            // onRsvpWrite returns early when the RSVP is deleted, so this can't
            // recreate the user doc or award badges.
            await rsvpRef.delete();
            rsvps += 1;
        }
        const rides = ev.ref.collection('rides');
        const requested = await rides.where('requesterUid', '==', uid).get();
        for (const ride of requested.docs) {
            if (ride.get('status') === 'matched') {
                await ride.ref.update({ status: 'cancelled' });
            }
            await ride.ref.delete();
            ridesDeleted += 1;
        }
        const driving = await rides.where('driverUid', '==', uid).get();
        for (const ride of driving.docs) {
            if (ride.get('requesterUid') === uid)
                continue; // already deleted above
            await ride.ref.update({
                status: 'open',
                driverUid: firestore_1.FieldValue.delete(),
                matchedAt: firestore_1.FieldValue.delete(),
            });
            ridesReopened += 1;
        }
    }
    return { rsvps, ridesDeleted, ridesReopened };
}
//# sourceMappingURL=purgeUserData.js.map