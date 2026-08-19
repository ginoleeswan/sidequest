import { useCallback, useState } from 'react';

import { useHydrated } from './useHydrated';

/**
 * useState that survives reloads via localStorage (memory-only elsewhere).
 *
 * The stored value is withheld until hydration is done, so the first
 * client render matches the pre-rendered HTML, which was generated with
 * no storage to read. Writes are unaffected.
 */
export function usePersistedState<T>(
  key: string,
  initial: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify(next));
      } catch {
        // Storage unavailable - in-memory state still works.
      }
    },
    [key]
  );

  // Deliberately not `value`: on the hydration render the server had no
  // storage, so neither may we.
  return [useHydrated() ? value : initial, set];
}
