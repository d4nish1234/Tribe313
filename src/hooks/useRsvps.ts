import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Rsvp } from '../types';

export function useRsvps(eventId: string | undefined) {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!eventId) return;
    return onSnapshot(collection(db, 'events', eventId, 'rsvps'), (snap) => {
      setRsvps(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) } as Rsvp)));
      setLoading(false);
    });
  }, [eventId]);
  return { rsvps, loading };
}
