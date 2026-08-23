import type { KVBackend } from './storage';

/**
 * Web's half of the storage adapter. The `.native.ts` sibling carries
 * the SQLite one — a file split rather than a `Platform.OS` branch
 * because Metro follows `require` calls statically: one reference to
 * expo-sqlite in a shared file drags its wasm worker into the web
 * bundle, which is how the web build learned to fail.
 */
/**
 * Present is not the same as usable.
 *
 * Static rendering runs this file in Node, where `globalThis.localStorage`
 * is defined but is not a Storage — so `?.` sails straight past it and
 * the call throws `getItem is not a function`. Optional chaining only
 * asks whether the object exists; the question worth asking is whether
 * it does anything.
 *
 * Latent until something read storage at module scope rather than
 * inside a component after hydration. Supabase's client does exactly
 * that when restoring a session, and the web build stopped exporting.
 */
function usable(): Storage | null {
  const store = globalThis.localStorage;
  return typeof store?.getItem === 'function' ? store : null;
}

export function platformBackend(): KVBackend {
  return {
    getItem: (key) => usable()?.getItem(key) ?? null,
    setItem: (key, value) => {
      const store = usable();
      if (!store) throw new Error('localStorage unavailable');
      store.setItem(key, value);
    },
    removeItem: (key) => usable()?.removeItem(key),
  };
}
