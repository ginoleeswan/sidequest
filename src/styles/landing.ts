import type { TextStyle } from 'react-native';

import { COLORS } from './colors';
import { TYPE } from './typography';

/**
 * The landing page's own scale.
 *
 * Everywhere else in Sidequest, type is sized for a tool: a heading is
 * 26px because it labels a shelf you are about to use, and 26px is as
 * large as a label can get before it starts shouting at somebody who is
 * mid-task. The landing page borrowed that scale and it was the single
 * biggest thing wrong with the layout — a 26px lead capped at 460px,
 * set in a row 1320px wide, leaves eight hundred pixels of empty ground
 * that reads as a mistake rather than as air. Whitespace only reads as
 * confidence when something in the frame is big enough to have earned
 * it.
 *
 * So this page gets a second scale, keyed to the width of the window
 * rather than to a fixed step, because a poster is sized relative to the
 * wall. Every landing section imports it, which is the point: three
 * sections each inventing their own clamp is how a page ends up with
 * four heading sizes and no hierarchy.
 */
export interface LandingScale {
  /** The masthead. One line, and it has to carry a whole screen. */
  display: TextStyle;
  /** A section's claim, across the full column. */
  lead: TextStyle;
  /**
   * The same claim when it shares the row with something else.
   *
   * A size is only right relative to the measure it is set in. Fifty-four
   * points across a 1060px band is a headline; the same fifty-four in one
   * half of that band breaks "It knows how long things take" after
   * "long" and leaves "things take." alone on a line. One scale, two
   * measures, two sizes.
   */
  leadColumn: TextStyle;
  /** The sentence under a claim. */
  body: TextStyle;
  /** The one number on the page. */
  figure: TextStyle;
  /** Its unit, set as a word on the same baseline. */
  unit: TextStyle;
  /** Distance from the page's edge to its text. */
  inset: number;
  /**
   * How wide one half of a two-column band actually is, in pixels.
   *
   * Without this the evidence in a split row was drawn at whatever size
   * looked reasonable in isolation — 320px, say — and then pinned into a
   * 500px column, leaving 180px of ground beside it and another 60 of
   * gutter beside that. Two hundred and forty pixels of nothing in the
   * middle of a row is the thing that reads as awkward. An object told
   * how much room it has can fill it.
   */
  column: number;
  /** Vertical air inside a band. */
  air: number;
  /** True once there is room for two columns. */
  wide: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.round(Math.min(Math.max(value, min), max));

/**
 * The page's measure.
 *
 * The app caps its expanded layout at 1600, which is right for a grid of
 * tiles and wrong for prose: at 1440 the landing page's rows were the
 * full width of the window while the text inside them was capped at 460,
 * so every section clung to the left edge with half a screen of nothing
 * beside it. A page that is read rather than scanned wants a column.
 */
export const LANDING_MEASURE = 1180;

/**
 * The landing page's two grounds, and why neither of them is the app's.
 *
 * Everywhere else Sidequest sits on `darkGrey` — #333D51, a light
 * desaturated blue that works underneath a dense grid of artwork
 * because artwork is most of what you see. A landing page is mostly
 * ground: long bands with one claim and one object on them. At that
 * ratio #333D51 stops reading as a colour and starts reading as grey,
 * which is the single most common note anybody gives this page.
 *
 * So it sits on ink, and its alternate band goes DOWN rather than up.
 * Two dark tones a step apart give the page its rhythm without ever
 * lifting toward grey, and both of them make amber and cover art carry
 * further than they did.
 */
export const LANDING_GROUND = COLORS.navy;
/** One step below the ground. `mediumGrey` still clears AA on it. */
export const LANDING_WELL = '#1E2532';

export function landingScale(width: number): LandingScale {
  const wide = width >= 900;

  const display = clamp(width * 0.108, 42, 104);
  /**
   * Just over half the masthead at any width. A landing page needs
   * exactly two type sizes above body copy — the thing that stops you,
   * and the things that keep you going — and a fixed ratio between them
   * is what makes a page read as one design rather than as a stack of
   * sections that were each art-directed alone.
   */
  const lead = clamp(width * 0.042, 30, 54);
  const column = clamp(width * 0.031, 28, 40);
  /**
   * The page's one number, at the size a number that big deserves.
   * At 196 it was the largest thing here and still looked like a
   * headline; a quarter of the window makes it the event it is.
   */
  /**
   * The 900. It was clamped no lower than 118 and at that size on a
   * phone it stopped being a number and became a wall — the eye read
   * "big" and skipped the digits. Ninety-two points is still four
   * times the body face: unmistakably the loudest thing in the band,
   * and small enough to be read as a quantity.
   */
  const sum = clamp(width * 0.2, 92, 300);

  const inset = wide ? 60 : 20;
  /** Matches `beatWide`'s gap. */
  const gutter = 60;

  return {
    wide,
    inset,
    column: wide
      ? Math.round((Math.min(width, LANDING_MEASURE) - inset * 2 - gutter) / 2)
      : width - inset * 2,
    /**
     * Air scales with the type. Sixty pixels of padding under a 26px
     * heading is generous; under a 54px one it is a crowd.
     */
    air: wide ? 110 : 64,
    display: {
      fontSize: display,
      lineHeight: Math.round(display * 1.02),
      letterSpacing: display > 60 ? -3 : -1.2,
    },
    lead: {
      fontFamily: 'Geom-ExtraBold',
      fontSize: lead,
      lineHeight: Math.round(lead * 1.08),
      letterSpacing: lead > 40 ? -1.6 : -0.8,
      color: COLORS.white,
    },
    leadColumn: {
      fontFamily: 'Geom-ExtraBold',
      fontSize: column,
      lineHeight: Math.round(column * 1.12),
      letterSpacing: column > 34 ? -1.1 : -0.6,
      color: COLORS.white,
    },
    body: {
      ...TYPE.body,
      // A reading size, not a UI size. Seventeen is right for a
      // settings screen; a landing page is read at arm's length.
      fontSize: wide ? 20 : 18,
      lineHeight: wide ? 33 : 30,
      color: COLORS.mediumGrey,
    },
    figure: {
      fontSize: sum,
      lineHeight: Math.round(sum * 0.92),
      // Was minus five and a half percent, which closed "900" up until
      // the nine and the first zero shared a stroke.
      letterSpacing: Math.round(sum * -0.03),
    },
    unit: { fontSize: Math.round(sum * 0.22), letterSpacing: 0 },
  };
}
