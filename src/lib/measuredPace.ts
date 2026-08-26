import type { LoggedSession } from './sessions';

/**
 * The pace the app has actually watched, as opposed to the one it was
 * told.
 *
 * Everything the plan says rests on hours-a-week: which games fit, what
 * gets dropped, every date on the horizon. That number is chosen once,
 * in ten seconds, during onboarding — and people are famously generous
 * about it. Meanwhile the session clock has been quietly recording what
 * really happened, and until now only the Memcard ever looked.
 *
 * The point is not to correct anybody. It is that a plan built on an
 * optimistic pace makes promises the week cannot keep, and missing your
 * own plan every week is a far worse thing to feel than reading one
 * honest sentence about it. §2.1 is why this exists, not a reason to
 * leave it out.
 *
 * What it is NOT is a measurement of somebody's life. It counts logged
 * sessions, and nobody logs every evening — so this is a FLOOR, and
 * that single fact decides what the app is allowed to say.
 *
 * The asymmetry is the whole design, and it was nearly missed. If the
 * floor is HIGHER than the plan's assumption, the assumption is
 * provably too low: those hours happened. If the floor is LOWER, it
 * means nothing whatever — an unlogged evening is invisible, so a small
 * number is equally consistent with somebody who plays constantly and
 * never presses the button. Drawn on screen the second case read "your
 * dates are optimistic, use 1h a week", from five timed evenings, which
 * is the app confidently rewriting a stranger's life from the corner it
 * happened to see. So it only speaks upward. See `worthSaying`.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

/**
 * What it takes before a number like this is worth saying out loud.
 *
 * Three sessions over a fortnight, at least. Two good evenings in one
 * week is not a pace, it is a weekend, and telling somebody their pace
 * is 11 hours because of one bank holiday would be worse than saying
 * nothing — the app would have replaced their guess with its own.
 */
const MIN_SESSIONS = 3;
const MIN_SPAN_DAYS = 14;

/** How far back is worth counting. Beyond this it is a different life. */
const WINDOW_DAYS = 56;

export interface Measured {
  /** Hours a week, rounded to something a person would say. */
  hoursPerWeek: number;
  /** How many evenings it is built on, for saying so. */
  sessions: number;
  /** Days between the first and last of them. */
  spanDays: number;
}

/**
 * The measured pace, or nothing if there is not enough to go on.
 *
 * Pure and takes its clock, so it can be tested without a device.
 */
export function measuredPace(
  log: readonly LoggedSession[],
  now: number = Date.now()
): Measured | null {
  const recent = log
    .filter(
      (session) =>
        session.endedAt <= now && session.endedAt >= now - WINDOW_DAYS * DAY
    )
    .sort((a, b) => a.endedAt - b.endedAt);

  if (recent.length < MIN_SESSIONS) return null;

  const first = recent[0].endedAt;
  const last = recent[recent.length - 1].endedAt;
  /**
   * Measured to NOW, not to the last session.
   *
   * A fortnight of play followed by three quiet weeks is a slower pace
   * than a fortnight of play, and using the last session as the end
   * would report the busy fortnight and call it today. The quiet weeks
   * are part of the answer.
   */
  const spanMs = Math.max(now - first, WEEK);
  const spanDays = Math.round((last - first) / DAY);
  if (spanDays < MIN_SPAN_DAYS) return null;

  const minutes = recent.reduce((sum, session) => sum + session.minutes, 0);
  const perWeek = minutes / 60 / (spanMs / WEEK);

  return {
    // Half-hours: nobody says "6.37 hours a week", and false precision
    // would make a floor look like a measurement.
    hoursPerWeek: Math.max(0.5, Math.round(perWeek * 2) / 2),
    sessions: recent.length,
    spanDays,
  };
}

/**
 * Whether the difference is worth a sentence.
 *
 * Upward only, and by a clear margin. A floor above the assumption is
 * proof the assumption is low — those hours are on the record. A floor
 * below it proves nothing at all, because the evenings nobody timed are
 * exactly the ones missing from it, so saying "your dates are
 * optimistic" there would be a guess dressed as a measurement.
 *
 * That leaves the app quiet in the case it would most like to help
 * with. Quiet is correct: the honest way to catch an over-generous pace
 * is Steam, which sees every hour, and the plan already offers it.
 */
export function worthSaying(assumed: number, measured: number): boolean {
  if (assumed <= 0) return false;
  return (measured - assumed) / assumed >= 0.25;
}
