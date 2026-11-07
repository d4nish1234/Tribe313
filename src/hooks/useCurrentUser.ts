import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, reload, type User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { AppUser } from '../types';

type State = {
  loading: boolean;
  firebaseUser: User | null;
  appUser: AppUser | null;
  reloadUser: () => Promise<void>;
};

export function useCurrentUser(): State {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // reload() mutates the same User object (e.g. emailVerified), which React
  // can't see. Bumping this re-renders so the auth gate re-evaluates.
  const [, setUserVersion] = useState(0);
  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setUserVersion((n) => n + 1);
  }, []);

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
        const data = snap.exists() ? snap.data() : null;
        if (data && firebaseUser.emailVerified && !data.emailVerified) {
          updateDoc(ref, { emailVerified: true });
        }
        setAppUser(data ? ({ uid: snap.id, ...data } as AppUser) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [firebaseUser?.uid]);

  return { loading, firebaseUser, appUser, reloadUser };
}
