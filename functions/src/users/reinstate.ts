import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { sendPushes, targetForUser } from '../push';

export const reinstateUser = onCall<{ uid: string }>(async (req) => {
  if (!req.auth?.token.admin) {
    throw new HttpsError('permission-denied', 'Admins only');
  }
  const targetUid = req.data?.uid;
  if (!targetUid) throw new HttpsError('invalid-argument', 'uid required');

  await db.doc(`users/${targetUid}`).update({
    status: 'approved',
    missedEventCount: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const targets = await targetForUser(targetUid);
  await sendPushes(targets, {
    title: 'Welcome back to Tribe313',
    body: 'Your membership has been reinstated.',
  });

  return { ok: true as const };
});
