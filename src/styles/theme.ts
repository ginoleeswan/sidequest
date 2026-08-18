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

export const LAYOUT = {
  /** Desktop web would otherwise stretch a phone layout across 1400px. */
  maxContentWidth: 720,
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
