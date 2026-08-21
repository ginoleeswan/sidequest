import { useCallback, useState } from 'react';

import { useHydrated } from './useHydrated';
import { kv } from '@/lib/storage';

/**
 * useState that survives reloads via the platform's store — localStorage
 * on web, SQLite's key-value store on iOS and Android.
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
      const raw = kv.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        kv.setItem(key, JSON.stringify(next));
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
