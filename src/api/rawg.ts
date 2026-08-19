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

/** How long a single RAWG request may take before we give up on it. */
const TIMEOUT_MS = 12_000;

/**
 * A failed RAWG call, carrying enough for callers to decide what to do:
 * the HTTP status (0 for network/timeout), whether retrying could help,
 * and a sentence safe to show a person.
 */
export class RawgError extends Error {
  readonly status: number;
  readonly retryable: boolean;
  readonly userMessage: string;
  /** Seconds RAWG asked us to wait, when it said so. */
  readonly retryAfter?: number;

  constructor(init: {
    status: number;
    message: string;
    userMessage: string;
    retryable: boolean;
    retryAfter?: number;
  }) {
    super(init.message);
    this.name = 'RawgError';
    this.status = init.status;
    this.userMessage = init.userMessage;
    this.retryable = init.retryable;
    this.retryAfter = init.retryAfter;
  }
}

function describe(status: number): { userMessage: string; retryable: boolean } {
  if (status === 0)
    return {
      userMessage: "Couldn't reach the game database — check your connection.",
      retryable: true,
    };
  if (status === 401 || status === 403)
    return {
      userMessage: 'This copy of Sidequest is missing a valid API key.',
      retryable: false,
    };
  if (status === 404)
    return { userMessage: "That doesn't exist any more.", retryable: false };
  if (status === 429)
    return {
      userMessage: 'The game database is rate-limiting us — one moment.',
      retryable: true,
    };
  if (status >= 500)
    return {
      userMessage: 'The game database is having a moment. Try again shortly.',
      retryable: true,
    };
  return {
    userMessage: 'Something went wrong loading games.',
    retryable: false,
  };
}

/** A sentence safe to show a person, whatever went wrong. */
export function friendlyError(error: unknown): string {
  if (error instanceof RawgError) return error.userMessage;
  return 'Something went wrong. Try again in a moment.';
}

async function rawg<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const search = new URLSearchParams({ key: apiKey(), ...params });

  // A request that never settles is worse than one that fails: without a
  // deadline a stalled connection leaves the UI in a loading state for
  // ever, and React Query never gets to retry.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${path}?${search}`, {
      signal: controller.signal,
    });
  } catch (cause) {
    const timedOut = controller.signal.aborted;
    throw new RawgError({
      status: 0,
      message: `RAWG ${path}: ${timedOut ? 'timed out' : String(cause)}`,
      ...describe(0),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const retryAfter = Number(res.headers?.get?.('retry-after')) || undefined;
    throw new RawgError({
      status: res.status,
      message: `RAWG ${path}: ${res.status}`,
      retryAfter,
      ...describe(res.status),
    });
  }

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

/** User-chosen refinements layered onto any browse view. */
export interface BrowseFilters {
  /** Overrides the section's default ordering when set. */
  ordering?: string;
  /** Comma-separated RAWG parent-platform ids (1 PC, 2 PS, 3 Xbox, 7 Switch). */
  parentPlatforms?: string;
  /** Only Metacritic 80+. */
  minMetacritic?: boolean;
}

const filterParams = (f?: BrowseFilters) => ({
  ...(f?.parentPlatforms ? { parent_platforms: f.parentPlatforms } : {}),
  ...(f?.minMetacritic ? { metacritic: '80,100' } : {}),
  ...(f?.ordering ? { ordering: f.ordering } : {}),
});

/** What players are adding right now. */
export const getTrendingGames = (
  pageNum = 1,
  f?: BrowseFilters
): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(-YEAR, 0, '-added'),
    ...page(pageNum),
    ...filterParams(f),
  });

/** Out in the last three months. */
export const getNewReleases = (
  pageNum = 1,
  f?: BrowseFilters
): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(-90, 0, '-added'),
    ...page(pageNum),
    ...filterParams(f),
  });

/** Announced and anticipated, next nine months. */
export const getComingSoon = (
  pageNum = 1,
  f?: BrowseFilters
): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(1, 270, '-added'),
    ...page(pageNum),
    ...filterParams(f),
  });

/** Recent years, ranked by Metacritic. */
export const getTopRated = (
  pageNum = 1,
  f?: BrowseFilters
): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(-5 * YEAR, 0, '-metacritic'),
    metacritic: '80,100',
    ...page(pageNum),
    ...filterParams(f),
  });

/** Genre browsing: a wider window so there's depth, still modern. */
export const getGames = (
  genre?: string,
  pageNum = 1,
  f?: BrowseFilters
): Promise<Paged<Game>> =>
  rawg('games', {
    ...windowed(-3 * YEAR, 0, '-added'),
    ...(genre ? { genres: genre } : {}),
    ...page(pageNum),
    ...filterParams(f),
  });

export async function getMustPlayGames(
  pageNum = 1,
  _f?: BrowseFilters
): Promise<Paged<Game>> {
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

export const searchGames = (
  query: string,
  pageNum = 1,
  f?: BrowseFilters
): Promise<Paged<Game>> =>
  rawg('games', {
    search: query.toLowerCase(),
    ordering: '-rating',
    search_precise: 'true',
    ...page(pageNum),
    ...filterParams(f),
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
