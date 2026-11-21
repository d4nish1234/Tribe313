/**
 * Turns bodyweight-relative weights into pounds for one member, so plans and
 * standards read "Farmer’s carry at 80% of bodyweight (148 lb)" instead of
 * leaving the maths to them. Used at display time; the data keeps the plain
 * wording so it works for everyone.
 */

/** Round to the nearest 5 lb, the smallest step most gym weights come in. */
export function roundTo5(lb: number): number {
  return Math.round(lb / 5) * 5;
}

/** Round up to the next 5 lb: a target you have to reach, not fall short of. */
export function ceilTo5(lb: number): number {
  return Math.ceil(lb / 5) * 5;
}

/** Round down to the last 5 lb, e.g. loading the bar "to your bodyweight". */
export function floorTo5(lb: number): number {
  return Math.floor(lb / 5) * 5;
}

/** Pounds per hand for a two-handed carry of `totalLb`, rounded up so both hands carry at least half. */
export function perHand(totalLb: number): number {
  return ceilTo5(totalLb / 2);
}

const NUM = String.raw`\d+(?:\.\d+)?`;
/**
 * The phrasings used in the plans and standards:
 * "80% of bodyweight", "85–90% of bodyweight", "1.5× your bodyweight",
 * "at half bodyweight", "at bodyweight", "about your bodyweight".
 * An existing "(… lb)" right after it means it's already been annotated.
 */
const WEIGHT_RE = new RegExp(
  String.raw`(?:(${NUM})(?:\s?[–-]\s?(${NUM}))?% of (?:your )?bodyweight` +
    String.raw`|(${NUM})\s?× (?:your )?bodyweight` +
    String.raw`|\b(?:at|about|to) half (?:your )?bodyweight` +
    String.raw`|\b(?:at|about|to) (?:your )?bodyweight)(?! \(\d)`,
  'gi',
);

/**
 * Add the pounds after every bodyweight-relative weight in `text`.
 * Returns `text` unchanged when bodyweight isn't known.
 */
export function withWeights(text: string, bodyweight: number | null | undefined): string {
  if (typeof bodyweight !== 'number' || !(bodyweight > 0)) return text;
  return text.replace(WEIGHT_RE, (match: string, pct?: string, pctTo?: string, times?: string) => {
    let lb: string;
    if (pct) {
      const a = roundTo5((Number(pct) / 100) * bodyweight);
      lb = pctTo ? `${a}–${roundTo5((Number(pctTo) / 100) * bodyweight)} lb` : `${a} lb`;
    } else if (times) {
      // "1.5× your bodyweight" is a target, so round up like the goal text does.
      lb = `${ceilTo5(Number(times) * bodyweight)} lb`;
    } else if (/half/i.test(match)) {
      lb = `${roundTo5(bodyweight / 2)} lb`;
    } else {
      lb = `${floorTo5(bodyweight)} lb`;
    }
    return `${match} (${lb})`;
  });
}
