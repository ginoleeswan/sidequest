/**
 * The phone masthead's fixed measures, shared with its skeleton.
 *
 * The masthead has been three things. A screenshot cropped to a
 * portrait screen, which lost whatever the frame was composed around.
 * Then the box, standing on a blur of its own artwork — which was
 * honest to the shelves the app is built from, and said the game's
 * name twice: box art carries its own title, and the publisher's logo
 * repeated it directly underneath.
 *
 * It is now the banner. SteamGridDB's hero and its logo are designed
 * as a pair — the hero is shot deliberately WITHOUT a title because
 * the logo is meant to be composited onto it, which is exactly what
 * Valve's own library does with the same two files. Used that way the
 * name appears once, set in the type its publisher drew for it, over
 * art composed to carry it.
 */

/**
 * The band's own proportions, and why they are not the hero's.
 *
 * A hero is 3.1:1. Shown at that ratio on a 390-point phone it is 126
 * points tall — a letterbox, and barely half of any band worth calling
 * a masthead. Composited over a blurred copy of itself it gains the
 * height and gains a seam with it: a straight line across the page
 * where the sharp frame stops, which no ramp gentle enough to let the
 * blur show is strong enough to hide.
 *
 * So one picture fills the band, and the height is bought with a crop.
 * Which side it comes off matters more than how much. Valve's
 * convention puts the subject hard right and leaves the left clear,
 * because Steam composites the logo there — so a centre crop takes a
 * bite out of the one thing the picture is of. Directive 8020's
 * astronaut stands at the right edge. The crop therefore comes off the
 * left, and what it spends is the empty half the logo was meant for,
 * which this design does not use: the mark is centred, low, on the
 * ramp.
 *
 * A 16:9 screenshot standing in for a missing hero is cropped top and
 * bottom against the same box, and centred — the middle of a game
 * frame is where the game is.
 */
export const BAND_RATIO = 1.8;

/**
 * The title treatment's box, low on the art.
 *
 * A fixed slot because the typed name arrives first and the logo
 * replaces it when it lands: without a reserved height the masthead
 * would resize under the reader as the taller mark came in.
 */
export const TITLE_SLOT = 64;

/**
 * The whole band, including the part behind the status bar.
 *
 * The art runs to the top of the document — under the clock, under the
 * brand — so the inset is part of the band rather than a bite out of
 * the picture.
 */
export const bannerHeight = (width: number, top: number): number =>
  top + Math.round(width / BAND_RATIO);
