import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { authAdmin, db } from '../lib/admin';

export const demoteAdmin = onCall<{ uid: string }>(async (req) => {
  if (!req.auth?.token.admin) {
    throw new HttpsError('permission-denied', 'Admins only');
  }
  const targetUid = req.data?.uid;
  if (!targetUid) throw new HttpsError('invalid-argument', 'uid required');
  if (targetUid === req.auth.uid) {
    throw new HttpsError('failed-precondition', 'Cannot remove your own admin access');
  }

  const targetRef = db.doc(`users/${targetUid}`);
  const target = await targetRef.get();
  if (target.data()?.isSeedAdmin) {
    throw new HttpsError('failed-precondition', 'This admin is set via ADMIN_ALLOWLIST and cannot be removed');
  }

  await authAdmin.setCustomUserClaims(targetUid, { admin: false });
  await targetRef.update({
    isAdmin: false,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ok: true as const };
});
