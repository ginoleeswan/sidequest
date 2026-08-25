import type { Game } from '@/api/types';
import type { LibraryEntry } from './library';
import type { Section } from '@/constants/categories';

/**
 * What the home page shows today.
 *
 * The storefront was the same five shelves in the same order for
 * everyone, for ever. Nothing here fetches anything: it decides what to
 * ask for, from the date and from a library that never leaves the
 * device.
 *
 * Two rules shape all of it. Different every day, not every refresh — a
 * page that reshuffles while you look at it reads as broken rather than
 * alive. And nothing personal during the hydration render: the
 * pre-rendered HTML was built without a library, so callers gate this on
 * hydration and the page personalises on the next commit.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Days since the epoch — the same number all day, in the local zone. */
export function dayNumber(now: number): number {
  const date = new Date(now);
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY
  );
}

/**
 * A number that changes daily and differs between people.
 *
 * Folding the library in means two people on the same day see different
 * shelves, which is the difference between a rotation and a schedule.
 */
export function feedSeed(now: number, entries: LibraryEntry[]): number {
  let hash = dayNumber(now) * 2654435761;
  for (const entry of entries)
    hash = (hash ^ (entry.game.id * 2246822519)) >>> 0;
  return hash >>> 0;
}

/** A small deterministic PRNG — same seed, same page, all day. */
export function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `count` shelves out of the pool, in a stable shuffled order.
 *
 * Everything in the pool comes round; nothing is picked twice on one
 * day; and tomorrow the answer is different.
 */
export function pickShelves(
  pool: Section[],
  count: number,
  seed: number
): Section[] {
  const shuffled = [...pool];
  const next = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Drop the games already in the library.
 *
 * A storefront that keeps offering someone the game they saved last week
 * is not a storefront, it is a goldfish. The bookmark on the tile said
 * "saved"; the row itself should have moved on.
 */
/**
 * A game's identity for the purposes of not showing it twice.
 *
 * RAWG carries the same release under more than one entry — "The Sinking
 * City 2" and "Sinking City 2" are different ids with different slugs —
 * so an id is not enough. Articles and punctuation go, because that is
 * the whole of the difference in every case seen so far.
 */
function gameKey(game: Game): string {
  return game.name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Drop repeats, optionally against what earlier rows already showed.
 *
 * Two rows on one screen offering the same game is the kind of thing
 * nobody reports and everybody notices. Pass a shared `seen` down a
 * page's rows to make each row's contents new.
 */
export function dedupeGames(
  games: Game[],
  seen: Set<string> = new Set()
): Game[] {
  return games.filter((game) => {
    const key = gameKey(game);
    const id = `#${game.id}`;
    if (seen.has(key) || seen.has(id)) return false;
    seen.add(key);
    seen.add(id);
    return true;
  });
}

export function withoutOwned(games: Game[], entries: LibraryEntry[]): Game[] {
  if (entries.length === 0) return games;
  const owned = new Set(entries.map((entry) => entry.game.id));
  return games.filter((game) => !owned.has(game.id));
}

export interface PersonalShelf {
  key: string;
  title: string;
  eyebrow: string;
  /** The genre slug to fetch, when the shelf is a genre query. */
  genre?: string;
  /** Hours either side of a target length, when it is a length query. */
  window?: { min: number; max: number };
}

/** Newest first, and only what is still to play. */
function pending(entries: LibraryEntry[]): LibraryEntry[] {
  return entries
    .filter((entry) => entry.status !== 'finished')
    .sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * "Because you saved Hades" — the genre of the last thing they saved.
 *
 * Deliberately the most recent rather than the most common: a backlog
 * accumulated over years describes who someone used to be, and the game
 * saved on Tuesday describes what they are in the mood for.
 */
export function becauseYouSaved(entries: LibraryEntry[]): PersonalShelf | null {
  for (const entry of pending(entries)) {
    const genre = entry.game.genres?.[0];
    if (genre?.slug)
      return {
        key: `because-${genre.slug}`,
        title: `More ${genre.name.toLowerCase()}, like ${entry.game.name}`,
        eyebrow: 'BECAUSE YOU SAVED IT',
        genre: genre.slug,
      };
  }
  return null;
}

/**
 * "Short, like the ones you actually finish."
 *
 * The median of what someone has finished is the most honest number this
 * app holds about them: not what they own, not what they meant to play,
 * but the length of game they see the end of. No storefront anywhere
 * else can build this row.
 */
export function likeYouFinish(
  entries: LibraryEntry[],
  hoursOf: (entry: LibraryEntry) => number
): PersonalShelf | null {
  const lengths = entries
    .filter((entry) => entry.status === 'finished')
    .map(hoursOf)
    .filter((hours) => hours > 0)
    .sort((a, b) => a - b);

  // Two is a coincidence; three is a habit.
  if (lengths.length < 3) return null;

  const median = lengths[Math.floor(lengths.length / 2)];
  const min = Math.max(1, Math.round(median * 0.7));
  const max = Math.round(median * 1.3);

  return {
    key: 'like-you-finish',
    title: `Around ${Math.round(median)} hours, like the ones you finish`,
    eyebrow: 'YOUR LENGTH',
    window: { min, max },
  };
}

/** Games inside a length window, for the shelf above. */
export function withinLength(
  games: Game[],
  window: { min: number; max: number }
): Game[] {
  return games.filter(
    (game) => game.playtime >= window.min && game.playtime <= window.max
  );
}
