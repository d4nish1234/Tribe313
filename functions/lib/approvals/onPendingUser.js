"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserStatusChange = exports.onUserPending = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin_1 = require("../lib/admin");
const push_1 = require("../push");
const approvals_1 = require("../shared/approvals");
/**
 * "New member pending" goes to admins once, when a pending member has
 * verified their email: that's when they appear in Admin → Approvals (which
 * hides unverified sign-ups). Not at sign-up, where the user doc is created
 * before the email is verified, and many never verify. The rule itself is in
 * src/shared/approvals.ts.
 *
 * The app sets `emailVerified: true` on the user doc after "I've verified"
 * (rules only allow false → true, so this happens once). Firebase Auth is
 * checked as well, so a client setting the flag on its own sends nothing.
 */
async function notify(uid, before, after) {
    if (!(0, approvals_1.shouldNotifyPending)(before, after))
        return;
    const user = await admin_1.authAdmin.getUser(uid).catch(() => null);
    if (!user?.emailVerified)
        return;
    await (0, push_1.sendPushes)(await (0, push_1.targetsForAdmins)(), {
        title: 'New member pending',
        body: `${(0, approvals_1.pendingName)(after)} is awaiting approval.`,
        data: { type: 'pending-approval', uid },
    });
}
/** A user doc that's created already verified (not the normal sign-up path, which verifies later). */
exports.onUserPending = (0, firestore_1.onDocumentCreated)('users/{uid}', async (event) => {
    const data = event.data?.data();
    if (data)
        await notify(event.params.uid, null, data);
});
/** The normal path: a pending member's doc gains `emailVerified: true`. */
exports.onUserStatusChange = (0, firestore_1.onDocumentUpdated)('users/{uid}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before && after)
        await notify(event.params.uid, before, after);
});
//# sourceMappingURL=onPendingUser.js.map