import { Platform } from 'react-native';

/**
 * How tall the phone's game masthead is.
 *
 * It was a flat 480 points, which is 72% of an iPhone SE's screen and
 * barely half of a tall Android's — the same picture read as a wall on
 * one and a banner on the other. Taking a share of the window instead,
 * floored so a short phone still gets a real picture and capped so a
 * tablet in portrait does not get a poster.
 *
 * Shared with the loading skeleton, so the bones stand exactly where the
 * art will and the swap is a dissolve rather than a jump.
 */
export const HERO_BOUNDS = { min: 400, max: 560, ratio: 0.56 } as const;

/**
 * On the web the answer is a CSS length rather than a number. The page
 * is pre-rendered without a viewport, so anything computed from a
 * measured height is wrong on the server and adopted at hydration — a
 * visible shift under the reader's eyes, and a CLS the perf budget
 * catches. Viewport units let server and client agree without either
 * measuring. `dvh` rather than `vh` on purpose: on iOS `vh` is the
 * viewport with the toolbar collapsed, which is not what the layout
 * gets.
 */
export function detailHeroHeight(windowHeight: number): number | string {
  const { min, max, ratio } = HERO_BOUNDS;
  if (Platform.OS === 'web')
    return `clamp(${min}px, ${Math.round(ratio * 100)}dvh, ${max}px)`;
  return Math.round(Math.min(max, Math.max(min, windowHeight * ratio)));
}
