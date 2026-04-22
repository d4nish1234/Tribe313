"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserStatusChange = exports.onUserPending = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const push_1 = require("../push");
exports.onUserPending = (0, firestore_1.onDocumentCreated)('users/{uid}', async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    if (data.status !== 'pending')
        return;
    const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email || 'New member';
    const targets = await (0, push_1.targetsForAdmins)();
    await (0, push_1.sendPushes)(targets, {
        title: 'New member pending',
        body: `${name} is awaiting approval.`,
        data: { type: 'pending-approval', uid: event.params.uid },
    });
});
exports.onUserStatusChange = (0, firestore_1.onDocumentUpdated)('users/{uid}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.status !== 'pending' || after.status !== 'pending') {
        // Only notify on transitions into "pending" (e.g. re-submission). No-op otherwise.
        return;
    }
    // Placeholder — approval push is handled by approveUser callable directly.
});
//# sourceMappingURL=onPendingUser.js.map