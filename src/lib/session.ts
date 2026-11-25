/**
 * Recovering from a saved sign-in the server no longer accepts.
 *
 * Firebase keeps the signed-in user on the phone. If that account is gone
 * (deleted, disabled, or it lived in the local emulator and the app now talks
 * to the live project, or the other way round), every Firestore read fails
 * with "Fetching auth token failed" and screens never load. Signing out sends
 * the member back to sign-in instead.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Auth errors that mean the saved sign-in can never work again. Network errors aren't here. */
const DEAD_SESSION = new Set([
  'auth/invalid-refresh-token',
  'auth/user-token-expired',
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/invalid-user-token',
]);

export function isDeadSession(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' && DEAD_SESSION.has(code);
}

const MODE_KEY = 'auth:backend';

/**
 * Records which backend ("emulators" or "live") this run uses and returns true
 * when it differs from the last run's, so a sign-in from the other one can be
 * dropped. Unknown (first run, storage error) counts as no change.
 */
export async function backendChanged(mode: 'emulators' | 'live'): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(MODE_KEY);
    if (last !== mode) await AsyncStorage.setItem(MODE_KEY, mode);
    return last !== null && last !== mode;
  } catch {
    return false;
  }
}
