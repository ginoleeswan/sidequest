import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { kv } from '@/lib/storage';

/**
 * Keeps the last answers RAWG gave, across sessions.
 *
 * Without this every visit starts from bones, even for shelves that have
 * not changed in a week — the query cache lives in memory and dies with
 * the tab. Restoring it means a return visit paints real content on the
 * first frame and revalidates behind it, which is most of the difference
 * between an app and a website.
 *
 * Bounded on purpose. The library shares this device's storage and is
 * the only copy of the user's own data; a cache that grew without limit
 * could push a save into a quota error. So the cache gets its own key,
 * a size ceiling, and loses to the library every time.
 */

const KEY = 'sidequest.query-cache.v1';

/** Beyond a day, revalidating from scratch is the honest thing to do. */
export const MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * A third of a megabyte of JSON: the small, valuable queries fit easily,
 * and the synchronous write stays short enough not to be felt.
 */
const MAX_BYTES = 350_000;

/**
 * What is worth carrying across a launch at all.
 *
 * Everything was, and that was the cost the whole app paid: the cache
 * is written to SQLite synchronously on the JS thread, every couple of
 * seconds while anything loads, and read back and parsed before the
 * first screen. A megabyte of it meant a stall every two seconds and a
 * heavier launch under the splash — the app felt slow everywhere. The
 * things worth restoring are small: the artwork answers that let a
 * masthead open on its logo, the records a tapped game opens with, the
 * shelves Home paints first. Infinite browse pages, search results,
 * screenshots, streams and trailers refetch cheaply and are left out.
 */
const PERSISTED = new Set([
  'art',
  'game',
  'shelf',
  'personal',
  'stage-week',
  'out-today',
  'creators',
]);

export const dehydrateOptions = {
  shouldDehydrateQuery: (query: {
    queryKey: readonly unknown[];
    state: { status: string };
  }) =>
    query.state.status === 'success' &&
    PERSISTED.has(String(query.queryKey[0])),
};

/**
 * What is worth keeping when not everything fits, best first.
 *
 * A game's artwork answer is a few hundred bytes and is what makes a
 * masthead open on its logo instead of typing the name and replacing
 * it; a page of infinite browse results is tens of kilobytes that a
 * scroll will refetch anyway. When the cache is over budget the cheap,
 * valuable things stay and the bulky, replaceable ones go.
 */
const KEEP_ORDER = ['art', 'game', 'game-media', 'shelf'];

function rank(key: unknown): number {
  const head = Array.isArray(key) ? String(key[0]) : '';
  const at = KEEP_ORDER.indexOf(head);
  return at < 0 ? KEEP_ORDER.length : at;
}

/**
 * The cache, trimmed to fit.
 *
 * It used to be all or nothing: one byte over the ceiling and the whole
 * cache was written as empty — every logo, every shelf, every record —
 * so a heavy browsing session made the next launch colder than a light
 * one. Now the least valuable queries go first, the newest of each
 * kind are kept longest, and whatever fits is written. Never a throw: a
 * failed write could cost someone their library.
 */
export function fitWithin(client: PersistedClient, budget: number): string {
  const whole = JSON.stringify(client);
  if (whole.length <= budget) return whole;
  const queries = [...client.clientState.queries].sort(
    (a, b) =>
      rank(a.queryKey) - rank(b.queryKey) ||
      (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0)
  );
  const kept: typeof queries = [];
  // Room for the envelope around the queries.
  let size = JSON.stringify({
    ...client,
    clientState: { ...client.clientState, queries: [] },
  }).length;
  for (const query of queries) {
    const bytes = JSON.stringify(query).length + 1;
    if (size + bytes > budget) continue;
    kept.push(query);
    size += bytes;
  }
  return JSON.stringify({
    ...client,
    clientState: { ...client.clientState, queries: kept },
  });
}

export const persister = createSyncStoragePersister({
  /**
   * The platform's synchronous store, not localStorage by name — on
   * native this is SQLite's key-value table, and without it the query
   * cache (the shelves, the lengths, everything RAWG answered) was
   * re-fetched from a cold start every single launch.
   */
  storage: kv,
  key: KEY,
  // Every write is synchronous on the JS thread; fewer of them is the
  // difference between a cache and a metronome of dropped frames.
  throttleTime: 5000,
  serialize: (client: PersistedClient) => fitWithin(client, MAX_BYTES),
  deserialize: (cached: string) =>
    cached ? (JSON.parse(cached) as PersistedClient) : (undefined as never),
});
