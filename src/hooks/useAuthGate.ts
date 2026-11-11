import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

type Target = '/login' | '/verify' | '/pending' | '/evicted' | '/(tabs)';

// Several layouts mount this hook, and during a transition two of them can
// run before `segments` updates. Skip a repeat of the same redirect so the
// screen doesn't slide in twice.
let last: { to: Target; at: number } | null = null;
function go(to: Target, fromApp = false) {
  const now = Date.now();
  if (last && last.to === to && now - last.at < 1000) return;
  last = { to, at: now };
  // Leaving the signed-in app (sign out, account deleted, evicted) from a
  // pushed screen like Settings or an event: pop back to the tabs first, so
  // the replace swaps out the tabs. Otherwise only the top screen is replaced
  // and the tabs stay mounted underneath: back would return to them signed
  // out, and their listeners keep retrying against denied reads.
  if (fromApp && router.canDismiss()) router.dismissAll();
  router.replace(to);
}

export function useAuthGate() {
  const { loading, firebaseUser, appUser, emailVerified } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const group = segments[0];
    const inApp = group !== '(auth)' && group !== '(gate)';

    if (!firebaseUser) {
      if (group !== '(auth)') go('/login', inApp);
      return;
    }

    if (!emailVerified) {
      if (segments.join('/') !== '(auth)/verify') go('/verify', inApp);
      return;
    }

    if (!appUser) return;

    if (appUser.status === 'pending') {
      if (segments.join('/') !== '(gate)/pending') go('/pending', inApp);
      return;
    }

    if (appUser.status === 'evicted') {
      if (segments.join('/') !== '(gate)/evicted') go('/evicted', inApp);
      return;
    }

    if (appUser.status === 'approved' && (group === '(auth)' || group === '(gate)')) {
      // Straight to the tabs: '/' is app/index.tsx, which would redirect a
      // second time and slide Home in twice.
      go('/(tabs)');
    }
  }, [loading, firebaseUser?.uid, emailVerified, appUser?.status, segments]);
}
