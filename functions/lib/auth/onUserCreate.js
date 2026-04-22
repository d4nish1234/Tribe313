"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreate = void 0;
const v1_1 = require("firebase-functions/v1");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("../lib/admin");
const config_1 = require("../lib/config");
exports.onUserCreate = v1_1.auth.user().onCreate(async (user) => {
    const email = (user.email ?? '').toLowerCase();
    const isSeedAdmin = (0, config_1.adminEmails)().includes(email);
    if (isSeedAdmin) {
        await admin_1.authAdmin.setCustomUserClaims(user.uid, { admin: true });
    }
    const ref = admin_1.db.doc(`users/${user.uid}`);
    const existing = await ref.get();
    const display = user.displayName ?? '';
    const [firstGuess, ...rest] = display.split(' ');
    const seed = {
        email,
        firstName: existing.data()?.firstName ?? firstGuess ?? '',
        lastName: existing.data()?.lastName ?? rest.join(' ') ?? '',
        status: isSeedAdmin ? 'approved' : 'pending',
        isAdmin: isSeedAdmin,
        shareLocation: false,
        notificationsEnabled: true,
        badges: [],
        attendedEventIds: [],
        missedEventCount: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await ref.set(seed, { merge: true });
});
//# sourceMappingURL=onUserCreate.js.map