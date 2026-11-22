import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether this person has been through the first-run onboarding screen, kept
 * on the phone (not in Firestore), one flag per account. A new phone or a
 * reinstall shows onboarding again, pre-filled with what's already saved.
 *
 * `done` remembers flags set this session, so the tabs don't send the person
 * back to onboarding while AsyncStorage is still being read after they finish.
 */
const key = (uid: string) => `onboarding:done:${uid}`;
const done = new Set<string>();

export async function hasOnboarded(uid: string): Promise<boolean> {
  if (done.has(uid)) return true;
  try {
    const v = await AsyncStorage.getItem(key(uid));
    if (v) done.add(uid);
    return !!v;
  } catch {
    // Storage unreadable: let them in rather than loop on onboarding.
    return true;
  }
}

export function onboardedThisSession(uid: string): boolean {
  return done.has(uid);
}

export async function markOnboarded(uid: string): Promise<void> {
  done.add(uid);
  await AsyncStorage.setItem(key(uid), new Date().toISOString()).catch(() => {});
}
