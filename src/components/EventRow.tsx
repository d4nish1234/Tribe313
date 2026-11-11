import { router } from 'expo-router';
import { format } from 'date-fns';
import { CardRow } from '@/src/components/Cards';
import type { EventDoc } from '@/src/types';

/** An event in a card list: title, then date and place. Opens the event. */
export function EventRow({ event, first }: { event: EventDoc; first?: boolean }) {
  const when = format(event.startsAt.toDate(), 'EEE, MMM d · p');
  const where = event.location?.label;
  return (
    <CardRow
      first={first}
      title={event.title}
      subtitle={where ? `${when} · ${where}` : when}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
    />
  );
}
