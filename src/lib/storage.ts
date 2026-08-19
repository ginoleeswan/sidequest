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

export type WriteResult =
  { ok: true } | { ok: false; reason: 'full' | 'unavailable'; error: unknown };

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
  const current = globalThis.localStorage?.getItem(key);
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
    const raw = globalThis.localStorage?.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // Unreadable or corrupt: start clean rather than crash on boot.
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): WriteResult {
  try {
    const store = globalThis.localStorage;
    if (!store) return { ok: false, reason: 'unavailable', error: undefined };
    store.setItem(key, JSON.stringify(value));
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
