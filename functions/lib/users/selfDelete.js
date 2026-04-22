"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfDeleteAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("../lib/admin");
exports.selfDeleteAccount = (0, https_1.onCall)(async (req) => {
    if (!req.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Login required');
    }
    const uid = req.auth.uid;
    await admin_1.db.doc(`users/${uid}`).delete().catch(() => undefined);
    await admin_1.authAdmin.deleteUser(uid);
    return { ok: true };
});
//# sourceMappingURL=selfDelete.js.map