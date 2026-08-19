import type { Game } from '@/api/types';
import type { LibraryEntry } from './library';

/**
 * How long a game takes, however the caller decides that — normally the
 * durations store, which folds in the player's own corrections. Injected
 * rather than imported so these stay pure functions over a library.
 */
export type HoursOf = (
  game: Pick<Game, 'id' | 'playtime' | 'released'>
) => number;

export interface LibraryStats {
  /** Games saved but not finished. */
  waiting: number;
  playing: number;
  finished: number;
  /** Hours of play still ahead of you, across everything unfinished. */
  hoursAhead: number;
  /** Hours you've already seen the credits on. */
  hoursFinished: number;
  /** Finished in the last twelve months. */
  finishedThisYear: number;
}

/**
 * What a library adds up to.
 *
 * The status counts are the easy part; the hours are the point. A backlog
 * is intimidating because nobody knows how big it is — saying "212 hours
 * ahead" turns a vague dread into a number you can plan against, and
 * "48 hours finished" is the only place the app tells you that you have
 * been getting somewhere.
 */
export function libraryStats(
  entries: LibraryEntry[],
  hoursOf: HoursOf,
  now: number = Date.now()
): LibraryStats {
  const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const stats: LibraryStats = {
    waiting: 0,
    playing: 0,
    finished: 0,
    hoursAhead: 0,
    hoursFinished: 0,
    finishedThisYear: 0,
  };

  for (const entry of entries) {
    const hours = hoursOf(entry.game);

    if (entry.status === 'finished') {
      stats.finished += 1;
      stats.hoursFinished += hours;
      if (now - entry.addedAt <= YEAR_MS) stats.finishedThisYear += 1;
      continue;
    }

    if (entry.status === 'playing') {
      stats.playing += 1;
      // Half left, matching how the plan treats something under way.
      stats.hoursAhead += hours * 0.5;
    } else {
      stats.waiting += 1;
      stats.hoursAhead += hours;
    }
  }

  stats.hoursAhead = Math.round(stats.hoursAhead);
  stats.hoursFinished = Math.round(stats.hoursFinished);
  return stats;
}

export type LibrarySort = 'added' | 'shortest' | 'longest' | 'name';

export const SORT_LABELS: Record<LibrarySort, string> = {
  added: 'Recent',
  shortest: 'Shortest',
  longest: 'Longest',
  name: 'A–Z',
};

/**
 * Sorting a backlog is not a nicety: "shortest first" is the single most
 * useful order there is when you have an hour and forty games.
 */
export function sortLibrary(
  entries: LibraryEntry[],
  sort: LibrarySort,
  hoursOf: HoursOf
): LibraryEntry[] {
  const lengthOf = (entry: LibraryEntry) => hoursOf(entry.game);
  const sorted = [...entries];
  switch (sort) {
    case 'shortest':
      // Unknown lengths sort last: they can't be compared, and they are
      // not a good answer to "what is quick".
      return sorted.sort(
        (a, b) => (lengthOf(a) || Infinity) - (lengthOf(b) || Infinity)
      );
    case 'longest':
      return sorted.sort((a, b) => lengthOf(b) - lengthOf(a));
    case 'name':
      return sorted.sort((a, b) => a.game.name.localeCompare(b.game.name));
    default:
      return sorted.sort((a, b) => b.addedAt - a.addedAt);
  }
}
