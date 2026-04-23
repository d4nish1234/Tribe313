import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

export function usePendingCount(): number {
  const { isAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => setCount(snap.size));
  }, [isAdmin]);

  return count;
}
