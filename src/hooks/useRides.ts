import { useEffect, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { listenQuery } from '../lib/live';
import { db } from '../firebase/config';
import type { Ride } from '../types';

export function useRides(eventId: string | undefined) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!eventId) return;
    const q = query(collection(db, 'events', eventId, 'rides'), orderBy('createdAt', 'asc'));
    return listenQuery(
      q,
      (snap) => {
        setRides(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Ride));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [eventId]);
  return { rides, loading };
}
