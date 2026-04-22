"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
exports.deactivateUser = (0, https_1.onCall)(async (req) => {
    if (!req.auth?.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admins only');
    }
    const targetUid = req.data?.uid;
    if (!targetUid)
        throw new https_1.HttpsError('invalid-argument', 'uid required');
    await admin_1.db.doc(`users/${targetUid}`).update({
        status: 'evicted',
        expoPushToken: null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
//# sourceMappingURL=deactivate.js.map