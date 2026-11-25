import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth, usingEmulators } from '../firebase/config';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { backendChanged, isDeadSession } from '../lib/session';
import type { AppUser } from '../types';

type Ctx = {
  loading: boolean;
  firebaseUser: User | null;
  appUser: AppUser | null;
  /** Kept in state; firebaseUser.emailVerified can change without a re-render. */
  emailVerified: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  /** Re-read the Firebase user (e.g. after verifying email) and re-render. */
  reloadUser: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

// Checked once per app run, before anyone can sign in: did this run switch
// between the local emulators and the live project?
let switched: Promise<boolean> | null = backendChanged(usingEmulators ? 'emulators' : 'live');

export function AuthProvider({ children }: { children: ReactNode }) {
  const { loading, firebaseUser, appUser, emailVerified, reloadUser } = useCurrentUser();
  const isAdmin = !!appUser?.isAdmin;
  const isApproved = appUser?.status === 'approved';

  // The UI reads `isAdmin` from the user doc, but security rules read the
  // `admin` token claim. promoteAdmin sets both, yet the device keeps its old
  // token for up to an hour. Refresh it as soon as the two disagree.
  useEffect(() => {
    if (!firebaseUser) return;
    let alive = true;
    firebaseUser
      .getIdTokenResult()
      .then((t) => {
        if (alive && (t.claims.admin === true) !== isAdmin) return firebaseUser.getIdToken(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [firebaseUser, isAdmin]);

  // A saved sign-in the server no longer accepts (account deleted or disabled,
  // or it belongs to the other backend) makes every read fail and screens hang.
  // Sign out so the member lands on sign-in instead. Network errors are ignored.
  useEffect(() => {
    if (!firebaseUser) return;
    let alive = true;
    (async () => {
      const wasSwitched = switched ? await switched : false;
      switched = null; // Only the sign-in restored at launch can be from the other backend.
      if (!alive) return;
      if (wasSwitched) return signOut(auth);
      try {
        await firebaseUser.getIdToken(true);
      } catch (e) {
        if (alive && isDeadSession(e)) await signOut(auth);
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [firebaseUser]);

  return (
    <AuthCtx.Provider value={{ loading, firebaseUser, appUser, emailVerified, isAdmin, isApproved, reloadUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): Ctx {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
