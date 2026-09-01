/** Design tokens. Prefer these over inline magic numbers. */

/**
 * Every distance in the app, on a four-point grid.
 *
 * It was 4/8/15/20/30, which is a grid with two values that are not on
 * it: fifteen and thirty are neither multiples of four nor of each
 * other, so a stack of three medium gaps and a stack of two large ones
 * — 45 against 40 — nearly agreed and did not, everywhere, forever.
 * That near-agreement is what "not quite aligned" looks like when you
 * cannot point at it.
 *
 * Sixteen and thirty-two put the whole scale on the grid at a cost of
 * one and two points respectively, which changes no layout and settles
 * every one of those almost-matches.
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
} as const;

/**
 * The one distance between the edge of the screen and anything you read.
 *
 * Measured across every route, the app had three: the plan, the import,
 * the memcard, the tidy screen and the shared plan started their
 * headings 15pt in; the privacy page and the landing page 20; the
 * library 30. Nobody notices any single one of those and everybody
 * notices moving between them — the page appears to shift sideways
 * under the thumb as you navigate, which is the specific feeling of a
 * design that has not been drawn to a grid.
 *
 * One number, on the 4pt grid, big enough to be a margin on a 320pt
 * phone and small enough not to squeeze a grid on a 1600pt one.
 */
export const GUTTER = 20;

export const RADIUS = {
  sm: 10,
  md: 22,
  lg: 30,
  xl: 40,
} as const;

/**
 * Vertical room a shadow needs to render without being clipped by a
 * scroller's overflow: offset + blur radius. Keep in sync with SHADOW.
 */
export const SHADOW_ROOM = {
  card: 28,
  hero: 48,
} as const;

export const BREAKPOINTS = {
  /** At/above this width the app switches to a sidebar + grid layout. */
  expanded: 900,
  wide: 1400,
} as const;

export const LAYOUT = {
  /** Caps the compact (phone) layout when shown on a wide screen. */
  maxContentWidth: 720,
  /** Caps the expanded layout so a 4K monitor doesn't get a billboard. */
  maxExpandedWidth: 1600,
  sidebarWidth: 232,
  /** The rail folded: the Mark, the glyphs, the hour. */
  railWidth: 72,
  gridGap: 18,
  shelfTileWidth: 168,
  shelfTileLarge: 220,
  /**
   * The landscape frame, for rows that break the poster rhythm.
   *
   * A page of nothing but box art is as monotonous as a page of nothing
   * but screenshots was; the streaming apps this borrows from alternate
   * poster rows with wide ones, and the wide one is where a screenshot
   * belongs - it is the shape the picture already is.
   */
  shelfTileWide: 272,
  tileAspectWide: 16 / 9,
  /**
   * Box-art portrait, the shape every storefront shelves games in.
   * Landscape was the honest shape when RAWG screenshots were all the
   * art we had; now IGDB supplies real covers, and a cover cropped to
   * 16:10 was the dishonest version. RAWG art that still appears - the
   * hover cycle, games IGDB lacks - crops to portrait instead, which
   * reads as a deliberate frame rather than a squashed box.
   */
  tileAspect: 3 / 4,
  cardWidth: 170,
  cardWideWidth: 300,
  cardHeight: 200,
  rowCardHeight: 100,
  mediaHeight: 200,
  mediaWidth: 300,
} as const;

/**
 * Shadows are diffuse by design: blur must comfortably exceed offset or the
 * shadow renders as a crisp shifted copy of the card (visible corners below
 * the real ones) instead of soft depth.
 */
export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  hero: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 34,
    elevation: 12,
  },
} as const;
