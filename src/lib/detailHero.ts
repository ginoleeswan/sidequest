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
 * How wide the artwork is against its height.
 *
 * A hero is 3.1:1 and a phone is 390 points across, so its own
 * proportions give a 126-point band — a letterbox, not a masthead.
 * 2.4 is the most height that can be taken before the crop starts
 * eating the subject: it trims a fifth of a hero's width, and it
 * trims top and bottom off the 16:9 screenshot that stands in when a
 * game has no hero, which is the direction a screenshot survives.
 */
export const BANNER_RATIO = 2.4;

/**
 * The title treatment's box, at the foot of the art.
 *
 * A fixed slot because the typed name arrives first and the logo
 * replaces it when it lands: without a reserved height the masthead
 * would resize under the reader as the taller mark came in.
 */
export const TITLE_SLOT = 64;

/**
 * How tall the masthead is, including the part behind the status bar.
 *
 * The art runs to the top of the document — under the clock, under the
 * brand — so the height is the inset plus the band itself, and the
 * band keeps its full depth below the chrome rather than losing a
 * third of it to the notch.
 */
export const bannerHeight = (width: number, top: number): number =>
  top + Math.round(width / BANNER_RATIO);
