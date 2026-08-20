import type { Game } from '@/api/types';

export type DurationSource = 'yours' | 'reported' | 'estimate' | 'unknown';

export interface Duration {
  /** Hours to finish. 0 when nothing is known. */
  hours: number;
  source: DurationSource;
  /**
   * True when an estimate exists but shouldn't be trusted to the hour.
   * The Plan says so out loud rather than quietly scheduling around it.
   */
  rough: boolean;
}

/**
 * Above this, RAWG's average is almost always inflated by people leaving
 * a game running rather than playing it, or by endless-loop games that
 * have no "finish" at all.
 */
const IMPLAUSIBLY_LONG = 100;

/** Below this there is nothing to plan around. */
const IMPLAUSIBLY_SHORT = 2;

function isUnreleased(game: Pick<Game, 'released'>, now: number): boolean {
  if (!game.released) return true;
  const released = Date.parse(game.released);
  return Number.isNaN(released) ? true : released > now;
}

/**
 * How few submissions is too few.
 *
 * IGDB's times are player submissions. One person's Tuesday is not a
 * length — but three people agreeing beats an average of everyone who
 * ever left the game running, which is what the alternative is.
 */
const ENOUGH_SUBMISSIONS = 3;

/**
 * What a game will take, and how much to trust it.
 *
 * RAWG's `playtime` is the average of what players reported, which is the
 * only broad source there is — but it is an average over everyone,
 * including the people who left the game running overnight, and for
 * anything unreleased it describes a game nobody has finished. So the
 * number a person typed in always wins, and an estimate we doubt is
 * labelled instead of being quietly presented as fact.
 */
export function resolveDuration(
  game: Pick<Game, 'playtime' | 'released'>,
  override: number | undefined,
  now: number = Date.now(),
  reported?: { normally: number | null; submissions: number }
): Duration {
  if (override != null && override > 0) {
    return { hours: override, source: 'yours', rough: false };
  }

  // What players actually reported finishing it in, where enough of them
  // did. This is the number the plan is meant to be built on: RAWG's
  // average is over everyone who ever launched the game, including the
  // people who left it running overnight.
  if (
    reported?.normally != null &&
    reported.normally > 0 &&
    reported.submissions >= ENOUGH_SUBMISSIONS
  ) {
    return {
      hours: reported.normally,
      source: 'reported',
      rough: isUnreleased(game, now),
    };
  }

  const estimate = game.playtime ?? 0;
  if (estimate <= 0) {
    return { hours: 0, source: 'unknown', rough: true };
  }

  const rough =
    isUnreleased(game, now) ||
    estimate > IMPLAUSIBLY_LONG ||
    estimate < IMPLAUSIBLY_SHORT;

  return { hours: estimate, source: 'estimate', rough };
}

/**
 * What is left of a game, given what has already gone into it.
 *
 * Measured progress beats a guess: someone thirty hours into a forty
 * hour RPG has an evening's worth left, not a fortnight's, and the plan
 * should say so. Without a measurement the old assumption stands — a
 * game under way is treated as half done, which is a guess but an
 * honest one.
 *
 * Past the estimate the answer is never zero. A game whose length has
 * been exceeded is not finished, it is at the part that always takes
 * longer than the average says, so an hour stays on the board until
 * someone marks it finished.
 */
export function remainingHours(
  totalHours: number,
  options: { hoursPlayed?: number; playing?: boolean }
): number {
  if (totalHours <= 0) return 0;
  const { hoursPlayed, playing } = options;
  if (hoursPlayed == null || hoursPlayed <= 0)
    return playing ? totalHours * 0.5 : totalHours;
  return Math.max(1, totalHours - hoursPlayed);
}

/** Hours as a person would write them: "2h", "2.5h", "40h". */
export function formatHours(hours: number): string {
  if (hours <= 0) return '—';
  if (hours >= 10) return `${Math.round(hours)}h`;
  const rounded = Math.round(hours * 2) / 2;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}h`;
}

/**
 * Accepts what someone actually types — "12", "12h", "2.5", "90m" — and
 * returns hours, or null when it isn't a length at all.
 */
export function parseHours(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  const minutes = /^(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/.exec(text);
  if (minutes) {
    const value = Number(minutes[1]) / 60;
    return value > 0 && value <= 1000 ? value : null;
  }

  const hours = /^(\d+(?:\.\d+)?)\s*(?:h(?:ours?|rs?)?)?$/.exec(text);
  if (!hours) return null;
  const value = Number(hours[1]);
  return value > 0 && value <= 1000 ? value : null;
}
