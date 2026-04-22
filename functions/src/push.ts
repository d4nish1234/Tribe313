import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { db } from './lib/admin';

const expo = new Expo();

export type PushTarget = { token: string; uid: string };

export async function sendPushes(
  targets: PushTarget[],
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  const messages: ExpoPushMessage[] = targets
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const t = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...t);
    } catch (e) {
      console.error('expo push error', e);
    }
  }

  // best-effort cleanup of DeviceNotRegistered tokens
  await Promise.all(
    tickets.map(async (ticket, i) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const uid = targets[i]?.uid;
        if (uid) {
          await db.doc(`users/${uid}`).update({ expoPushToken: null }).catch(() => undefined);
        }
      }
    }),
  );
}

export async function targetsForAllApproved(excludeUid?: string): Promise<PushTarget[]> {
  const snap = await db
    .collection('users')
    .where('status', '==', 'approved')
    .where('notificationsEnabled', '==', true)
    .get();
  const out: PushTarget[] = [];
  for (const d of snap.docs) {
    const data = d.data() as { expoPushToken?: string };
    if (d.id === excludeUid) continue;
    if (data.expoPushToken) out.push({ token: data.expoPushToken, uid: d.id });
  }
  return out;
}

export async function targetsForAdmins(excludeUid?: string): Promise<PushTarget[]> {
  const snap = await db.collection('users').where('isAdmin', '==', true).get();
  const out: PushTarget[] = [];
  for (const d of snap.docs) {
    if (d.id === excludeUid) continue;
    const data = d.data() as { expoPushToken?: string; notificationsEnabled?: boolean };
    if (data.notificationsEnabled === false) continue;
    if (data.expoPushToken) out.push({ token: data.expoPushToken, uid: d.id });
  }
  return out;
}

export async function targetForUser(uid: string): Promise<PushTarget[]> {
  const d = await db.doc(`users/${uid}`).get();
  const data = d.data() as { expoPushToken?: string; notificationsEnabled?: boolean } | undefined;
  if (!data?.expoPushToken) return [];
  if (data.notificationsEnabled === false) return [];
  return [{ token: data.expoPushToken, uid }];
}
