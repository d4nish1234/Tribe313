import { useEffect, useState } from 'react';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { listenDoc, listenQuery } from '../lib/live';
import { db } from '../firebase/config';
import type { EventSeries } from '../types';

/** Every recurring series, by title. */
export function useEventSeriesList() {
  const [series, setSeries] = useState<EventSeries[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'eventSeries'), orderBy('title'));
    return listenQuery(
      q,
      (snap) => setSeries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as EventSeries)),
      () => setSeries((s) => s ?? []),
    );
  }, []);

  return { loading: series === null, series: series ?? [] };
}

/** One series, or null once we know it doesn't exist. `undefined` id = nothing to load. */
export function useEventSeries(id: string | undefined) {
  const [series, setSeries] = useState<EventSeries | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    return listenDoc(doc(db, 'eventSeries', id), (snap) =>
      setSeries(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as EventSeries) : null),
    );
  }, [id]);

  return { loading: !!id && series === undefined, series: series ?? null };
}
