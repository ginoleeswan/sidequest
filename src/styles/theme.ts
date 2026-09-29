import { Platform, type ViewStyle } from 'react-native';

import { COLORS } from './colors';

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
  /** Hairline air: a caption tucked under its figure. */
  xxs: 2,
  xs: 4,
  sm: 8,
  /**
   * Ten was the most-used distance in the app with no name: written
   * `SPACING.sm + 2` sixty-three times. A value spelled as arithmetic
   * that often is a token the scale forgot.
   */
  sm2: 10,
  md: 16,
  lg: 20,
  xl: 32,
  /** Between chapters of a long page, where xl is only between rows. */
  xxl: 48,
  xxxl: 64,
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
  /** Thumbnails and tags inside a row. */
  xs: 4,
  sm: 10,
  /**
   * A card up to about 130pt tall. Twenty-two on a short card reads as
   * a pill; this is the radius a card that size wants.
   */
  card: 14,
  md: 22,
  lg: 30,
  xl: 40,
  /** Fully round ends, whatever the height. */
  pill: 999,
} as const;

/**
 * The radius a child needs to sit concentric inside its parent: the
 * parent's radius less the distance between their edges. A row with the
 * same radius as the panel it sits in draws corners that bulge.
 */
export function innerRadius(outer: number, inset: number): number {
  return Math.max(outer - inset, 2);
}

/** Icon sizes. Sixteen sizes had grown; four do every job. */
export const ICON = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
} as const;

/**
 * The smallest thing a finger can reliably hit: 44pt, Apple's number
 * and near enough Android's 48dp. Controls drawn smaller make up the
 * difference with hit slop rather than growing.
 */
export const TOUCH = { min: 44 } as const;

/** Hit slop, for a control whose drawing is smaller than `TOUCH.min`. */
export const HIT_SLOP = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  /** Text links in a line: grow up and down, never into the next word. */
  text: { top: 14, bottom: 14, left: 4, right: 4 },
} as const;

/** The dim a pressed text or icon control takes. */
export const PRESSED_OPACITY = 0.6;

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
  /**
   * A search result's poster: a box on a shelf at the height of two
   * lines of type and a fact, the 3:4 the tiles use.
   */
  resultPoster: { width: 56, height: 75 },
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
 *
 * Two layers each, because one is not how a thing sits on a surface: a
 * tight contact shadow where it touches, and a wide, pulled-in ambient
 * one that says how far it stands off. A single blur does neither well
 * — it is too soft to ground the card and too hard to lift it.
 *
 * `boxShadow`, not the `shadow*` props, and that is a fix rather than a
 * preference. On iOS the old props are drawn on the view's own layer,
 * so every card that also clips its artwork (`overflow: 'hidden'`, which
 * every cover tile does) clipped its shadow with it, and the shelves had
 * none. They also follow the fill's alpha, and the app's panels are
 * three per cent white — a shadow cast by almost nothing. `boxShadow` is
 * drawn outside the border box on both platforms whatever the fill is,
 * and the web was already reading it as CSS.
 */
export const SHADOW = {
  card: {
    boxShadow:
      '0 1px 2px rgba(9,12,19,0.30), 0 10px 24px -6px rgba(9,12,19,0.45)',
  },
  hero: {
    boxShadow:
      '0 2px 4px rgba(9,12,19,0.30), 0 18px 40px -10px rgba(9,12,19,0.55)',
  },
  /** Things that float over the page: toasts, sheets, menus. */
  float: {
    boxShadow:
      '0 2px 6px rgba(9,12,19,0.35), 0 16px 36px -8px rgba(9,12,19,0.6)',
  },
} as const;

/**
 * The light along a surface's top edge.
 *
 * A dark UI with no highlights is lit from nowhere, and every card in
 * it reads as a hole cut in the page or a sticker on it — never as an
 * object. One pixel of light inside the top edge is the smallest thing
 * that says "this is nearer the lamp than the ground is", which is all
 * a raised surface is. An inset, so it rides inside the hairline and
 * follows the radius without a view of its own.
 */
const EDGE_LIGHT = 'inset 0 1px 0 rgba(255,255,255,0.07)';

/**
 * The same light, falling across the face: a few per cent at the top,
 * less at the foot. Native only — `experimental_backgroundImage` is not
 * a property react-native-web knows, and on the desk the page's own
 * grain and the hover states already give the panels a surface.
 */
const SHEEN =
  'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 70%)';

/**
 * Surfaces, as materials rather than as a colour and a border.
 *
 * The panels were `raised` + `stroke` + `SHADOW.card` spelled out in a
 * dozen places, which is how the app ended up with one recipe that was
 * right in the stylesheet and flat on the phone. These are the recipes,
 * whole: spread one and a surface is lit, edged and lifted the same way
 * as every other surface of its kind.
 */
export const MATERIAL = {
  /** A panel on the page: the Plan's week, the library's backlog. */
  plate: {
    backgroundColor: COLORS.raised,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    boxShadow: `${EDGE_LIGHT}, ${SHADOW.card.boxShadow}`,
    ...Platform.select<ViewStyle>({
      web: {},
      default: { experimental_backgroundImage: SHEEN },
    }),
  },
  /**
   * A row inside a list of rows. The edge, and only a contact shadow:
   * ten cards each casting a wide shadow onto the next is a stack of
   * smudges, not a list.
   */
  row: {
    backgroundColor: COLORS.raised,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    boxShadow: `${EDGE_LIGHT}, 0 1px 2px rgba(9,12,19,0.28)`,
  },
  /** Just the lit edge, for a surface that already has its own depth. */
  edge: { boxShadow: EDGE_LIGHT },
} as const satisfies Record<string, ViewStyle>;
