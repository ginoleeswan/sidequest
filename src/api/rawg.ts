import { Platform } from 'react-native';

import type {
  CollectionFeedItem,
  Game,
  GameDetail,
  Movie,
  Paged,
  Screenshot,
  StoreLink,
} from './types';

/**
 * On production web the API and image CDN are proxied through our own
 * domain (see vercel.json rewrites). Same-origin requests can't be blocked
 * by CORS and are far less likely to be caught by content blockers or
 * privacy relays - the cause of "Load failed" fetches on iOS Safari.
 */
const USE_PROXY = Platform.OS === 'web' && !__DEV__;

const BASE_URL = USE_PROXY ? '/rawg' : 'https://api.rawg.io/api';

const PAGE_SIZE = '40';

/** Route a media.rawg.io asset URL through the same-origin proxy on web. */
export function mediaUri(uri: string | null | undefined): string | undefined {
  if (!uri) return undefined;
  if (USE_PROXY && uri.startsWith('https://media.rawg.io/')) {
    return uri.replace('https://media.rawg.io', '/media');
  }
  return uri;
}

/** Read lazily: reading at module scope couples import order to env setup. */
function apiKey(): string {
  // Trim: keys pasted into a hosting dashboard routinely carry a trailing
  // newline, which URLSearchParams encodes as %0A and RAWG rejects.
  const key = process.env.EXPO_PUBLIC_RAWG_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'EXPO_PUBLIC_RAWG_API_KEY is not set — copy .env.example to .env'
    );
  }
  return key;
}

async function rawg<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const search = new URLSearchParams({ key: apiKey(), ...params });
  const res = await fetch(`${BASE_URL}/${path}?${search}`);
  if (!res.ok) throw new Error(`RAWG ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** YYYY-MM-DD, `offset` days from today (negative = past). */
function fromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const YEAR = 365;

/**
 * RAWG's default /games ordering is all-time popularity, which surfaces
 * 2007-2015 classics forever. Every browse view uses an explicit date
 * window with a deliberate ordering instead.
 */
type WindowParams = { dates: string; ordering: string };

const windowed = (
  from: number,
  to: number,
  ordering: string
): WindowParams => ({
  dates: `${fromToday(from)},${fromToday(to)}`,
  ordering,
});

const page = (n: number) => ({ page: String(n), page_size: PAGE_SIZE });

/** What players are adding right now. */
export const getTrendingGames = (pageNum = 1): Promise<Paged<Game>> =>
  rawg('games', { ...windowed(-YEAR, 0, '-added'), ...page(pageNum) });

/** Out in the last three months. */
export const getNewReleases = (pageNum = 1): Promise<Paged<Game>> =>
  rawg('games', { ...windowed(-90, 0, '-added'), ...page(pageNum) });

/** Announced and anticipated, next nine months. */
export const getComingSoon = (pageNum = 1): Promise<Paged<Game>> =>
  rawg('games', { ...windowed(1, 270, '-added'), ...page(pageNum) });

/** Recent years, ranked by Metacritic. */
export const getTopRated = (pageNum = 1): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(-5 * YEAR, 0, '-metacritic'),
    metacritic: '80,100',
    ...page(pageNum),
  });

/** Genre browsing: a wider window so there's depth, still modern. */
export const getGames = (genre?: string, pageNum = 1): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(-3 * YEAR, 0, '-added'),
    ...(genre ? { genres: genre } : {}),
    ...page(pageNum),
  });

export async function getMustPlayGames(pageNum = 1): Promise<Paged<Game>> {
  const feed = await rawg<Paged<CollectionFeedItem>>(
    'collections/must-play/feed',
    page(pageNum)
  );
  return {
    count: feed.count,
    next: feed.next,
    results: feed.results.map((item) => item.game),
  };
}

export const searchGames = (query: string, pageNum = 1): Promise<Paged<Game>> =>
  rawg('games', {
    search: query.toLowerCase(),
    ordering: '-rating',
    search_precise: 'true',
    ...page(pageNum),
  });

export const getGame = (id: string | number) => rawg<GameDetail>(`games/${id}`);
export const getScreenshots = (id: string | number) =>
  rawg<Paged<Screenshot>>(`games/${id}/screenshots`);
export const getMovies = (id: string | number) =>
  rawg<Paged<Movie>>(`games/${id}/movies`);
export const getGameSeries = (id: string | number) =>
  rawg<Paged<Game>>(`games/${id}/game-series`);
export const getStoreLinks = (id: string | number) =>
  rawg<Paged<StoreLink>>(`games/${id}/stores`);
