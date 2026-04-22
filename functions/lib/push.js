"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushes = sendPushes;
exports.targetsForAllApproved = targetsForAllApproved;
exports.targetsForAdmins = targetsForAdmins;
exports.targetForUser = targetForUser;
const expo_server_sdk_1 = require("expo-server-sdk");
const admin_1 = require("./lib/admin");
const expo = new expo_server_sdk_1.Expo();
async function sendPushes(targets, payload) {
    const messages = targets
        .filter((t) => expo_server_sdk_1.Expo.isExpoPushToken(t.token))
        .map((t) => ({
        to: t.token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
    }));
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
        try {
            const t = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...t);
        }
        catch (e) {
            console.error('expo push error', e);
        }
    }
    // best-effort cleanup of DeviceNotRegistered tokens
    await Promise.all(tickets.map(async (ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const uid = targets[i]?.uid;
            if (uid) {
                await admin_1.db.doc(`users/${uid}`).update({ expoPushToken: null }).catch(() => undefined);
            }
        }
    }));
}
async function targetsForAllApproved(excludeUid) {
    const snap = await admin_1.db
        .collection('users')
        .where('status', '==', 'approved')
        .where('notificationsEnabled', '==', true)
        .get();
    const out = [];
    for (const d of snap.docs) {
        const data = d.data();
        if (d.id === excludeUid)
            continue;
        if (data.expoPushToken)
            out.push({ token: data.expoPushToken, uid: d.id });
    }
    return out;
}
async function targetsForAdmins(excludeUid) {
    const snap = await admin_1.db.collection('users').where('isAdmin', '==', true).get();
    const out = [];
    for (const d of snap.docs) {
        if (d.id === excludeUid)
            continue;
        const data = d.data();
        if (data.notificationsEnabled === false)
            continue;
        if (data.expoPushToken)
            out.push({ token: data.expoPushToken, uid: d.id });
    }
    return out;
}
async function targetForUser(uid) {
    const d = await admin_1.db.doc(`users/${uid}`).get();
    const data = d.data();
    if (!data?.expoPushToken)
        return [];
    if (data.notificationsEnabled === false)
        return [];
    return [{ token: data.expoPushToken, uid }];
}
//# sourceMappingURL=push.js.map