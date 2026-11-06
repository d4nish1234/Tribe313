import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Session } from './types';

export const profileRef = (uid: string) => doc(db, 'benchmarkProfiles', uid);
export const sessionsCol = (uid: string) => collection(db, 'benchmarkProfiles', uid, 'benchmarkSessions');
export const sessionRef = (uid: string, date: string) =>
  doc(db, 'benchmarkProfiles', uid, 'benchmarkSessions', date);
export const assignmentsCol = (uid: string) =>
  collection(db, 'benchmarkProfiles', uid, 'benchmarkAssignments');

type SessionInput = Omit<Session, 'createdAt' | 'updatedAt'>;

function sessionPayload(s: SessionInput) {
  // Firestore rejects `undefined`; normalise every result to number | null.
  const results: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(s.results)) results[k] = typeof v === 'number' ? v : null;
  return {
    date: s.date,
    version: s.version,
    bodyweight: s.bodyweight,
    heightIn: s.heightIn ?? null,
    results,
    wallSquatFaults: s.wallSquatFaults ?? [],
  };
}

export async function sessionExists(uid: string, date: string): Promise<boolean> {
  return (await getDoc(sessionRef(uid, date))).exists();
}

/**
 * Save a benchmark. If `previousDate` differs from `s.date`, the benchmark is
 * moved: written under the new date and removed from the old one atomically.
 * The profile name is updated in the same batch; the profile height only when
 * `profileHeightIn` is given (so editing an old benchmark can't roll it back).
 */
export async function saveSession(opts: {
  uid: string;
  name: string;
  session: SessionInput;
  previousDate: string | null;
  isNew: boolean;
  profileHeightIn?: number;
}): Promise<void> {
  const { uid, name, session, previousDate, isNew, profileHeightIn } = opts;
  const batch = writeBatch(db);
  batch.set(
    profileRef(uid),
    {
      name,
      ...(profileHeightIn != null ? { heightIn: profileHeightIn } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const moving = !!previousDate && previousDate !== session.date;
  batch.set(
    sessionRef(uid, session.date),
    {
      ...sessionPayload(session),
      updatedAt: serverTimestamp(),
      ...(isNew || moving ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true },
  );
  if (moving) batch.delete(sessionRef(uid, previousDate!));
  await batch.commit();
}

export async function deleteSession(uid: string, date: string): Promise<void> {
  await deleteDoc(sessionRef(uid, date));
}

export async function saveHeight(uid: string, name: string, heightIn: number): Promise<void> {
  await setDoc(profileRef(uid), { name, heightIn, updatedAt: serverTimestamp() }, { merge: true });
}

export async function addAssignment(opts: {
  memberUid: string;
  text: string;
  note: string | null;
  coachUid: string;
  coachName: string;
}): Promise<void> {
  await addDoc(assignmentsCol(opts.memberUid), {
    text: opts.text.trim(),
    note: opts.note?.trim() || null,
    addedBy: opts.coachUid,
    addedByName: opts.coachName,
    createdAt: serverTimestamp(),
  });
}

export async function removeAssignment(memberUid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'benchmarkProfiles', memberUid, 'benchmarkAssignments', id));
}
