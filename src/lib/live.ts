import {
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

/**
 * Keeps a Firestore listener alive. Firestore closes a listener for good after
 * an error (e.g. permission-denied while rules or the user's approval are
 * still propagating, or a dropped connection), which left screens frozen until
 * the app restarted. This re-subscribes with backoff (1s, 2s, 4s… up to 30s)
 * until it succeeds. `onFail` runs on each error, e.g. to end a loading state;
 * whatever was already on screen stays.
 */
export function resilient(
  subscribe: (ok: () => void, fail: (e: FirestoreError) => void) => Unsubscribe,
  onFail: () => void = () => {},
): Unsubscribe {
  let unsub: Unsubscribe | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let attempt = 0;
  const start = () => {
    unsub = subscribe(
      () => {
        attempt = 0;
      },
      (e) => {
        if (__DEV__) console.warn('[firestore] listener error, retrying:', e.code);
        onFail();
        unsub?.();
        unsub = null;
        if (stopped) return;
        timer = setTimeout(start, Math.min(30000, 1000 * 2 ** attempt++));
      },
    );
  };
  start();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsub?.();
  };
}

/** onSnapshot for a query, kept alive with `resilient`. Use this for every live query. */
export function listenQuery<T>(q: Query<T>, onData: (snap: QuerySnapshot<T>) => void, onFail?: () => void) {
  return resilient(
    (ok, fail) =>
      onSnapshot(
        q,
        (snap) => {
          ok();
          onData(snap);
        },
        fail,
      ),
    onFail,
  );
}

/** onSnapshot for one document, kept alive with `resilient`. */
export function listenDoc<T>(
  ref: DocumentReference<T>,
  onData: (snap: DocumentSnapshot<T>) => void,
  onFail?: () => void,
) {
  return resilient(
    (ok, fail) =>
      onSnapshot(
        ref,
        (snap) => {
          ok();
          onData(snap);
        },
        fail,
      ),
    onFail,
  );
}
