/** Lowercase and strip accents, so "jose" finds "José". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * The app's one search rule: every word typed must appear somewhere in the
 * text, in any order, ignoring case and accents. "smith jo" finds "John Smith".
 * A blank query matches everything.
 */
export function matchesWords(text: string, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(text);
  return words.every((w) => haystack.includes(w));
}
