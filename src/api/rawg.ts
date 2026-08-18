import { Platform } from 'react-native';

import type {
  CollectionFeedItem,
  Game,
  GameDetail,
  Movie,
  Paged,
  Screenshot,
} from './types';

/**
 * On production web the API and image CDN are proxied through our own
 * domain (see vercel.json rewrites). Same-origin requests can't be blocked
 * by CORS and are far less likely to be caught by content blockers or
 * privacy relays - the cause of "Load failed" fetches on iOS Safari.
 */
const USE_PROXY = Platform.OS === 'web' && !__DEV__;

const BASE_URL = USE_PROXY ? '/rawg' : 'https://api.rawg.io/api';

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
  const key = process.env.EXPO_PUBLIC_RAWG_API_KEY;
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

export function getGames(genre?: string): Promise<Paged<Game>> {
  return rawg('games', genre ? { genres: genre } : {});
}

export async function getMustPlayGames(): Promise<Paged<Game>> {
  const feed = await rawg<Paged<CollectionFeedItem>>(
    'collections/must-play/feed'
  );
  return { count: feed.count, results: feed.results.map((item) => item.game) };
}

export function searchGames(query: string): Promise<Paged<Game>> {
  return rawg('games', {
    search: query.toLowerCase(),
    ordering: '-rating',
    page_size: '50',
    search_precise: 'true',
  });
}

export const getGame = (id: string | number) => rawg<GameDetail>(`games/${id}`);
export const getScreenshots = (id: string | number) =>
  rawg<Paged<Screenshot>>(`games/${id}/screenshots`);
export const getMovies = (id: string | number) =>
  rawg<Paged<Movie>>(`games/${id}/movies`);
export const getGameSeries = (id: string | number) =>
  rawg<Paged<Game>>(`games/${id}/game-series`);
