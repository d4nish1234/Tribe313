import { auth as authTrigger } from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { authAdmin, db } from '../lib/admin';
import { adminEmails } from '../lib/config';

export const onUserCreate = authTrigger.user().onCreate(async (user) => {
  const email = (user.email ?? '').toLowerCase();
  const isSeedAdmin = adminEmails().includes(email);

  if (isSeedAdmin) {
    await authAdmin.setCustomUserClaims(user.uid, { admin: true });
  }

  const ref = db.doc(`users/${user.uid}`);
  const existing = await ref.get();
  const display = user.displayName ?? '';
  const [firstGuess, ...rest] = display.split(' ');

  const seed = {
    email,
    firstName: existing.data()?.firstName ?? firstGuess ?? '',
    lastName: existing.data()?.lastName ?? rest.join(' ') ?? '',
    status: isSeedAdmin ? 'approved' : 'pending',
    isAdmin: isSeedAdmin,
    isSeedAdmin,
    shareLocation: false,
    notificationsEnabled: true,
    badges: [],
    attendedEventIds: [],
    missedEventCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(seed, { merge: true });
});
