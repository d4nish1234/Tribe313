"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
const push_1 = require("../push");
exports.approveUser = (0, https_1.onCall)(async (req) => {
    if (!req.auth?.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admins only');
    }
    const targetUid = req.data?.uid;
    if (!targetUid)
        throw new https_1.HttpsError('invalid-argument', 'uid required');
    await admin_1.db.doc(`users/${targetUid}`).update({
        status: 'approved',
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    const targets = await (0, push_1.targetForUser)(targetUid);
    await (0, push_1.sendPushes)(targets, {
        title: 'Welcome to Tribe313',
        body: 'You have been approved. Open the app to see upcoming events.',
    });
    return { ok: true };
});
//# sourceMappingURL=approveUser.js.map