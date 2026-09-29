import { COLORS } from '@/styles/colors';

/**
 * One colour per game, for as long as the plan holds it.
 *
 * The Plan drew the same two games three times — a verdict, a week and
 * a route — and nothing tied the three pictures together, so the reader
 * had to match them up by name every time. Colour does that work for
 * free: the block in Tuesday's evening, the dot on the route row and
 * the swatch in the legend are the same colour, so "the amber one" is a
 * thing you can think.
 *
 * Assigned by position in the route rather than by id, so the first
 * game is always the accent — the next hours you will spend — and the
 * ordering itself carries meaning. Three is enough: a week rarely holds
 * more, and adjacent games are what have to be told apart.
 *
 * Amber and then two greys, not three of the palette's meanings. The
 * third game used to be mint by nothing but its position, drawn beside
 * mint "done" stamps and a mint credits flag — so "the third thing in
 * the plan" and "finished" were the same colour on the same card. The
 * greys only have to be told apart from each other and from amber,
 * which lightness does without borrowing a meaning.
 */
const PALETTE = [COLORS.accent, COLORS.lightGrey, '#7F8AA3'] as const;

export const planColour = (index: number): string =>
  PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
