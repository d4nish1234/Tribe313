import { useEffect } from 'react';
import { router, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function useAuthGate() {
  const { loading, firebaseUser, appUser } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const group = segments[0];

    if (!firebaseUser) {
      if (group !== '(auth)') router.replace('/login');
      return;
    }

    if (!firebaseUser.emailVerified) {
      if (segments.join('/') !== '(auth)/verify') router.replace('/verify');
      return;
    }

    if (!appUser) return;

    if (appUser.status === 'pending') {
      if (segments.join('/') !== '(gate)/pending') router.replace('/pending');
      return;
    }

    if (appUser.status === 'evicted') {
      if (segments.join('/') !== '(gate)/evicted') router.replace('/evicted');
      return;
    }

    if (appUser.status === 'approved' && (group === '(auth)' || group === '(gate)')) {
      router.replace('/');
    }
  }, [loading, firebaseUser?.uid, firebaseUser?.emailVerified, appUser?.status, segments]);
}
