import type { LibraryEntry } from './library';

/**
 * The line the page says in its own voice, halfway down.
 *
 * Everything else below the stage is a storefront: rows of other
 * people's games in rows of the same shape. This is the one place the
 * app stops selling and states a fact about you — how much you have
 * saved, and what that adds up to in evenings.
 *
 * The number is the point. "14 games" is a collection; "about 312
 * hours" is a confrontation, and the whole app exists on the other side
 * of someone doing that arithmetic for the first time.
 */

export interface Prompt {
  /** Small caps line. */
  eyebrow: string;
  /** The statement, set large. */
  headline: string;
  /** One sentence under it. */
  detail: string;
  action: string;
  href: string;
}

/** Below this there is no arithmetic worth doing, so none is claimed. */
const ENOUGH = 3;

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function buildPrompt(
  entries: LibraryEntry[],
  hoursOf: (entry: LibraryEntry) => number
): Prompt | null {
  const unplayed = entries.filter(
    (entry) => entry.status === 'wishlist' || entry.status === 'playing'
  );

  if (unplayed.length === 0) {
    return {
      eyebrow: 'How this works',
      headline: 'Save a few, and the shelves start answering to you.',
      detail:
        'Sidequest reads how long games take and works out which ones fit the evening you actually have.',
      action: 'What it does',
      href: '/about',
    };
  }

  if (unplayed.length < ENOUGH) {
    return {
      eyebrow: 'Your library',
      headline: `${plural(unplayed.length, 'game', 'games')} saved.`,
      detail:
        'A couple more and there is a plan worth making — Sidequest needs something to choose between.',
      action: 'Open the library',
      href: '/library',
    };
  }

  const hours = unplayed.reduce((total, entry) => total + hoursOf(entry), 0);
  const rounded = Math.round(hours);

  return {
    eyebrow: 'Your library',
    headline: `${plural(unplayed.length, 'game', 'games')}. About ${plural(
      rounded,
      'hour',
      'hours'
    )}.`,
    detail:
      'Not a to-do list. Sidequest picks the ones you can finish and gives you permission to skip the rest.',
    action: 'Make a plan',
    href: '/plan',
  };
}
