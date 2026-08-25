import { remainingHours } from './duration';
import type { LibraryEntry } from './library';
import type { PlanItem } from './scheduler';

/**
 * Turning a library into something the scheduler can plan.
 *
 * One place, because there is more than one caller and they must not
 * disagree. The plan screen shows this list; the widgets show it too,
 * from a different entry point at a different moment, and a person
 * looking at their Lock Screen and then opening the app has to see the
 * same week. That is precisely the drift that would be invisible until
 * somebody noticed the two contradicting each other.
 *
 * The order is load-bearing, which is the part worth stating out loud.
 * `planSchedule` sorts by deadline and then by length, and JavaScript's
 * sort is stable — so two games with the same deadline and the same
 * length keep the order they arrived in, and which of them survives a
 * full week is decided by nothing more than that. Two callers ordering
 * the same library differently is two different weeks, both defensible
 * and only one of them on the screen. It is a narrow case and a cheap
 * one to close.
 *
 * Games under way come first, and that is a product decision as much
 * as a mechanical one: something already started is the thing most
 * likely to be finished, and the plan should say so.
 */

/**
 * Whatever is left to play, by the app's own reckoning.
 *
 * A game part-way through counts for less than its length; one with no
 * length recorded counts for nothing, because a plan built on a guess
 * about a guess is worse than a plan that admits a gap.
 */
export const hoursLeft = (
  entry: LibraryEntry,
  hoursOf: (entry: LibraryEntry) => number
): number =>
  remainingHours(hoursOf(entry), {
    hoursPlayed: entry.hoursPlayed,
    playing: entry.status === 'playing',
  });

export function planItems(
  entries: readonly LibraryEntry[],
  hoursOf: (entry: LibraryEntry) => number
): PlanItem[] {
  const playing: PlanItem[] = [];
  const waiting: PlanItem[] = [];

  for (const entry of entries) {
    if (entry.status === 'finished') continue;
    const hours = hoursLeft(entry, hoursOf);
    if (hours <= 0) continue;
    const item: PlanItem = {
      id: entry.game.id,
      name: entry.game.name,
      hours,
      want: (entry.want ?? 2) >= 3 ? 3 : 2,
      deadline: entry.deadline,
    };
    (entry.status === 'playing' ? playing : waiting).push(item);
  }

  return [...playing, ...waiting];
}
