/**
 * The one place the app writes to the device.
 *
 * The library is the user's only copy of their data — there is no
 * account and no server holding a backup. A write that fails silently
 * therefore loses something irreplaceable while the UI carries on as if
 * it saved, which is the worst way for this to go wrong.
 *
 * So writes report. Callers decide what to do about it; what they must
 * not do is assume success.
 */

import { platformBackend } from './kvBackend';

export type WriteResult =
  { ok: true } | { ok: false; reason: 'full' | 'unavailable'; error: unknown };

/**
 * The storage the platform actually has.
 *
 * The whole file was written against `localStorage`, which native does
 * not have — so on a phone every read fell back and every write
 * reported `unavailable`, and the app ran perfectly while saving
 * nothing. The one honest description of that state is "data loss with
 * good manners".
 *
 * Native uses expo-sqlite's key-value store through its synchronous
 * API, which is what lets every call site in the app stay exactly as
 * it was: the reads at first render and the write-and-report contract
 * both assume synchrony, and an async layer here would have meant
 * rewriting the library, the durations, the drops and the query
 * persister at once. SQLite's sync bindings are the rare case where
 * the easy path and the correct one agree.
 *
 * If the native module cannot load — a test runner, a mis-built
 * binary — the fallback is a Map: the session works, writes report
 * honestly through the same channel, and nothing crashes at import
 * time. Tests exercise exactly this path, which keeps their
 * clean-start behaviour by construction.
 */
export interface KVBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

// The backend itself is platform-split (see kvBackend / kvBackend.native):
// Metro follows `require` statically, so the sqlite reference must live in
// a file the web bundle never resolves.

let backend: KVBackend = platformBackend();

/**
 * The test seam, and nothing else.
 *
 * Tests seed a library before mounting and inspect what a press wrote,
 * and they must do it through the same object production writes to —
 * a test that stubs `localStorage` while the app is on SQLite is
 * asserting into a void, which is exactly how this file's native
 * rewrite broke five suites at once. Swapping the backend is the
 * supported way in; production code must never call this.
 */
export function _setBackendForTests(next: KVBackend): void {
  backend = next;
}

export const kv: Required<KVBackend> = {
  getItem: (key) => backend.getItem(key),
  setItem: (key, value) => backend.setItem(key, value),
  removeItem: (key) => backend.removeItem?.(key),
};

/**
 * Browsers disagree on how a quota failure presents: some throw
 * QuotaExceededError by name, Safari in private mode historically threw
 * code 22, and Firefox uses 1014. Treating any of them as "full" is
 * better than treating a full disk as a generic failure.
 */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as DOMException).code;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
}

/**
 * Read a versioned key, migrating anything written by an older shape.
 *
 * The keys carry a `.v1` suffix, which implies a v2 can exist — but with
 * no path from one to the other, bumping the version would silently
 * abandon everyone's data. `migrations` maps an older key to a function
 * that converts its contents; the first one that yields something is
 * used, written forward under the current key, and the old key is left
 * alone so a rollback still finds it.
 */
export function readVersioned<T>(
  key: string,
  fallback: T,
  migrations: { from: string; migrate: (value: unknown) => T | null }[] = []
): T {
  const current = kv.getItem(key);
  if (current != null) return readJson<T>(key, fallback);

  for (const { from, migrate } of migrations) {
    const older = readJson<unknown>(from, null);
    if (older == null) continue;
    try {
      const migrated = migrate(older);
      if (migrated == null) continue;
      writeJson(key, migrated);
      return migrated;
    } catch {
      // A migration that throws must not stop the app from starting.
    }
  }
  return fallback;
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = kv.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // Unreadable or corrupt: start clean rather than crash on boot.
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): WriteResult {
  try {
    kv.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: isQuotaError(error) ? 'full' : 'unavailable',
      error,
    };
  }
}

/** What to tell someone whose save did not land. */
export function writeFailureMessage(
  result: Extract<WriteResult, { ok: false }>
): string {
  return result.reason === 'full'
    ? "This device's storage is full — that change wasn't saved"
    : "Couldn't save to this device — that change wasn't saved";
}
