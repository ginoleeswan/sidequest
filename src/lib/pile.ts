/**
 * The landing page's one statistic, and the sum it is evidence for.
 *
 * This lives here, away from the band that draws it, because the page
 * got it wrong the first time and got it wrong in a way no reviewer
 * caught. The band stated 900 hours, then "the average week has about
 * six", then "that's fifteen years of evenings" — and 900 over 6 is a
 * hundred and fifty weeks, which is under three years. The conclusion
 * was five times its own arithmetic, sitting in the largest type on the
 * page, in the one band whose entire purpose is a calculation.
 *
 * It went unnoticed because the three numbers were three separate
 * strings: nothing tied the verdict to the operands, so the operands
 * could change, or be written down wrong to begin with, and the verdict
 * would sit there being confidently false. The reader this band exists
 * for is the one who does the division. That reader was the only one
 * guaranteed to find the mistake.
 *
 * So the verdict is computed, and the words are computed with it.
 * Changing either number changes the sentence, which is what should
 * happen; neither can leave a stale claim behind, which is what did.
 */

/** Hours of unplayed games in an average pile. */
export const PILE_HOURS = 900;

/** Hours a week the average person actually gets to play. */
export const HOURS_A_WEEK = 6;

/**
 * How long the pile would take, in years, rounded to a whole one.
 *
 * A verdict, not a measurement: "two point nine years of evenings" is
 * an answer to a question nobody asked in those terms.
 */
export const PILE_YEARS = Math.round(PILE_HOURS / HOURS_A_WEEK / 52);

/**
 * Small numbers, spelled out.
 *
 * The band's sentence is prose, and prose does not say "3 years" beside
 * a numeral set at two hundred points. Spelled here rather than typed
 * into the sentence so the words cannot drift from the arithmetic that
 * produced them — which is the exact way "fifteen years" outlived the
 * sum it came from.
 */
const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

export function inWords(value: number): string {
  return WORDS[value] ?? String(value);
}

/**
 * The band's whole argument, in one sentence.
 *
 * Copy usually belongs beside the thing that draws it, and this is the
 * exception that earns its place: every word of it that carries meaning
 * is one of the numbers above. Written in the component, it is a string
 * that merely happens to agree with them today.
 */
export const PILE_VERDICT = `At ${inWords(HOURS_A_WEEK)} hours a week, that’s ${inWords(PILE_YEARS)} years of evenings.`;
