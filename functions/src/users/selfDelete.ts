import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { authAdmin, db } from '../lib/admin';
import { purgeUserData } from './purgeUserData';

export const selfDeleteAccount = onCall({ timeoutSeconds: 300 }, async (req) => {
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required');
  }
  const uid = req.auth.uid;

  // Data first, sign-in last: if anything fails the user can still sign in
  // and retry, instead of being left with no account but orphaned data.
  const purged = await purgeUserData(uid);
  await db.doc(`users/${uid}`).delete().catch(() => undefined);
  await authAdmin.deleteUser(uid);

  logger.info('selfDeleteAccount', { uid, ...purged });
  return { ok: true as const };
});
