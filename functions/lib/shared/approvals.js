"use strict";
// Pure rules for the "New member pending" push, kept free of imports so the
// app's jest suite can test them (src/lib/__tests__/approvals.test.ts).
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldNotifyPending = shouldNotifyPending;
exports.pendingName = pendingName;
/**
 * Whether this write to `users/{uid}` should tell admins someone is waiting:
 * a pending member whose `emailVerified` just became true (`before` is null
 * for a doc being created). That's when they appear in Admin → Approvals.
 * Sign-up alone doesn't count, and nothing after the first time does either.
 * The caller still checks Firebase Auth, since the flag is client-written.
 */
function shouldNotifyPending(before, after) {
    return after.status === 'pending' && after.emailVerified === true && before?.emailVerified !== true;
}
/** "Amy Lee", else the email, else "New member". */
function pendingName(u) {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'New member';
}
//# sourceMappingURL=approvals.js.map