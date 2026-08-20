import { searchGames } from './rawg';
import type { Game } from './types';
import { bestMatch, hoursOf, type SteamGame } from '@/lib/steamMatch';

/**
 * Turning a Steam library into games this app knows about.
 *
 * Steam has no shared identifier with the metadata source, so each title
 * has to be looked up by name and then verified — see lib/steamMatch for
 * why the verification is strict. Everything here is about doing that
 * without hammering RAWG or hanging the screen: a few requests in
 * flight at a time, progress reported as it goes, and a result that
 * separates what matched from what did not rather than quietly losing
 * the difference.
 */

/** Requests in flight at once — polite to RAWG, quick enough to watch. */
const CONCURRENCY = 4;

export interface ImportedGame {
  game: Game;
  steam: SteamGame;
  hoursPlayed: number;
}

export interface ImportResult {
  matched: ImportedGame[];
  /** Titles no confident match was found for; named, not swallowed. */
  unmatched: SteamGame[];
}

async function lookup(steam: SteamGame): Promise<ImportedGame | null> {
  const page = await searchGames(steam.name, 1).catch(() => null);
  const match = page ? bestMatch(steam.name, page.results) : undefined;
  if (!match) return null;
  return { game: match, steam, hoursPlayed: hoursOf(steam.minutesForever) };
}

/**
 * Look up every selected game, `CONCURRENCY` at a time.
 *
 * `onProgress` is called after each lookup settles so the screen can
 * count up rather than freeze: importing forty games is forty requests,
 * and a spinner with no number attached feels broken well before it is.
 */
/**
 * The same lookup, for a list of titles from anywhere else.
 *
 * A pasted export has no ids and no slugs — only names — so it takes
 * exactly the path a Steam library takes, and gets the same refusal to
 * guess when a name is not a confident match.
 */
export async function importTitles(
  titles: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ matched: { title: string; game: Game }[]; unmatched: string[] }> {
  const result = await importSteamGames(
    titles.map((title, index) => ({
      appid: -(index + 1),
      name: title,
      minutesForever: 0,
      minutes2Weeks: 0,
    })),
    onProgress
  );
  return {
    matched: result.matched.map(({ game, steam }) => ({
      title: steam.name,
      game,
    })),
    unmatched: result.unmatched.map((steam) => steam.name),
  };
}

export async function importSteamGames(
  games: SteamGame[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const matched: ImportedGame[] = [];
  const unmatched: SteamGame[] = [];
  let done = 0;

  const queue = [...games];
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, queue.length) },
    async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const result = await lookup(next);
        if (result) matched.push(result);
        else unmatched.push(next);
        done += 1;
        onProgress?.(done, games.length);
      }
    }
  );

  await Promise.all(workers);

  // Workers finish out of order; the caller asked for a library, not a
  // race result.
  matched.sort((a, b) => b.steam.minutesForever - a.steam.minutesForever);
  unmatched.sort((a, b) => b.minutesForever - a.minutesForever);
  return { matched, unmatched };
}
