/**
 * Search-and-select screen, used like a dialog you can `await`.
 *
 *   const exercise = await pickOne({ title: 'Choose exercise', items: names.map(toPickItem) });
 *   if (exercise) setText(exercise);              // null = they went Back
 *
 *   const uids = await pickMany({
 *     title: 'Choose members',
 *     items: members.map((m) => ({ id: m.uid, title: fullName(m), subtitle: m.email })),
 *     selected: currentUids,                      // pre-ticked
 *   });
 *
 * It opens app/pick.tsx: a search field on top and the list in the shared row
 * cards (src/components/Cards.tsx). Single pick returns on the first tap;
 * multi pick ticks rows and returns on Done. Back returns null either way.
 *
 * Options:
 * - `items`: { id, title, subtitle?, keywords? }. Ids must be unique. Search matches title,
 *   subtitle and keywords with the app's one search rule (src/lib/search.ts).
 * - `allowCustom`: offer "Use '<what they typed>'" when it isn't an exact item;
 *   the typed text comes back as the id. For free text with suggestions.
 * - `searchPlaceholder`, `emptyText`: wording.
 *
 * Why a module-level request instead of route params: params are strings in a
 * URL, so they can't carry a list of hundreds of items or a callback. The
 * request lives here for the life of the pick screen; only one is open at a
 * time, and opening another cancels the first. The pick screen is a singular
 * route, so a second push (a double tap) reuses the open screen: it follows
 * `subscribePick` and switches to the newest request.
 */
import { router } from 'expo-router';
import { matchesWords } from './search';

export interface PickItem {
  /** What comes back when this item is chosen. */
  id: string;
  title: string;
  subtitle?: string | null;
  /** Extra words to search on that aren't shown (e.g. an email). */
  keywords?: string;
}

export interface PickOptions {
  /** Screen title, e.g. "Choose exercise". */
  title: string;
  items: PickItem[];
  /** Pre-selected ids (multi pick), or the current value (single pick, shown ticked). */
  selected?: string[];
  allowCustom?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
}

export interface PickRequest extends PickOptions {
  key: number;
  multiple: boolean;
  resolve: (ids: string[] | null) => void;
}

let current: PickRequest | null = null;
let nextKey = 1;
const listeners = new Set<() => void>();

function setCurrent(req: PickRequest | null) {
  current = req;
  listeners.forEach((l) => l());
}

/** Be told when the open request changes (a new one starts, or it finishes). Returns unsubscribe. */
export function subscribePick(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Start a pick without navigating. Used by pickOne/pickMany and by tests. */
export function startPick(options: PickOptions, multiple: boolean): Promise<string[] | null> {
  // Opening a picker while another is open cancels the first.
  current?.resolve(null);
  return new Promise((resolve) => {
    const key = nextKey++;
    setCurrent({
      ...options,
      key,
      multiple,
      resolve: (ids) => {
        if (current?.key === key) setCurrent(null);
        resolve(ids);
      },
    });
  });
}

/** The open request, for app/pick.tsx. */
export function currentPick(): PickRequest | null {
  return current;
}

/** Finish request `key` with these ids, or null if cancelled. Ignored if it's already finished. */
export function finishPick(key: number, ids: string[] | null): void {
  if (current?.key === key) current.resolve(ids);
}

export async function pickOne(options: PickOptions): Promise<string | null> {
  const done = startPick(options, false);
  router.push('/pick');
  const ids = await done;
  return ids?.[0] ?? null;
}

export async function pickMany(options: PickOptions): Promise<string[] | null> {
  const done = startPick(options, true);
  router.push('/pick');
  return done;
}

/** Plain strings as items (id and title are the same text). */
export function toPickItem(text: string): PickItem {
  return { id: text, title: text };
}

/**
 * The rows to show for a search: matching items in their original order, plus
 * a "custom" row first when allowed and the text isn't already an item.
 */
export function filterPickItems(
  items: PickItem[],
  query: string,
  allowCustom = false,
): { custom: string | null; items: PickItem[] } {
  const matched = items.filter((it) =>
    matchesWords(`${it.title} ${it.subtitle ?? ''} ${it.keywords ?? ''}`, query),
  );
  const typed = query.trim();
  const exact = items.some((it) => it.title.trim().toLowerCase() === typed.toLowerCase());
  return { custom: allowCustom && typed && !exact ? typed : null, items: matched };
}
