import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase/config';
import { resilient } from '../lib/live';
import { assignmentsCol, profileRef, sessionsCol } from './data';
import { toIsoDate } from './engine/format';
import type { Assignment, BenchmarkProfile, Session } from './types';

export function useBenchmarkProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<BenchmarkProfile | null | undefined>(undefined);
  useEffect(() => {
    if (!uid) return;
    return resilient(
      (ok, fail) =>
        onSnapshot(
          profileRef(uid),
          (snap) => {
            ok();
            setProfile(snap.exists() ? (snap.data() as BenchmarkProfile) : null);
          },
          fail,
        ),
      () => setProfile((p) => (p === undefined ? null : p)),
    );
  }, [uid]);
  return { loading: profile === undefined, profile: profile ?? null };
}

export function useBenchmarkSessions(uid: string | undefined) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    return resilient(
      (ok, fail) =>
        onSnapshot(
          query(sessionsCol(uid), orderBy('date', 'desc')),
          (snap) => {
            ok();
            setSessions(snap.docs.map((d) => d.data() as Session));
          },
          fail,
        ),
      () => setSessions((p) => p ?? []),
    );
  }, [uid]);
  return { loading: sessions === null, sessions: sessions ?? [] };
}

export function useAssignments(uid: string | undefined) {
  const [items, setItems] = useState<Assignment[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    return resilient(
      (ok, fail) =>
        onSnapshot(
          query(assignmentsCol(uid), orderBy('createdAt', 'desc')),
          (snap) => {
            ok();
            setItems(
              snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Assignment, 'id'>),
              })),
            );
          },
          fail,
        ),
      () => setItems((p) => p ?? []),
    );
  }, [uid]);
  return { loading: items === null, assignments: items ?? [] };
}

/** Admin only: every member's benchmarks, keyed by uid. */
export function useAllBenchmarkSessions(enabled: boolean) {
  const [byUid, setByUid] = useState<Record<string, Session[]> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return resilient(
      (ok, fail) =>
        onSnapshot(
          collectionGroup(db, 'benchmarkSessions'),
          (snap) => {
            ok();
            const out: Record<string, Session[]> = {};
            snap.docs.forEach((d) => {
              const uid = d.ref.parent.parent?.id;
              if (!uid) return;
              (out[uid] ??= []).push(d.data() as Session);
            });
            setByUid(out);
          },
          fail,
        ),
      () => setByUid((p) => p ?? {}),
    );
  }, [enabled]);
  return { loading: byUid === null, byUid: byUid ?? {} };
}

/** Admin only: count of assigned exercises per member. */
export function useAssignmentCounts(enabled: boolean) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!enabled) return;
    return resilient(
      (ok, fail) =>
        onSnapshot(
          collectionGroup(db, 'benchmarkAssignments'),
          (snap) => {
            ok();
            const out: Record<string, number> = {};
            snap.docs.forEach((d) => {
              const uid = d.ref.parent.parent?.id;
              if (uid) out[uid] = (out[uid] ?? 0) + 1;
            });
            setCounts(out);
          },
          fail,
        ),
      () => {},
    );
  }, [enabled]);
  return counts;
}

/** Admin only: every benchmark profile (for heights in exports). */
export function useAllBenchmarkProfiles(enabled: boolean) {
  const [profiles, setProfiles] = useState<Record<string, BenchmarkProfile>>({});
  useEffect(() => {
    if (!enabled) return;
    return resilient(
      (ok, fail) =>
        onSnapshot(
          collection(db, 'benchmarkProfiles'),
          (snap) => {
            ok();
            const out: Record<string, BenchmarkProfile> = {};
            snap.docs.forEach((d) => (out[d.id] = d.data() as BenchmarkProfile));
            setProfiles(out);
          },
          fail,
        ),
      () => {},
    );
  }, [enabled]);
  return profiles;
}

export interface EntryDraft {
  /** The date the member picked, if they changed it before saving. */
  date?: string;
  bodyweight: number | null;
  heightIn: number | null;
  results: Record<string, number | null>;
  wallSquatFaults: string[];
  /** Day the draft was last written (YYYY-MM-DD). Set by `write`. */
  writtenOn?: string;
}

const draftKey = (uid: string, key: string) => `benchmark:draft:${uid}:${key}`;

/**
 * Device-side backup of an unsaved benchmark. `key` is the saved benchmark's
 * date, or "new". Written on every change; cleared after save or delete.
 * `loaded` is only true once the draft for the *current* key has been read.
 */
export function useEntryDraft(uid: string | undefined, key: string) {
  const [state, setState] = useState<{
    key: string;
    draft: EntryDraft | null;
  } | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    AsyncStorage.getItem(draftKey(uid, key))
      .then((raw) => {
        let d = raw ? (JSON.parse(raw) as EntryDraft) : null;
        // An unsaved *new* benchmark from an earlier day is stale: restoring it
        // into today's "New benchmark" would put old results on the wrong date.
        if (d && key === 'new' && d.writtenOn !== toIsoDate(new Date())) {
          AsyncStorage.removeItem(draftKey(uid, key)).catch(() => {});
          d = null;
        }
        if (alive) setState({ key, draft: d });
      })
      .catch(() => alive && setState({ key, draft: null }));
    return () => {
      alive = false;
    };
  }, [uid, key]);

  const loaded = state?.key === key;
  const draft = loaded ? state!.draft : null;

  const write = useCallback(
    (d: EntryDraft) => {
      if (!uid) return;
      const stamped: EntryDraft = { ...d, writtenOn: toIsoDate(new Date()) };
      AsyncStorage.setItem(draftKey(uid, keyRef.current), JSON.stringify(stamped)).catch(() => {});
    },
    [uid],
  );

  const clear = useCallback(
    (k?: string) => {
      if (!uid) return;
      AsyncStorage.removeItem(draftKey(uid, k ?? keyRef.current)).catch(() => {});
    },
    [uid],
  );

  return { loaded, draft, write, clear };
}
