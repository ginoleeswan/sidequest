/**
 * Shaped motion from one linear driver.
 *
 * Every beat of the splash has to stay in step with every other, which
 * means one `Animated.Value` running start to finish and everything
 * else reading off it. That normally costs you all the interesting
 * curves: `interpolate` between two points is a straight line, and a
 * straight line is the sound of a machine moving something.
 *
 * So the curves are sampled instead. Each of these takes a shape and
 * hands back the keyframes that trace it, which `interpolate` then joins
 * — at eighteen samples the joins are invisible and the result springs,
 * overshoots and settles like a real thing while remaining a single
 * transform the native driver can run off the JS thread.
 */

/** Fast away, slow into place. The workhorse for anything thrown. */
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

/**
 * The same idea with less bite.
 *
 * Quintic launches so hard that a thrown object is at the edge of the
 * screen before the eye finds it — most of its flight is spent almost
 * stationary near the end. Cubic keeps the throw and leaves the object
 * legible on its way out.
 */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Slow to leave, then gone. For exits that accelerate past you. */
export const easeInCubic = (t: number): number => t * t * t;

/**
 * Past the target, then back to it. `pull` is how far past.
 *
 * The cheapest way to make something feel alive: nothing in the world
 * arrives at its destination and stops dead.
 */
export const backOut =
  (pull = 1.7) =>
  (t: number): number =>
    1 + (pull + 1) * Math.pow(t - 1, 3) + pull * Math.pow(t - 1, 2);

/**
 * A damped spring, settling by t=1.
 *
 * `bounce` is how many times it crosses over on the way, `decay` how
 * hard each crossing is punished. Two and six is a firm object — a
 * joystick returning to centre, not a jelly.
 */
export const springOut =
  (bounce = 2, decay = 6) =>
  (t: number): number =>
    t >= 1 ? 1 : 1 - Math.exp(-decay * t) * Math.cos(bounce * Math.PI * t);

export interface Keyframes {
  inputRange: number[];
  outputRange: number[];
}

/** How finely a curve is sampled. Eighteen hides the joins. */
const STEPS = 18;

/**
 * Samples `shape` across a window of the run.
 *
 * `window` is where in the timeline this happens, as fractions; `from`
 * and `to` are the values at each end. Outside the window the value is
 * held, so a driver at 0 shows the start and a finished driver shows
 * the end.
 */
export function shaped(
  window: readonly [number, number],
  from: number,
  to: number,
  shape: (t: number) => number,
  steps = STEPS
): Keyframes {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    inputRange.push(window[0] + (window[1] - window[0]) * t);
    outputRange.push(from + (to - from) * shape(t));
  }
  return { inputRange, outputRange };
}

/**
 * Keyframes straight from a table of stops.
 *
 * For motion whose shape is a sequence rather than a formula — the
 * squash, pop and settle of something taking a knock, where each stage
 * has its own timing and no single easing describes the whole.
 */
export function stops(
  table: readonly (readonly [number, number])[]
): Keyframes {
  return {
    inputRange: table.map(([at]) => at),
    outputRange: table.map(([, value]) => value),
  };
}
