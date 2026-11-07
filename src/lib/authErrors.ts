/** Turn Firebase Auth errors ("Firebase: Error (auth/…)") into plain sentences. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password don’t match. Try again.',
  'auth/wrong-password': 'That email and password don’t match. Try again.',
  'auth/user-not-found': 'That email and password don’t match. Try again.',
  'auth/invalid-email': 'That doesn’t look like a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': 'There’s already an account with that email. Try logging in.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/user-disabled': 'This account has been turned off. Contact an admin.',
};

export function authErrorMessage(e: unknown, fallback: string): string {
  const code = (e as { code?: string } | null)?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback;
}
