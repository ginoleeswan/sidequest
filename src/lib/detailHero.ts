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
/**
 * ...and then tighter again, for the melt. At 1.6 the band was 244
 * points on a 390 phone, and a dissolve long enough to read as one —
 * two fifths of the frame — left too little picture above it. 1.35
 * buys 45 more points and keeps 44% of a hero: still the right half,
 * still where the game is.
 */
/**
 * ...and 1.25, once the mark grew and the identity line joined it in
 * the band. A lockup of 88 for the mark, its byline and the foot's
 * padding is 133 points; on a 289-point band that put the mark's top
 * at the picture's waist. 1.25 buys 23 more points and keeps 40% of a
 * hero - still the right two fifths, still where the subject stands.
 */
export const BAND_CROP = { tightest: 1.25, widest: 2.2 } as const;

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
export const BAND_SHARE = 0.4;

/**
 * The title treatment's box, low on the art.
 *
 * A fixed slot because the typed name arrives first and the logo
 * replaces it when it lands: without a reserved height the masthead
 * would resize under the reader as the taller mark came in.
 */
/**
 * 88, up from 64. At 64 the publisher's mark was a stamp on a band
 * three hundred points tall - a fifth of the phone's masthead against
 * a third of the desk's. The slot now takes the same share of its band
 * the desk's mark does, and the identity line stands under it on the
 * art, as it does there.
 */
export const TITLE_SLOT = 88;

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

/**
 * The desk's band: the hero at its own proportions, held to the window.
 *
 * A SteamGridDB hero is 1920 by 620, and on a desk there is room to
 * show it whole - which is the one width where the crop the phone
 * spends can be kept. The floor keeps a narrow window from turning the
 * band into a strip; the share and the ceiling keep a tall monitor from
 * spending half its height on a picture the reader has to scroll past
 * before the page says anything.
 */
export const DESK_BAND = {
  ratio: 1920 / 620,
  floor: 360,
  share: 0.58,
  ceiling: 620,
} as const;

/** The tallest the desk's band may stand in this window. */
export function deskBandCeiling(windowHeight: number): number {
  return Math.round(
    Math.min(
      DESK_BAND.ceiling,
      Math.max(DESK_BAND.floor, windowHeight * DESK_BAND.share)
    )
  );
}
