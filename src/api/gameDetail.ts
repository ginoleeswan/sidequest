import {
  getGame,
  getGameSeries,
  getMovies,
  getScreenshots,
  getStoreLinks,
} from './rawg';
import { queryKeys } from './queryClient';

/**
 * Everything the detail screen needs, as one cache entry.
 *
 * Shared so a tile can prefetch exactly what the screen will read: hover
 * a card and the page it opens is already warm, with no second request
 * and no loading state.
 */
export function gameDetailQuery(id: string | number) {
  return {
    queryKey: queryKeys.game(String(id)),
    queryFn: async () => {
      const [game, screenshots, trailers, series, storeLinks] =
        await Promise.all([
          getGame(id),
          getScreenshots(id),
          getMovies(id),
          getGameSeries(id),
          getStoreLinks(id).catch(() => ({ results: [] })),
        ]);
      return {
        game,
        screenshots: screenshots.results,
        trailers: trailers.results,
        series: series.results,
        storeLinks: storeLinks.results,
      };
    },
  };
}
