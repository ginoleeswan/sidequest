import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

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
 * Roughly a megabyte of JSON. Comfortably inside every browser's quota
 * alongside a large library, and enough for the shelves someone actually
 * scrolls.
 */
const MAX_BYTES = 1_000_000;

export const persister = createSyncStoragePersister({
  storage: globalThis.localStorage,
  key: KEY,
  throttleTime: 2000,
  serialize: (client: PersistedClient) => {
    const json = JSON.stringify(client);
    // Drop rather than throw: an over-large cache is a missed
    // optimisation, but a failed write could cost someone their library.
    return json.length > MAX_BYTES ? '' : json;
  },
  deserialize: (cached: string) =>
    cached ? (JSON.parse(cached) as PersistedClient) : (undefined as never),
});
