import type { KVBackend } from './storage';

/**
 * Native's half of the storage adapter: expo-sqlite's key-value store
 * through its synchronous API, which is what lets every call site in
 * the app stay exactly as it was — the reads at first render and the
 * write-and-report contract both assume synchrony.
 *
 * If the native module cannot load — a test runner, a mis-built
 * binary — the fallback is a Map: the session works, writes report
 * honestly through the same channel, and nothing crashes at import
 * time. Tests exercise exactly this path, which keeps their
 * clean-start behaviour by construction.
 */

function memoryBackend(): KVBackend {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

export function platformBackend(): KVBackend {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- platform-conditional module
    const store = require('expo-sqlite/kv-store').default;
    // Touch the sync path once so a broken binding fails HERE, where
    // the fallback exists, rather than mid-session on a save.
    store.getItemSync('sidequest.storage.probe');
    return {
      getItem: (key) => store.getItemSync(key),
      setItem: (key, value) => store.setItemSync(key, value),
      removeItem: (key) => void store.removeItemSync(key),
    };
  } catch {
    return memoryBackend();
  }
}
