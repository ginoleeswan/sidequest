export const COLORS = {
  white: '#FFFFFF',
  /**
   * The accent. Amber reads as credits rolling and lamp-lit evenings —
   * the warm note in a cool UI, and thematically exact for an app about
   * finishing things rather than starting them.
   */
  accent: '#F2A93B',
  /**
   * The supporting cast. One amber note played on every element is a
   * palette in name only — it stops reading as an accent the third
   * time it appears in a viewport. These three exist so the big ideas
   * can each own a colour, and they are semantic, not decorative:
   * amber is time and the trail, violet is the evening (tonight, the
   * plan, the moon), mint is finishing (credits, done, the stamp on a
   * good year), coral is letting go (drops, amnesty). Values chosen to
   * clear AA for small text on the navy ground.
   */
  violet: '#9D8FFF',
  mint: '#3ECF8E',
  coral: '#F87168',
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
  /** The community-rating star. Warmer than the accent on purpose. */
  starGold: '#FFD300',
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

  /**
   * The same meanings, set as text on the page ground.
   *
   * Violet and coral clear AA on navy but not on darkGrey, where most
   * text sits: 4.05:1 and 3.92:1, below the 4.5 small type needs. Fills,
   * strokes and marks keep the originals; words in those colours on the
   * page use these, which are the same hue lifted until they read.
   */
  violetText: '#B0A5FF',
  coralText: '#FF8F85',
  /** A LIVE badge's fill: white on it is 4.6:1, white on coral was 2.8. */
  live: '#D93A30',

  /**
   * The darks under the navy.
   *
   * Fourteen hand-mixed near-blacks had grown across the app — shadow
   * colours, sheet fills, scrim stops — none of them named, so none of
   * them agreed. Three steps cover every job they were doing.
   */
  /** Shadow and the deepest scrim: the colour depth is drawn in. */
  ink: '#090C13',
  /** A surface sunk below the navy. */
  inkRaised: '#161C27',
  /** Floating chrome: toasts, the sheet's backdrop plate. */
  inkSurface: '#1D2431',
} as const;

/**
 * A token at an opacity. `alpha(COLORS.navy, 0)` rather than a
 * hand-typed `rgba(39,47,63,0)`, so a gradient stop cannot drift from
 * the colour it is fading.
 */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
