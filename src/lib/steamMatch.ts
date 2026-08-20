import type { Game } from '@/api/types';

/**
 * Matching a Steam library to game metadata.
 *
 * Steam gives a store listing's name — trademark symbols, edition
 * suffixes, platform noise — and RAWG gives an editorial one. Matching
 * them by string equality fails on most of a real library, and matching
 * them loosely is worse: the wrong game silently takes over an entry and
 * the plan schedules the wrong length. So the comparison is deliberately
 * narrow, and anything it cannot decide is reported rather than guessed.
 */

/** Suffixes a storefront adds and an editorial database does not. */
const EDITIONS =
  /\b(game of the year|goty|definitive|complete|deluxe|ultimate|enhanced|remastered|redux|anniversary|director'?s cut|gold|premium|standard)\s*(edition)?\b/g;

const DECORATION = /[™®©]/g;

/**
 * Everything that is punctuation to one database and structure to the
 * other: "Marvel's Spider-Man" against "Marvel s Spider Man".
 */
const PUNCTUATION = /[^a-z0-9]+/g;

/** Roman numerals up to XX, and the arabic numbers they stand for. */
const ROMAN: Record<string, string> = {
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  x: '10',
  xi: '11',
  xii: '12',
  xiii: '13',
  xiv: '14',
  xv: '15',
  xvi: '16',
  xvii: '17',
  xviii: '18',
  xix: '19',
  xx: '20',
};

/**
 * The comparable form of a title.
 *
 * Lowercased, stripped of decoration and edition noise, with roman
 * numerals folded to digits so "Hades II" and "Hades 2" are the same
 * game — which they are, and which no amount of string distance would
 * tell you.
 */
export function normalizeTitle(name: string): string {
  const base = name
    .toLowerCase()
    .replace(DECORATION, ' ')
    .replace(EDITIONS, ' ')
    .replace(PUNCTUATION, ' ')
    .trim();

  return base
    .split(' ')
    .filter(Boolean)
    .map((word) => ROMAN[word] ?? word)
    .join(' ');
}

export interface SteamGame {
  appid: number;
  name: string;
  minutesForever: number;
  minutes2Weeks: number;
}

/**
 * Whether a candidate from search is the Steam game we asked for.
 *
 * Equality after normalising, and nothing else. A candidate that merely
 * contains the title — "Hades" against "Hades II", "Portal" against
 * "Portal Knights" — is exactly the failure mode that puts a two-hour
 * length on a forty-hour game.
 */
export function isSameGame(steamName: string, candidateName: string): boolean {
  return normalizeTitle(steamName) === normalizeTitle(candidateName);
}

/** Pick the one result that is the same game, if any candidate is. */
export function bestMatch(
  steamName: string,
  candidates: Game[]
): Game | undefined {
  return candidates.find((game) => isSameGame(steamName, game.name));
}

/** Steam counts minutes; the rest of the app counts hours. */
export const hoursOf = (minutes: number): number =>
  Math.round((minutes / 60) * 10) / 10;

/**
 * Attach playtime to games already saved, by name.
 *
 * This needs no network: the library is small, the Steam list is in
 * memory, and a name that matches is a game whose progress we now know.
 * Returns game id → hours played, for the entries it recognised.
 */
export function progressForLibrary(
  steamGames: SteamGame[],
  library: { game: Pick<Game, 'id' | 'name'> }[]
): Record<number, number> {
  const byTitle = new Map<string, SteamGame>();
  for (const game of steamGames) {
    const key = normalizeTitle(game.name);
    // Steam libraries carry duplicates — demos, betas, soundtrack
    // entries. The one with real time on it is the one that counts.
    const existing = byTitle.get(key);
    if (!existing || game.minutesForever > existing.minutesForever)
      byTitle.set(key, game);
  }

  const progress: Record<number, number> = {};
  for (const entry of library) {
    const match = byTitle.get(normalizeTitle(entry.game.name));
    if (match && match.minutesForever > 0)
      progress[entry.game.id] = hoursOf(match.minutesForever);
  }
  return progress;
}

/**
 * The order to offer a Steam library in.
 *
 * Recently played first — those are the games someone is actually in the
 * middle of — then the rest by how much time is on them, which puts the
 * games they care about above the 300 bundle leftovers.
 */
export function importOrder(games: SteamGame[]): SteamGame[] {
  return [...games].sort((a, b) => {
    if (a.minutes2Weeks !== b.minutes2Weeks)
      return b.minutes2Weeks - a.minutes2Weeks;
    return b.minutesForever - a.minutesForever;
  });
}
