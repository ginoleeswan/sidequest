import { QueryClient } from '@tanstack/react-query';

import { RawgError } from './rawg';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // RAWG data is near-static; avoid refetching on every mount.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // The API layer already decided what is worth retrying - a 404 or a
      // bad key is an answer, not a blip. Honour that instead of guessing
      // from the message.
      retry: (failureCount: number, error: unknown) => {
        if (error instanceof RawgError && !error.retryable) return false;
        return failureCount < 2;
      },
      // Back off, and wait at least as long as a rate limiter asked us to.
      retryDelay: (attempt: number, error: unknown) => {
        const askedFor =
          error instanceof RawgError && error.retryAfter
            ? error.retryAfter * 1000
            : 0;
        return Math.max(askedFor, Math.min(1000 * 2 ** attempt, 15_000));
      },
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  /** Infinite browse lists. Distinct from shelves: the cached shapes differ. */
  browse: (section: string) => ['browse', section] as const,
  /** Single-page storefront shelves. */
  shelf: (section: string) => ['shelf', section] as const,
  search: (query: string) => ['search', query] as const,
  /** The record for one game — see api/gameDetail. */
  game: (id: string) => ['game', id] as const,
  /** Its screenshots, trailers, series and stores, fetched beside it. */
  gameMedia: (id: string) => ['game-media', id] as const,
};
