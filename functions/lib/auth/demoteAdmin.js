"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoteAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
exports.demoteAdmin = (0, https_1.onCall)(async (req) => {
    if (!req.auth?.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admins only');
    }
    const targetUid = req.data?.uid;
    if (!targetUid)
        throw new https_1.HttpsError('invalid-argument', 'uid required');
    if (targetUid === req.auth.uid) {
        throw new https_1.HttpsError('failed-precondition', 'Cannot remove your own admin access');
    }
    const targetRef = admin_1.db.doc(`users/${targetUid}`);
    const target = await targetRef.get();
    if (target.data()?.isSeedAdmin) {
        throw new https_1.HttpsError('failed-precondition', 'This admin is set via ADMIN_ALLOWLIST and cannot be removed');
    }
    await admin_1.authAdmin.setCustomUserClaims(targetUid, { admin: false });
    await targetRef.update({
        isAdmin: false,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
//# sourceMappingURL=demoteAdmin.js.map