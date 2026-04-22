import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { EventDoc } from '../types';

export function useEvents() {
  const [events, setEvents] = useState<EventDoc[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startsAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, 'id'>) })),
      );
    });
  }, []);

  return useMemo(() => {
    if (!events) return { loading: true, upcoming: [], past: [] };
    const now = Date.now();
    const upcoming: EventDoc[] = [];
    const past: EventDoc[] = [];
    for (const e of events) {
      const ts = (e.startsAt as Timestamp)?.toMillis?.() ?? 0;
      if (ts >= now) upcoming.push(e);
      else past.push(e);
    }
    upcoming.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
    return { loading: false, upcoming, past };
  }, [events]);
}

export function useEvent(id: string | undefined) {
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, 'events', id), (snap) => {
      setEvent(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as EventDoc) : null);
      setLoading(false);
    });
  }, [id]);
  return { event, loading };
}
