"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfDeleteAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const admin_1 = require("../lib/admin");
const purgeUserData_1 = require("./purgeUserData");
exports.selfDeleteAccount = (0, https_1.onCall)({ timeoutSeconds: 300 }, async (req) => {
    if (!req.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Login required');
    }
    const uid = req.auth.uid;
    // Data first, sign-in last: if anything fails the user can still sign in
    // and retry, instead of being left with no account but orphaned data.
    const purged = await (0, purgeUserData_1.purgeUserData)(uid);
    await admin_1.db.doc(`users/${uid}`).delete().catch(() => undefined);
    await admin_1.authAdmin.deleteUser(uid);
    v2_1.logger.info('selfDeleteAccount', { uid, ...purged });
    return { ok: true };
});
//# sourceMappingURL=selfDelete.js.map