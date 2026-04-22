import { createContext, useContext, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { AppUser } from '../types';

type Ctx = {
  loading: boolean;
  firebaseUser: User | null;
  appUser: AppUser | null;
  isAdmin: boolean;
  isApproved: boolean;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { loading, firebaseUser, appUser } = useCurrentUser();
  const isAdmin = !!appUser?.isAdmin;
  const isApproved = appUser?.status === 'approved';
  return (
    <AuthCtx.Provider value={{ loading, firebaseUser, appUser, isAdmin, isApproved }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): Ctx {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
