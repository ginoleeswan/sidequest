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
  cardWidth: 170,
  cardWideWidth: 300,
  cardHeight: 200,
  rowCardHeight: 100,
  mediaHeight: 200,
  mediaWidth: 300,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  hero: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 3.84,
    elevation: 10,
  },
} as const;
