import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Ride } from '../types';

export function useRides(eventId: string | undefined) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!eventId) return;
    const q = query(collection(db, 'events', eventId, 'rides'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snap) => {
      setRides(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Ride)));
      setLoading(false);
    });
  }, [eventId]);
  return { rides, loading };
}
