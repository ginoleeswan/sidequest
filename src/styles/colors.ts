export const COLORS = {
  white: '#FFFFFF',
  /**
   * The accent. Amber reads as credits rolling and lamp-lit evenings —
   * the warm note in a cool UI, and thematically exact for an app about
   * finishing things rather than starting them.
   */
  accent: '#F2A93B',
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
  /**
   * The faint lift a card gets off the page. One value, because it was
   * eight places at 0.03 and one at 0.035 — a difference nobody can see
   * and nobody meant.
   */
  raised: 'rgba(255,255,255,0.03)',
  /**
   * A control sitting on artwork rather than on the page: header chips,
   * the stage's ghost action. Dark enough for a blown-out frame, since
   * what is behind it is whatever the API returned.
   */
  plate: 'rgba(18,24,36,0.55)',
  /** The stroke that goes with `plate` — a hairline vanishes on a photo. */
  strokeOnImage: 'rgba(255,255,255,0.22)',
  /**
   * The veil every piece of cover art wears.
   *
   * Nothing in this app's imagery was chosen by anyone here: it is a
   * few thousand publishers' key art, shot and graded to a few thousand
   * different briefs. A golden fantasy poster next to an ice-blue
   * roguelike next to a blood-red soulslike is not a palette, and no
   * amount of layout makes a page out of it. A common veil at the app's
   * own colour gives them one black point and one cast to share, which
   * is what a colourist does to make disparate footage read as one
   * film.
   */
  grade: 'rgba(39,47,63,0.14)',
} as const;

/** RAWG community-rating buckets. */
export const RATING_COLORS: Record<string, string> = {
  exceptional: '#6DC849',
  recommended: '#4A90E2',
  meh: '#FDCA52',
  skip: '#FC4B37',
};
