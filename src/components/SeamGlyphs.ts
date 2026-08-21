/**
 * Six small things a person who plays games would recognise.
 *
 * Drawn rather than imported. The app's icon set is Ionicons, which is
 * a UI vocabulary — it has a game controller and it looks like every
 * other app's game controller, and these are not controls. They are
 * the skyline on a seam: solid silhouettes resting on a lit edge, so
 * what they need is an outline that reads as a shape against the dark,
 * not a glyph that reads at 16pt in a toolbar.
 *
 * Each is a single closed outline in a 24x24 box, sometimes with a
 * second subpath inside it. The subpath matters: the silhouettes are
 * filled with the even-odd rule, so an inner subpath is a HOLE — the
 * disc's spindle and the cartridge's label window show the section
 * behind straight through the object, which is the one place the seam
 * uses honest-to-goodness negative space.
 *
 * Pure strings, kept out of the component so the shapes can be read as
 * shapes.
 */

export const GLYPH_BOX = 24;

/** A gamepad: two grips, a shoulder, a waist between the handles. */
const CONTROLLER =
  'M6.5 7 h11 a5.5 5.5 0 0 1 5.5 5.5 v1.6 ' +
  'a4.2 4.2 0 0 1 -7.4 2.7 l-1.4 -1.6 h-4.4 l-1.4 1.6 ' +
  'a4.2 4.2 0 0 1 -7.4 -2.7 v-1.6 a5.5 5.5 0 0 1 5.5 -5.5 z';

/** A d-pad, as a plus with square arms. */
const DPAD =
  'M9.2 2.4 h5.6 v6.8 h6.8 v5.6 h-6.8 v6.8 h-5.6 v-6.8 h-6.8 v-5.6 h6.8 z';

/** A disc. The spindle is a second subpath, so it fills back in. */
const DISC =
  'M12 1.6 a10.4 10.4 0 1 0 0.01 0 z ' + 'M12 9.2 a2.8 2.8 0 1 0 0.01 0 z';

/** A cartridge: cut corner, label window, contact slot at the foot. */
const CARTRIDGE =
  'M4 2.6 h12.4 l3.6 3.6 v15.2 h-16 z ' + 'M6.8 5.4 h7.4 v5.2 h-7.4 z';

/** A star, for the one you finished. */
const STAR =
  'M12 1.8 l3.1 6.5 7.1 0.9 -5.2 4.9 1.3 7 -6.3 -3.4 -6.3 3.4 ' +
  '1.3 -7 -5.2 -4.9 7.1 -0.9 z';

/** A life. */
const HEART =
  'M12 21 C 4.2 15.6, 2 11.4, 2 8.4 A 4.8 4.8 0 0 1 12 6.4 ' +
  'A 4.8 4.8 0 0 1 22 8.4 C 22 11.4, 19.8 15.6, 12 21 Z';

export const SEAM_GLYPHS = [
  CONTROLLER,
  DPAD,
  DISC,
  CARTRIDGE,
  STAR,
  HEART,
] as const;

/**
 * Where they sit along the edge.
 *
 * Hand-placed, not random — a random scatter of six things is nearly
 * always worse than a chosen one. The centres are spread almost evenly
 * along the run, then nudged a few percent so the row does not read as
 * a toolbar. The sizes are a hierarchy, not a jitter: one hero at the
 * left anchor (the controller, the pile's emblem), a second lead
 * two-thirds along (the cartridge), mid-weights between them and small
 * accents in the gaps — the big-small rhythm a shelf of real things
 * has, instead of seven objects politely the same size. Tilts
 * alternate direction and stay inside fifteen degrees, which is "set
 * down by hand" rather than "falling over".
 *
 * No vertical numbers at all: each object's centre is pinned to the
 * wavy edge at its own position, so the vertical composition is the
 * wave's, not this table's. (Two
 * failed versions bracket this: cut at four fifths the shapes were
 * nameless fragments; sunk to nine tenths they were icons in a band,
 * nowhere near the seam.)
 *
 * Two sets rather than one filtered set, because good spacing at 1440
 * filtered down is bad spacing at 390 — the survivors inherit gaps
 * made for a row twice as long.
 */
export interface SeamGlyphPlacement {
  glyph: number;
  /** Centre position along the run, 0 to 1. */
  at: number;
  size: number;
  /** Degrees. */
  tilt: number;
}

export const SEAM_SCATTER_WIDE: SeamGlyphPlacement[] = [
  { glyph: 0, at: 0.05, size: 72, tilt: -7 },
  { glyph: 4, at: 0.21, size: 34, tilt: 12 },
  { glyph: 2, at: 0.35, size: 56, tilt: 0 },
  { glyph: 5, at: 0.475, size: 32, tilt: -9 },
  { glyph: 3, at: 0.62, size: 60, tilt: 6 },
  { glyph: 1, at: 0.78, size: 42, tilt: -6 },
  { glyph: 0, at: 0.94, size: 36, tilt: 14 },
];

/** A phone gets the three that read fastest, spaced for its own run. */
export const SEAM_SCATTER_NARROW: SeamGlyphPlacement[] = [
  { glyph: 0, at: 0.14, size: 64, tilt: -6 },
  { glyph: 2, at: 0.5, size: 50, tilt: 0 },
  { glyph: 3, at: 0.86, size: 54, tilt: 8 },
];

/** Below this width the narrow set is used. */
export const SEAM_GLYPH_NARROW = 700;
