import { useEffect, useState } from 'react';
import { hasOnboarded, onboardedThisSession } from '../lib/onboarding';

/** undefined while reading; then whether this account has finished onboarding on this phone. */
export function useOnboarded(uid: string | undefined): boolean | undefined {
  const [state, setState] = useState<{ uid: string; done: boolean } | null>(null);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    hasOnboarded(uid).then((d) => alive && setState({ uid, done: d }));
    return () => {
      alive = false;
    };
  }, [uid]);
  if (!uid) return undefined;
  if (onboardedThisSession(uid)) return true;
  return state?.uid === uid ? state.done : undefined;
}
