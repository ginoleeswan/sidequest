import { Easing } from 'react-native';

/**
 * Motion tokens.
 *
 * The app had a dozen ad-hoc durations (170, 200, 220, 250, 700, 1100)
 * and three different spring configs, which is why transitions read as
 * unrelated events rather than one system. These are the only durations
 * anything should use.
 *
 * The scale is short on purpose. Sidequest is a tool people open to
 * answer one question; motion here exists to explain what moved where,
 * not to perform.
 */
export const DURATION = {
  /** Colour and opacity on hover or press. Below this, it reads as a snap. */
  fast: 120,
  /** The default: reveals, cross-fades, sheets settling. */
  base: 200,
  /** Only where distance is large — a full-screen sheet, a celebration. */
  slow: 320,
  /** Ambient loops: the skeleton pulse, the indeterminate progress line. */
  pulse: 700,
  sweep: 1100,
  /**
   * The home stage's entrance: eyebrow, headline, sentence and buttons
   * arriving in that order. Longer than `slow` because the point is the
   * order, not the travel — a stagger that lands inside 320ms reads as
   * one thing appearing crookedly.
   */
  entrance: 720,
  /**
   * The slow drift across the stage artwork. Fourteen seconds for eight
   * percent of scale: below the threshold where anyone can see it move,
   * above the one where a still image reads as a screenshot.
   */
  drift: 14000,
} as const;

/**
 * Easings.
 *
 * `standard` decelerates: things arrive quickly and settle, which is what
 * reads as responsive. `exit` is symmetric and slightly faster, because
 * something leaving does not need to be watched.
 */
export const EASING = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
  linear: Easing.linear,
} as const;

/**
 * Springs, for the two places physics beats a curve: a control pushing
 * back under a finger, and a surface arriving from off-screen.
 */
export const SPRING = {
  press: { tension: 60, friction: 6 },
  surface: { tension: 90, friction: 12 },
} as const;
