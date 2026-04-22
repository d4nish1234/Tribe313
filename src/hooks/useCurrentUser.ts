import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { AppUser } from '../types';

type State = {
  loading: boolean;
  firebaseUser: User | null;
  appUser: AppUser | null;
};

export function useCurrentUser(): State {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) {
        setAppUser(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, 'users', firebaseUser.uid);
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setAppUser(snap.exists() ? ({ uid: snap.id, ...(snap.data() as any) } as AppUser) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [firebaseUser?.uid]);

  return { loading, firebaseUser, appUser };
}
