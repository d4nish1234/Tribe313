import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { AppState } from 'react-native';
import { db } from '../firebase/config';
import { listenDoc, listenQuery } from '../lib/live';
import type { EventDoc } from '../types';
import { splitEvents } from '../lib/events';

/**
 * The current time, updated every minute and when the app comes back to the
 * foreground, so lists that depend on "now" (Up next, upcoming vs past) move
 * on by themselves when an event starts.
 */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, everyMs);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [everyMs]);
  return now;
}

export function useEvents() {
  const [events, setEvents] = useState<EventDoc[] | null>(null);
  const now = useNow();

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startsAt', 'desc'));
    return listenQuery(
      q,
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventDoc, 'id'>) }))),
      () => setEvents((e) => e ?? []),
    );
  }, []);

  return useMemo(() => {
    if (!events) return { loading: true, upcoming: [], past: [] };
    return { loading: false, ...splitEvents(events, now) };
  }, [events, now]);
}

export function useEvent(id: string | undefined) {
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    return listenDoc(
      doc(db, 'events', id),
      (snap) => {
        setEvent(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as EventDoc) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [id]);
  return { event, loading };
}
