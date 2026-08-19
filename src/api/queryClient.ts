import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // RAWG data is near-static; avoid refetching on every mount.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      // A 4xx is an answer, not a blip - retrying it just delays the
      // error state. Network and 5xx failures still get two more tries.
      retry: (failureCount: number, error: unknown) => {
        const status = Number(/\b(\d{3})$/.exec(String(error))?.[1]);
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
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
  game: (id: string) => ['game', id] as const,
};
