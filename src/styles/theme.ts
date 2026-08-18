/** Design tokens. Prefer these over inline magic numbers. */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 15,
  lg: 20,
  xl: 30,
} as const;

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
  gridGap: 18,
  shelfTileWidth: 168,
  /** Cover-art tiles: portrait, like a storefront. */
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
