import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, reload, type User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { listenDoc } from '../lib/live';
import { auth, db } from '../firebase/config';
import type { AppUser } from '../types';

type State = {
  loading: boolean;
  firebaseUser: User | null;
  appUser: AppUser | null;
  /** Use this, not firebaseUser.emailVerified: see reloadUser below. */
  emailVerified: boolean;
  reloadUser: () => Promise<void>;
};

export function useCurrentUser(): State {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // reload() mutates the same User object in place, so a change to
  // emailVerified is invisible to React: the React Compiler memoizes on the
  // object identity, and onAuthStateChanged doesn't fire. Copy the flag into
  // state so the auth gate re-runs and leaves the verify screen.
  const [emailVerified, setEmailVerified] = useState(!!auth.currentUser?.emailVerified);
  const reloadUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setEmailVerified(!!auth.currentUser?.emailVerified);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setEmailVerified(!!u?.emailVerified);
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
    const unsub = listenDoc(
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

  return { loading, firebaseUser, appUser, emailVerified, reloadUser };
}
