/**
 * When a scroll-driven deck moves, and when it holds still.
 *
 * A pinned deck whose rail is a straight line from the first beat to
 * the last is the version this replaced, and it reads badly for a
 * reason that is only obvious once it is measured: the first panel
 * becomes whole at the exact instant the section pins, and starts
 * sliding away on the very next pixel of scroll. Measured on a 634pt
 * window it had already travelled 58 points by 5% of the track. There
 * is no moment where a beat is both complete and still — the reader is
 * given the thing to read and it is taken away in the same frame.
 *
 * So the rail's position is not linear in scroll. It is a schedule of
 * holds and travels: each beat arrives, sits still long enough to be
 * read, and then moves. The first hold is longer than the middle ones
 * — that is the section's arrival, the beat where the pin engages and
 * the deck settles — and the last is longer again, so the final beat
 * does not slide in and immediately release.
 *
 * Pure and separate from the component because the interesting parts
 * are all arithmetic: the stop list has to be strictly increasing or
 * `Animated.interpolate` rejects it outright, and the hold budget has
 * to survive a beat count nobody has tried yet.
 */

/**
 * The share of the track each kind of pause is worth.
 *
 * Deliberately unequal. `ARRIVE` covers the reader still settling into
 * a section that has just stopped moving under them; `EXIT` keeps the
 * last beat on screen for a moment rather than handing it straight to
 * the next section's seam. The middle beats need neither, so `DWELL` is
 * the shortest of the three.
 */
export const BEAT_ARRIVE = 0.16;
export const BEAT_DWELL = 0.16;
export const BEAT_EXIT = 0.18;

/**
 * The most of a track the holds may take between them.
 *
 * Three beats spend half the track holding, which leaves the other half
 * for two transitions and needs no help. A deck of seven would ask for
 * more than the whole track, leaving nothing for travel and — worse —
 * producing a stop list with repeated values, which `interpolate`
 * throws on. Scaling every pause by the same factor keeps their
 * relative weights and guarantees the travel share stays positive for
 * any count.
 */
const HOLD_BUDGET = 0.7;

export interface BeatStops {
  /** Progress values, strictly increasing, from 0 to 1. */
  input: number[];
  /** The beat index the rail rests on at each of those values. */
  output: number[];
}

/**
 * The hold-and-travel schedule for `count` beats.
 *
 * Read as pairs: two consecutive stops with the same output are a hold,
 * two with different outputs are a transition between them.
 */
export function beatStops(count: number): BeatStops {
  const gaps = Math.max(0, count - 1);

  const raw = BEAT_ARRIVE + BEAT_EXIT + BEAT_DWELL * Math.max(0, count - 2);
  const scale = raw > HOLD_BUDGET ? HOLD_BUDGET / raw : 1;
  const arrive = BEAT_ARRIVE * scale;
  const dwell = BEAT_DWELL * scale;
  const travel = gaps > 0 ? (1 - raw * scale) / gaps : 0;

  const input = [0, arrive];
  const output = [0, 0];

  let at = arrive;
  for (let i = 1; i <= gaps; i++) {
    at += travel;
    input.push(at);
    output.push(i);
    // No dwell after the last transition: the tail of the track IS the
    // exit hold, and adding one here would push a stop past 1.
    if (i < gaps) {
      at += dwell;
      input.push(at);
      output.push(i);
    }
  }

  input.push(1);
  output.push(gaps);
  return { input, output };
}

/**
 * Which beat the rail is on at a given progress, fractional between two.
 *
 * The whole number is the beat; the fraction is how far it has
 * travelled toward the next one, which is exactly what the rail's
 * offset and the wash's crossfade both want. A hold returns a whole
 * number for its entire span.
 */
export function beatIndexAt(fraction: number, stops: BeatStops): number {
  const { input, output } = stops;
  const last = input.length - 1;
  if (last < 1) return output[0] ?? 0;

  const at = Math.max(input[0], Math.min(input[last], fraction));
  for (let i = 1; i <= last; i++) {
    if (at > input[i]) continue;
    const span = input[i] - input[i - 1];
    if (span <= 0) return output[i];
    return (
      output[i - 1] + ((output[i] - output[i - 1]) * (at - input[i - 1])) / span
    );
  }
  return output[last];
}

/**
 * The progress a beat is centred at, for the arrows to scroll to.
 *
 * The middle of that beat's hold, not the point it arrives at: landing
 * a reader on the first frame of a hold means their next flick starts
 * the beat moving again immediately, which is the thing the schedule
 * exists to prevent.
 */
export function beatAnchor(index: number, stops: BeatStops): number {
  const { input, output } = stops;
  let first = -1;
  let last = -1;
  for (let i = 0; i < output.length; i++) {
    if (output[i] !== index) continue;
    if (first < 0) first = i;
    last = i;
  }
  if (first < 0) return 0;
  return (input[first] + input[last]) / 2;
}
