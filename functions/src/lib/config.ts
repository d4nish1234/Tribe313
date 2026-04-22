import { defineSecret, defineString } from 'firebase-functions/params';

// Configured via: firebase functions:secrets:set GOOGLE_MAPS_KEY
export const GOOGLE_MAPS_KEY = defineSecret('GOOGLE_MAPS_KEY');

// Configured via: firebase functions:config (or project params).
// Comma-separated list of admin emails that get auto-promoted on first login.
export const ADMIN_ALLOWLIST = defineString('ADMIN_ALLOWLIST', { default: '' });

export function adminEmails(): string[] {
  return ADMIN_ALLOWLIST.value()
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
