import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { authAdmin } from '../lib/admin';
import { sendPushes, targetsForAdmins } from '../push';
import { pendingName, shouldNotifyPending, type UserDocLike } from '../shared/approvals';

/**
 * "New member pending" goes to admins once, when a pending member has
 * verified their email: that's when they appear in Admin → Approvals (which
 * hides unverified sign-ups). Not at sign-up, where the user doc is created
 * before the email is verified, and many never verify. The rule itself is in
 * src/shared/approvals.ts.
 *
 * The app sets `emailVerified: true` on the user doc after "I've verified"
 * (rules only allow false → true, so this happens once). Firebase Auth is
 * checked as well, so a client setting the flag on its own sends nothing.
 */
async function notify(uid: string, before: UserDocLike | null, after: UserDocLike) {
  if (!shouldNotifyPending(before, after)) return;
  const user = await authAdmin.getUser(uid).catch(() => null);
  if (!user?.emailVerified) return;
  await sendPushes(await targetsForAdmins(), {
    title: 'New member pending',
    body: `${pendingName(after)} is awaiting approval.`,
    data: { type: 'pending-approval', uid },
  });
}

/** A user doc that's created already verified (not the normal sign-up path, which verifies later). */
export const onUserPending = onDocumentCreated('users/{uid}', async (event) => {
  const data = event.data?.data();
  if (data) await notify(event.params.uid, null, data);
});

/** The normal path: a pending member's doc gains `emailVerified: true`. */
export const onUserStatusChange = onDocumentUpdated('users/{uid}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before && after) await notify(event.params.uid, before, after);
});
