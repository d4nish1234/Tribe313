import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { AppUser } from '../types';

type Ctx = {
  loading: boolean;
  firebaseUser: User | null;
  appUser: AppUser | null;
  isAdmin: boolean;
  isApproved: boolean;
  /** Re-read the Firebase user (e.g. after verifying email) and re-render. */
  reloadUser: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { loading, firebaseUser, appUser, reloadUser } = useCurrentUser();
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
  return (
    <AuthCtx.Provider value={{ loading, firebaseUser, appUser, isAdmin, isApproved, reloadUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): Ctx {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
