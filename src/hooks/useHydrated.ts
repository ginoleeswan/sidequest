import { useSyncExternalStore } from 'react';

/**
 * False during the hydration render, true from the commit after it.
 *
 * Anything a page reads from the device — stored state, viewport width,
 * the clock — is unavailable while the HTML is being generated, so a
 * component that reads it during render produces different output on the
 * client than the server put in the file. React calls that a hydration
 * mismatch and responds by throwing the server's markup away and
 * re-rendering the whole tree on the client, which forfeits the entire
 * point of shipping pre-rendered HTML.
 *
 * Gate device-derived values on this and the first client render matches
 * the file exactly; the real values arrive on the very next commit.
 *
 * Implemented as an external store rather than an effect: React calls
 * `getServerSnapshot` for the hydration render specifically, which is
 * precisely the distinction being drawn, and it needs no state update to
 * settle.
 */

/** Nothing to subscribe to — the answer changes once, at hydration. */
const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
