import { QueryClient } from '@tanstack/react-query';

import {
  cachedGame,
  gameMediaQuery,
  gameQuery,
  placeholderDetail,
  prefetchGame,
  seedGame,
} from '../gameDetail';
import type { Game } from '../types';

const hades = {
  id: 22509,
  slug: 'hades',
  name: 'Hades',
  background_image: 'https://media.rawg.io/media/games/hades.jpg',
  rating: 4.5,
  rating_top: 5,
  released: '2020-09-17',
  playtime: 20,
} as Game;

/**
 * The page paints its masthead from whatever a list already knew about
 * the game, so the cache walk has to find a row wherever RAWG's shapes
 * put one: a shelf, an infinite browse, a plain array from a `select`.
 */
describe('finding a game the app has already seen', () => {
  it('finds a row in a paged list', () => {
    const client = new QueryClient();
    client.setQueryData(['shelf', 'trending'], { count: 1, results: [hades] });
    expect(cachedGame(client, '22509')).toBe(hades);
  });

  it('finds a row in an infinite list, by slug as well as id', () => {
    const client = new QueryClient();
    client.setQueryData(['browse', 'new'], {
      pages: [{ results: [] }, { results: [hades] }],
      pageParams: [1, 2],
    });
    expect(cachedGame(client, 'hades')).toBe(hades);
  });

  it('finds a row in a selected array', () => {
    const client = new QueryClient();
    client.setQueryData(['personal', 'mood'], [hades]);
    expect(cachedGame(client, '22509')).toBe(hades);
  });

  it('prefers what a tile handed over directly', () => {
    const client = new QueryClient();
    const fresher = { ...hades, name: 'Hades (seeded)' };
    seedGame(fresher);
    expect(cachedGame(client, '22509')).toBe(fresher);
    expect(cachedGame(client, 'hades')).toBe(fresher);
  });

  it('is empty-handed for a game nobody has shown', () => {
    const client = new QueryClient();
    client.setQueryData(['shelf', 'trending'], { count: 1, results: [hades] });
    client.setQueryData(['igdb-extras', 'v3', 'hades'], { cover: 'co1' });
    expect(cachedGame(client, '999999')).toBeUndefined();
  });
});

describe('the record a row stands in for', () => {
  it('carries the row and an empty description', () => {
    const detail = placeholderDetail(hades);
    expect(detail.name).toBe('Hades');
    expect(detail.description).toBe('');
    expect(detail.ratings).toBeUndefined();
  });
});

describe('warming the page a tile opens', () => {
  it('seeds the row and asks for both halves of the page', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (/\/(screenshots|movies|game-series|stores)\?/.test(url))
        return new Response(JSON.stringify({ count: 0, results: [] }));
      return new Response(JSON.stringify({ ...hades, description: 'x' }));
    }) as unknown as typeof fetch;

    prefetchGame(client, hades);
    expect(cachedGame(client, '22509')).toBe(hades);
    await Promise.all([
      client.fetchQuery(gameQuery(hades.id)),
      client.fetchQuery(gameMediaQuery(hades.id)),
    ]);
    expect(client.getQueryData(gameQuery(hades.id).queryKey)).toMatchObject({
      description: 'x',
    });
    expect(client.getQueryData(gameMediaQuery(hades.id).queryKey)).toEqual({
      screenshots: [],
      trailers: [],
      series: [],
      storeLinks: [],
    });
  });

  it('gives the page its record even when a media call fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (/\/movies\?/.test(url)) return new Response('nope', { status: 500 });
      if (/\/(screenshots|game-series|stores)\?/.test(url))
        return new Response(JSON.stringify({ count: 0, results: [] }));
      return new Response(JSON.stringify({ ...hades, description: 'x' }));
    }) as unknown as typeof fetch;

    const media = await client.fetchQuery(gameMediaQuery(hades.id));
    expect(media.trailers).toEqual([]);
  });
});
