import type { QueryClient } from '@tanstack/react-query';

import {
  getGame,
  getGameSeries,
  getMovies,
  getScreenshots,
  getStoreLinks,
} from './rawg';
import { queryKeys } from './queryClient';
import type { Game, GameDetail, Movie, Screenshot, StoreLink } from './types';

/**
 * A game's detail is near-static. Five minutes was the app-wide default,
 * which meant stepping back into a game you looked at ten minutes ago
 * paid for its endpoints again; half an hour keeps a browsing session
 * on the cache, and the persister still throws everything away at a day.
 */
const GAME_STALE_MS = 30 * 60 * 1000;
/** Screenshots and trailers change even less often than the record. */
const MEDIA_STALE_MS = 60 * 60 * 1000;

export interface GameMedia {
  screenshots: Screenshot[];
  trailers: Movie[];
  series: Game[];
  storeLinks: StoreLink[];
}

export const EMPTY_MEDIA: GameMedia = {
  screenshots: [],
  trailers: [],
  series: [],
  storeLinks: [],
};

/**
 * The record: name, description, ratings, platforms, the people who
 * made it. The one request the page cannot draw without.
 */
export function gameQuery(id: string | number) {
  return {
    queryKey: queryKeys.game(String(id)),
    queryFn: () => getGame(id),
    staleTime: GAME_STALE_MS,
  };
}

/**
 * Everything else the page shows: screenshots, trailers, the rest of the
 * series and where to buy it.
 *
 * Its own query, separate from the record, and that separation is most
 * of the page's perceived speed. These used to travel with the record in
 * one `Promise.all`, so the whole screen sat on its skeleton until the
 * slowest of five RAWG calls answered — and the slowest was reliably one
 * of these four, none of which the reader needs before they can start
 * reading. The record paints as soon as it lands; the media arrives
 * under it.
 */
export function gameMediaQuery(id: string | number) {
  return {
    queryKey: queryKeys.gameMedia(String(id)),
    queryFn: async (): Promise<GameMedia> => {
      const [screenshots, trailers, series, storeLinks] = await Promise.all([
        getScreenshots(id).catch(() => ({ results: [] })),
        getMovies(id).catch(() => ({ results: [] })),
        getGameSeries(id).catch(() => ({ results: [] })),
        getStoreLinks(id).catch(() => ({ results: [] })),
      ]);
      return {
        screenshots: screenshots.results,
        trailers: trailers.results,
        series: series.results,
        storeLinks: storeLinks.results,
      };
    },
    staleTime: MEDIA_STALE_MS,
  };
}

/**
 * What a tile already knows about the game it opens.
 *
 * Every list RAWG returns carries the fields the masthead is built from
 * — name, art, genres, rating, playtime — so the page can paint its
 * hero from the tile's own data at zero network cost and fill in the
 * record when it arrives. Kept in a plain map rather than the query
 * cache: it is a hint, not an answer, and must never be persisted as
 * one.
 */
const seeds = new Map<string, Game>();

export function seedGame(game: Game): void {
  seeds.set(String(game.id), game);
  if (game.slug) seeds.set(game.slug, game);
}

/**
 * A list-shaped `Game` for this id, from anything already in the cache.
 *
 * Checks the seeds first, then walks every cached RAWG list — shelves,
 * browse pages, searches, series rails — for a row with this id or
 * slug. Deep links from Recent or a shared URL land here too, as long
 * as the game appeared on any screen this session.
 */
export function cachedGame(
  queryClient: QueryClient,
  id: string
): Game | undefined {
  const seeded = seeds.get(id);
  if (seeded) return seeded;

  const numeric = Number(id);
  const matches = (row: unknown): row is Game =>
    typeof row === 'object' &&
    row !== null &&
    typeof (row as Game).name === 'string' &&
    ((row as Game).id === numeric || (row as Game).slug === id);

  for (const query of queryClient.getQueryCache().getAll()) {
    const data = query.state.data as
      | { pages?: { results?: unknown[] }[]; results?: unknown[] }
      | unknown[]
      | undefined;
    if (!data) continue;
    const rows: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray(data.pages)
        ? data.pages.flatMap((page) => page?.results ?? [])
        : Array.isArray(data.results)
          ? data.results
          : [];
    const found = rows.find(matches);
    if (found) return found;
  }
  return undefined;
}

/**
 * The record a list row implies, for the page to stand on while the
 * real one loads. Every field the list lacks is left absent, and the
 * page treats an absent field as "not yet" rather than "none".
 */
export function placeholderDetail(game: Game): GameDetail {
  return { ...game, description: '' };
}

/**
 * Warm the page a tile is about to open.
 *
 * Hover a card, or land a finger on it, and by the time the tap
 * completes the record is usually resolved and the media on its way —
 * so the screen arrives with content instead of bones.
 */
export function prefetchGame(queryClient: QueryClient, game: Game): void {
  seedGame(game);
  void queryClient.prefetchQuery(gameQuery(game.id));
  void queryClient.prefetchQuery(gameMediaQuery(game.id));
}

/**
 * Warm a page for a game known only by id — a recent-games row, an
 * alert — where there is no list row to seed the masthead from. The
 * record and the media still arrive ahead of the tap.
 */
export function warmGame(queryClient: QueryClient, id: string | number): void {
  void queryClient.prefetchQuery(gameQuery(id));
  void queryClient.prefetchQuery(gameMediaQuery(id));
}
