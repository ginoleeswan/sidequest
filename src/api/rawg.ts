import type {
  CollectionFeedItem,
  Game,
  GameDetail,
  Movie,
  Paged,
  Screenshot,
} from './types';

const BASE_URL = 'https://api.rawg.io/api';

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
  const url = new URL(`${BASE_URL}/${path}`);
  url.searchParams.set('key', apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
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
