import { useEffect, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { listenQuery } from '../lib/live';
import { db } from '../firebase/config';
import type { AppUser } from '../types';

export function useMembers(includeEvicted = false) {
  const [members, setMembers] = useState<AppUser[] | null>(null);

  useEffect(() => {
    const q = includeEvicted
      ? query(collection(db, 'users'))
      : query(collection(db, 'users'), where('status', '==', 'approved'));
    return listenQuery(
      q,
      (snap) => setMembers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }) as AppUser)),
      () => setMembers((m) => m ?? []),
    );
  }, [includeEvicted]);

  return { loading: members === null, members: members ?? [] };
}
