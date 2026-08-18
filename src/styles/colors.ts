export const COLORS = {
  white: '#FFFFFF',
  plum: '#CB2664',
  blue: '#1E69E1',
  lightGrey: '#D8DAE4',
  // 4.6:1 on darkGrey, AA for body text on every surface.
  mediumGrey: '#A3A9B8',
  darkGrey: '#333D51',
  navy: '#272F3F',
  /** Raised surface one step above navy. */
  surface: '#2C3547',
  /** Hairline strokes on dark surfaces. */
  stroke: 'rgba(255,255,255,0.08)',
  strokeStrong: 'rgba(255,255,255,0.16)',
} as const;

/** RAWG community-rating buckets. */
export const RATING_COLORS: Record<string, string> = {
  exceptional: '#6DC849',
  recommended: '#4A90E2',
  meh: '#FDCA52',
  skip: '#FC4B37',
};
