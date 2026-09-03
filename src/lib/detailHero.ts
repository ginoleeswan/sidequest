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
 * The two crops the band is allowed to make, and why it is a range.
 *
 * A hero is 3.1:1. Shown at that ratio on a 390-point phone it is 126
 * points tall — a letterbox, and barely half of any band worth calling
 * a masthead. Composited over a blurred copy of itself it gains the
 * height and gains a seam with it: a straight line across the page
 * where the sharp frame stops, which no ramp gentle enough to let the
 * blur read is ever strong enough to hide. So one picture fills the
 * band, and the height is bought with a crop.
 *
 * Which side that comes off matters more than how much. Valve's
 * convention puts the subject hard right and leaves the left clear,
 * because Steam composites the logo there — a centre crop takes a bite
 * out of the one thing the picture is of, and Directive 8020's
 * astronaut stands at the right edge. The crop comes off the left, and
 * what it spends is the empty half the logo was meant for, which this
 * design does not use: the mark is centred, low, on the ramp.
 *
 * `tightest` is the most picture this page will ever spend: at 1.6 it
 * keeps 52% of a hero — the right half, where the game is. `widest` is
 * a floor, so a short window still gets a band rather than a strip.
 */
export const BAND_CROP = { tightest: 1.6, widest: 2.2 } as const;

/**
 * How much of the window the band asks for.
 *
 * A ratio alone is a masthead whose presence depends on how tall the
 * reader's phone happens to be: at a flat 1.8 the picture was 31% of an
 * iPhone SE and 26% of a Pro Max, so the same design read as a stage on
 * a small phone and a header image on a large one. Driving the height
 * from the window and bounding the crop holds it near a third
 * everywhere, which is what makes it feel like one decision rather than
 * an accident of the device.
 */
export const BAND_SHARE = 0.34;

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
 * the picture. A window of zero, which is what a pre-render has before
 * anything is measured, falls to the floor rather than to nothing.
 */
export function bannerHeight(
  width: number,
  top: number,
  windowHeight: number
): number {
  const tallest = width / BAND_CROP.tightest;
  const shortest = width / BAND_CROP.widest;
  const wanted = windowHeight * BAND_SHARE;
  return top + Math.round(Math.min(tallest, Math.max(shortest, wanted)));
}
