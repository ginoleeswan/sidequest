import { StyleSheet } from 'react-native';

import { COLORS } from './colors';

/**
 * The type scale.
 *
 * Before this, 132 pieces of text carried 66 distinct combinations of
 * family, size and tracking — including half-pixel sizes like 12.5 and
 * 13.5, which is what eyeballing one screen at a time produces. Worse,
 * most set no line height at all and inherited the platform default,
 * so paragraph rhythm changed depending on where you were standing.
 *
 * Every step below sets its own line height, and every Black step carries
 * negative tracking: Noah is a geometric sans, and geometric blacks set
 * at display sizes look gappy at the metric spacing that suits body copy.
 *
 * Noah Black carries display and headings, Noah Bold carries UI labels,
 * Noah Regular carries prose. Reach for the nearest step rather than
 * adding a new one — a scale only works if it is the only thing in use.
 */
export const TYPE = StyleSheet.create({
  // ---- Display: Geom ExtraBold (the wordmark: Geom Black). h2 down: Noah Bold ----
  //
  // Two faces, two jobs. Geom carries the wordmark and every display
  // moment - the masthead, the verdict, the big figure - and Noah Bold
  // carries the furniture. A rounded black doing both was one voice
  // at every volume; a geometric with more edge at the top, and Noah
  // below it, is a hierarchy you can hear.
  display: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: COLORS.white,
  },
  title: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: COLORS.white,
  },
  h1: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: COLORS.lightGrey,
  },
  /**
   * From h2 down, Bold rather than Black. When one black geometric face
   * carried the masthead, every shelf title and every badge, nothing on
   * the page was louder than anything else - the sound of a design with
   * no hierarchy. Black now belongs to display moments (display, title,
   * h1, numeral); the section furniture steps back a weight so those
   * moments actually land.
   */
  h2: {
    fontFamily: 'Noah-Bold',
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: COLORS.lightGrey,
  },
  h3: {
    fontFamily: 'Noah-Bold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.1,
    color: COLORS.lightGrey,
  },
  h4: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.lightGrey,
  },

  // ---- UI labels: Noah Bold ----
  label: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.lightGrey,
  },
  labelSmall: {
    fontFamily: 'Noah-Bold',
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.lightGrey,
  },
  labelTiny: {
    fontFamily: 'Noah-Bold',
    fontSize: 11.5,
    lineHeight: 15,
    color: COLORS.lightGrey,
  },
  /** Tiny uppercase labels: stats, section eyebrows, nav headings. */
  micro: {
    fontFamily: 'Noah-Bold',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
  },
  /** Tracked, but sentence case — pills and metadata that read as words. */
  tag: {
    fontFamily: 'Noah-Bold',
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.5,
    color: COLORS.mediumGrey,
  },

  // ---- Prose: Noah Regular ----
  body: {
    fontFamily: 'Noah-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.lightGrey,
  },
  p: {
    fontFamily: 'Noah-Regular',
    fontSize: 13,
    lineHeight: 19.5,
    color: COLORS.lightGrey,
  },
  caption: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.mediumGrey,
  },
  fine: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.mediumGrey,
  },

  /** Oversized watermark numerals: ranked tiles, the stats hero. */
  numeral: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -6,
    color: COLORS.white,
  },
});

/**
 * Text set over artwork.
 *
 * Where the background is a photograph nobody chose, contrast is not a
 * property of the palette — a scrim tuned for dark key art is invisible
 * over bright, and axe cannot evaluate either. A soft shadow buys the
 * contrast back without painting over the picture.
 *
 * Two steps, because there are two jobs: display type can carry a wide
 * soft shadow that would smear a caption, and small text needs a tight
 * one. These grew as nine hand-tuned pairs scattered across four files
 * — 0.5/18, 0.55/12, 0.6/8, 0.6/10, 0.65/9, 0.65/10, 0.7/8, 0.7/10 —
 * which is what eyeballing a number instead of using a scale looks
 * like.
 */
/**
 * The wordmark. Lowercase on purpose: "sidequest" is a product's name
 * said the way people say it, where SIDEQUEST was a badge shouting it.
 * Every lockup in the app sets it from here, so it cannot drift.
 */
export const WORDMARK = {
  fontFamily: 'Geom-Black',
  fontSize: 22,
  lineHeight: 27,
  letterSpacing: -0.5,
  color: COLORS.lightGrey,
  // Enforced here, not trusted to the string: a lockup that receives
  // "Sidequest" or "SIDEQUEST" from anywhere still renders lowercase.
  textTransform: 'lowercase',
} as const;

export const OVER_IMAGE = StyleSheet.create({
  /**
   * Contact shadows, not glows. The wide soft halo these used to be
   * (16px of blurred black around every headline) is the single
   * cheapest-reading effect a dark UI can wear - it says the gradient
   * failed. Legibility is the scrim's job now; what remains here is a
   * tight one-pixel grounding that reads as crisp type, not as an
   * effect, and only exists for the frame where art loads unscrimmed.
   */
  heading: {
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  body: {
    textShadowColor: 'rgba(0,0,0,0.40)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
