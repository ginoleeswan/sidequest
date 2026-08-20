import type { LibraryEntry } from './library';
import { readSessions } from './sessions';

/**
 * What a year of playing actually looked like.
 *
 * The Memcard is the brag; this is the mirror. Same data, different
 * question: not "what did I finish" but "how am I doing", including the
 * parts a share artifact would never put on a card — how much of the
 * backlog is new this year, how long the average finish took, and
 * whether the pile is growing or shrinking.
 */

const DAY = 24 * 60 * 60 * 1000;

export interface YearStats {
  year: number;
  finished: number;
  hoursFinished: number;
  /** Games saved during the year — the other side of the ledger. */
  added: number;
  /** Saved minus finished: the honest direction of travel. */
  netChange: number;
  /** Median length of what was finished, in hours. */
  medianLength: number;
  /** The longest gap, in days, between two finishes. */
  longestGap: number;
  /** Minutes actually recorded by the session timer. */
  measuredMinutes: number;
  /** The month with the most credits, 0-11, or null. */
  bestMonth: number | null;
  /** One sentence about the direction of travel. */
  verdict: string;
}

const inYear = (at: number, year: number) =>
  new Date(at).getFullYear() === year;

function verdictFor(finished: number, net: number): string {
  if (finished === 0)
    return 'Nothing finished yet this year. One short game changes that.';
  if (net > 3)
    return `The pile grew by ${net} this year. That is normal, and it is why the plan drops things.`;
  if (net > 0) return 'Roughly keeping pace with what you save.';
  return `You finished more than you saved. The backlog is ${Math.abs(net)} smaller than it was.`;
}

export function yearStats(
  entries: LibraryEntry[],
  hoursOf: (entry: LibraryEntry) => number,
  year: number,
  now: number = Date.now()
): YearStats {
  const finishedEntries = entries.filter(
    (entry) =>
      entry.status === 'finished' &&
      inYear(entry.finishedAt ?? entry.addedAt, year)
  );

  const finishDates = finishedEntries
    .map((entry) => entry.finishedAt ?? entry.addedAt)
    .sort((a, b) => a - b);

  const lengths = finishedEntries
    .map(hoursOf)
    .filter((hours) => hours > 0)
    .sort((a, b) => a - b);

  const added = entries.filter((entry) => inYear(entry.addedAt, year)).length;

  const months = Array.from({ length: 12 }, () => 0);
  for (const at of finishDates) months[new Date(at).getMonth()] += 1;
  const best = months.reduce(
    (bestSoFar, count, month) =>
      count > months[bestSoFar] ? month : bestSoFar,
    0
  );

  // The gap runs to today for the current year, because a four-month
  // silence is still four months even if it has not ended.
  const endOfWindow = inYear(now, year) ? now : Date.UTC(year, 11, 31);
  let longestGap = 0;
  let previous = finishDates[0];
  for (const at of finishDates.slice(1)) {
    longestGap = Math.max(longestGap, Math.round((at - previous) / DAY));
    previous = at;
  }
  if (previous != null)
    longestGap = Math.max(
      longestGap,
      Math.round((endOfWindow - previous) / DAY)
    );

  const measuredMinutes = readSessions()
    .filter((session) => inYear(session.endedAt, year))
    .reduce((sum, session) => sum + session.minutes, 0);

  return {
    year,
    finished: finishedEntries.length,
    hoursFinished: finishedEntries.reduce((sum, e) => sum + hoursOf(e), 0),
    added,
    netChange: added - finishedEntries.length,
    medianLength: lengths.length ? lengths[Math.floor(lengths.length / 2)] : 0,
    longestGap,
    measuredMinutes,
    bestMonth: months[best] > 0 ? best : null,
    verdict: verdictFor(finishedEntries.length, added - finishedEntries.length),
  };
}
