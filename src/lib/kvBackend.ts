import type { KVBackend } from './storage';

/**
 * Web's half of the storage adapter. The `.native.ts` sibling carries
 * the SQLite one — a file split rather than a `Platform.OS` branch
 * because Metro follows `require` calls statically: one reference to
 * expo-sqlite in a shared file drags its wasm worker into the web
 * bundle, which is how the web build learned to fail.
 */
export function platformBackend(): KVBackend {
  return {
    getItem: (key) => globalThis.localStorage?.getItem(key) ?? null,
    setItem: (key, value) => {
      const store = globalThis.localStorage;
      if (!store) throw new Error('localStorage unavailable');
      store.setItem(key, value);
    },
    removeItem: (key) => globalThis.localStorage?.removeItem(key),
  };
}
