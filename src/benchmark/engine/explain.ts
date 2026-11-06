import type { GlossaryEntry } from '../types';

export type Span =
  | { kind: 'text'; text: string }
  | { kind: 'term'; text: string; entry: GlossaryEntry }
  | { kind: 'sets'; text: string; title: string; explanation: string };

/**
 * Matches prescriptions like "3×8", "4×30 sec", "2×10 each", "4 × max",
 * "4×50 ft each side", "3×8 each leg".
 */
const SETS_RE = /(\d+)\s?×\s?(\d+|max)(?:\s?(sec|ft|cal))?(?:,?\s(each)(?:\s(side|leg))?)?/y;

const isWordChar = (c: string | undefined) => !!c && /[A-Za-z0-9]/.test(c);

export function explainSets(text: string): { title: string; explanation: string } | null {
  SETS_RE.lastIndex = 0;
  const m = SETS_RE.exec(text);
  if (!m) return null;
  return describe(m);
}

function describe(m: RegExpExecArray): { title: string; explanation: string } {
  const sets = Number(m[1]);
  const amount = m[2];
  const unit = m[3];
  const each = m[4];
  const side = m[5];
  const setsWord = `${sets} time${sets === 1 ? '' : 's'} (${sets} set${sets === 1 ? '' : 's'})`;
  let what: string;
  if (amount === 'max') what = 'as many reps as you can each time';
  else if (unit === 'sec') what = `hold for ${amount} seconds each time`;
  else if (unit === 'ft') what = `cover ${amount} ft each time`;
  else if (unit === 'cal') what = `${amount} calories each time`;
  else what = `${amount} reps each time`;
  const eachText = each ? (side === 'leg' ? ' on each leg' : ' on each side') : '';
  const rest = unit === 'ft' ? 'Rest about 1–2 minutes between sets.' : 'Rest 1–2 minutes between sets.';
  return {
    title: m[0],
    explanation: `Do this ${setsWord}, ${what}${eachText}. ${rest}`,
  };
}

interface Matcher {
  phrase: string;
  lower: string;
  entry: GlossaryEntry;
}

const cache = new WeakMap<GlossaryEntry[], Matcher[]>();

function matchersFor(glossary: GlossaryEntry[]): Matcher[] {
  let m = cache.get(glossary);
  if (!m) {
    m = glossary
      .flatMap((entry) => entry.matches.map((phrase) => ({ phrase, lower: phrase.toLowerCase(), entry })))
      .sort((a, b) => b.phrase.length - a.phrase.length);
    cache.set(glossary, m);
  }
  return m;
}

/**
 * Split plan text into plain text, tappable glossary terms (longest phrase
 * first, whole words, case-insensitive) and tappable N×M prescriptions.
 */
export function tokenize(text: string, glossary: GlossaryEntry[]): Span[] {
  const matchers = matchersFor(glossary);
  const lower = text.toLowerCase();
  const out: Span[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf });
    buf = '';
  };

  while (i < text.length) {
    const atBoundary = !isWordChar(text[i - 1]);
    let hit: Span | null = null;
    let len = 0;

    if (atBoundary) {
      for (const m of matchers) {
        if (lower.startsWith(m.lower, i) && !isWordChar(text[i + m.phrase.length])) {
          hit = { kind: 'term', text: text.slice(i, i + m.phrase.length), entry: m.entry };
          len = m.phrase.length;
          break;
        }
      }
      if (!hit && /\d/.test(text[i])) {
        SETS_RE.lastIndex = i;
        const m = SETS_RE.exec(text);
        if (m) {
          const d = describe(m);
          hit = { kind: 'sets', text: m[0], title: d.title, explanation: d.explanation };
          len = m[0].length;
        }
      }
    }

    if (hit) {
      flush();
      out.push(hit);
      i += len;
    } else {
      buf += text[i];
      i++;
    }
  }
  flush();
  return out;
}
