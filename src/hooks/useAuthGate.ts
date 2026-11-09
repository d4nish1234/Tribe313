import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

type Target = '/login' | '/verify' | '/pending' | '/evicted' | '/(tabs)';

// Several layouts mount this hook, and during a transition two of them can
// run before `segments` updates. Skip a repeat of the same redirect so the
// screen doesn't slide in twice.
let last: { to: Target; at: number } | null = null;
function go(to: Target) {
  const now = Date.now();
  if (last && last.to === to && now - last.at < 1000) return;
  last = { to, at: now };
  router.replace(to);
}

export function useAuthGate() {
  const { loading, firebaseUser, appUser } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const group = segments[0];

    if (!firebaseUser) {
      if (group !== '(auth)') go('/login');
      return;
    }

    if (!firebaseUser.emailVerified) {
      if (segments.join('/') !== '(auth)/verify') go('/verify');
      return;
    }

    if (!appUser) return;

    if (appUser.status === 'pending') {
      if (segments.join('/') !== '(gate)/pending') go('/pending');
      return;
    }

    if (appUser.status === 'evicted') {
      if (segments.join('/') !== '(gate)/evicted') go('/evicted');
      return;
    }

    if (appUser.status === 'approved' && (group === '(auth)' || group === '(gate)')) {
      // Straight to the tabs: '/' is app/index.tsx, which would redirect a
      // second time and slide Home in twice.
      go('/(tabs)');
    }
  }, [loading, firebaseUser?.uid, firebaseUser?.emailVerified, appUser?.status, segments]);
}
