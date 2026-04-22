import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

export const deactivateUser = onCall<{ uid: string }>(async (req) => {
  if (!req.auth?.token.admin) {
    throw new HttpsError('permission-denied', 'Admins only');
  }
  const targetUid = req.data?.uid;
  if (!targetUid) throw new HttpsError('invalid-argument', 'uid required');

  await db.doc(`users/${targetUid}`).update({
    status: 'evicted',
    expoPushToken: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true as const };
});
