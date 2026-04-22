import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { authAdmin, db } from '../lib/admin';

export const selfDeleteAccount = onCall(async (req) => {
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required');
  }
  const uid = req.auth.uid;

  await db.doc(`users/${uid}`).delete().catch(() => undefined);
  await authAdmin.deleteUser(uid);

  return { ok: true as const };
});
