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
 * game is always the accent — the plan's own colour — and the ordering
 * itself carries meaning. Three is enough: a week rarely holds more,
 * and adjacent games are what have to be told apart.
 */
const PALETTE = [COLORS.accent, COLORS.violet, COLORS.mint] as const;

export const planColour = (index: number): string =>
  PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
