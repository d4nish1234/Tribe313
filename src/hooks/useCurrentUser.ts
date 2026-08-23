import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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

  return { loading, firebaseUser, appUser };
}
