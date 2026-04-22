"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoteAdmin = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
exports.promoteAdmin = (0, https_1.onCall)(async (req) => {
    if (!req.auth?.token.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admins only');
    }
    const targetUid = req.data?.uid;
    if (!targetUid)
        throw new https_1.HttpsError('invalid-argument', 'uid required');
    await admin_1.authAdmin.setCustomUserClaims(targetUid, { admin: true });
    await admin_1.db.doc(`users/${targetUid}`).update({
        isAdmin: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
//# sourceMappingURL=promoteAdmin.js.map