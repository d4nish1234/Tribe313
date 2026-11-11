import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sendPushes, targetsForAllApproved } from '../push';

export const onEventCreate = onDocumentCreated('events/{eventId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  // Events made by a recurring series don't announce themselves one by one:
  // the series was announced once when created (events/series.ts).
  if (data.seriesId) return;
  const targets = await targetsForAllApproved();
  await sendPushes(targets, {
    title: 'New event',
    body: `${data.title} · ${data.location?.label ?? ''}`.trim(),
    data: { type: 'event', eventId: event.params.eventId },
  });
});
