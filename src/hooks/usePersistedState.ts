import { useCallback, useState } from 'react';

/** useState that survives reloads via localStorage (memory-only elsewhere). */
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

  return [value, set];
}
