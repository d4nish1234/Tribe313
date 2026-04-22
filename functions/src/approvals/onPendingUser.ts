import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { sendPushes, targetsForAdmins } from '../push';

export const onUserPending = onDocumentCreated('users/{uid}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  if (data.status !== 'pending') return;
  const name = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email || 'New member';
  const targets = await targetsForAdmins();
  await sendPushes(targets, {
    title: 'New member pending',
    body: `${name} is awaiting approval.`,
    data: { type: 'pending-approval', uid: event.params.uid },
  });
});

export const onUserStatusChange = onDocumentUpdated('users/{uid}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before.status !== 'pending' || after.status !== 'pending') {
    // Only notify on transitions into "pending" (e.g. re-submission). No-op otherwise.
    return;
  }
  // Placeholder — approval push is handled by approveUser callable directly.
});
