// Pure rules for the "New member pending" push, kept free of imports so the
// app's jest suite can test them (src/lib/__tests__/approvals.test.ts).

export interface UserDocLike {
  status?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

/**
 * Whether this write to `users/{uid}` should tell admins someone is waiting:
 * a pending member whose `emailVerified` just became true (`before` is null
 * for a doc being created). That's when they appear in Admin → Approvals.
 * Sign-up alone doesn't count, and nothing after the first time does either.
 * The caller still checks Firebase Auth, since the flag is client-written.
 */
export function shouldNotifyPending(before: UserDocLike | null, after: UserDocLike): boolean {
  return after.status === 'pending' && after.emailVerified === true && before?.emailVerified !== true;
}

/** "Amy Lee", else the email, else "New member". */
export function pendingName(u: UserDocLike): string {
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'New member';
}
