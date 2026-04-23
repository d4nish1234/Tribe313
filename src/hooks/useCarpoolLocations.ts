import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export type CarpoolLocation = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export function useCarpoolLocations() {
  const [locations, setLocations] = useState<CarpoolLocation[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'carpoolLocations'), orderBy('label'));
    return onSnapshot(
      q,
      (snap) => setLocations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as CarpoolLocation))),
      () => setLocations([]),
    );
  }, []);

  return { loading: locations === null, locations: locations ?? [] };
}
