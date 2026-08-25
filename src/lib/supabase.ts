import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { kv } from './storage';

/**
 * The client, and the one thing it must never become: required.
 *
 * Everything in this app works with no account. Sign-in buys sync, and
 * nothing else — the hero says "no account" in capitals, and the only
 * honest way to add auth underneath that promise is for its absence to
 * cost the reader nothing. So this module is allowed to be missing its
 * configuration entirely, and the app is expected to carry on.
 *
 * That promise used to stop at the source and not reach the bundle.
 * supabase-js was created at module scope, so every visitor downloaded
 * the whole auth stack to be told they did not need an account — the
 * documented reason the JS budget went from 560 KB to 640. Now it is a
 * dynamic import behind `getSupabase`, fetched when somebody has a
 * session to restore, is coming back from a provider redirect, or
 * presses a sign-in button. For everyone else it never arrives, which
 * is what "no account needed" ought to cost.
 *
 * The type import above is erased at build time and pulls in nothing.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/**
 * Whether signing in is even on the table.
 *
 * A fork of this repository with no Supabase project should build, run,
 * and simply not offer an account — not crash at import time on a
 * missing environment variable. The same is true of the test runner.
 */
export const authConfigured = Boolean(url && key);

/**
 * Supabase wants an async storage; this app has a synchronous one.
 *
 * `kv` is already the single place this app writes to the device, is
 * platform-split behind the scenes, and falls back to a Map rather than
 * throwing when the native module is missing. Wrapping it costs three
 * lines and keeps one storage story instead of two.
 *
 * SecureStore was the other candidate and lost on a detail: it caps
 * values at 2048 bytes, and a Supabase session — access token, refresh
 * token, user — routinely exceeds that, so it would need chunking, and
 * a chunked credential store is a new failure mode in exchange for
 * encryption the library data next to it does not have anyway. Worth
 * revisiting if the data at rest ever gets encrypted; not worth being
 * the only encrypted thing.
 */
const storage = {
  getItem: (k: string) => Promise.resolve(kv.getItem(k)),
  setItem: (k: string, v: string) => {
    // Never throw into supabase-js. On web, kv.setItem throws when
    // localStorage is unusable (Safari private browsing) — and a user
    // who just authenticated upstream would be shown a sign-in error
    // over a storage detail. The session still works for this visit;
    // it just will not survive a reload, which is what private
    // browsing asked for anyway.
    try {
      kv.setItem(k, v);
    } catch {
      // Deliberate: an unpersisted session beats a failed sign-in.
    }
    return Promise.resolve();
  },
  removeItem: (k: string) => {
    kv.removeItem(k);
    return Promise.resolve();
  },
};

/**
 * Where the session is kept, named by us rather than by the library.
 *
 * supabase-js derives this from the project ref by default, which is
 * fine until you want to answer "is anybody signed in?" without having
 * loaded supabase-js — which is the entire point of the lazy import.
 * Pinning it means the question is a single synchronous read.
 */
export const AUTH_STORAGE_KEY = 'sidequest.auth.v1';

/**
 * Where supabase-js used to keep it, before the key was ours.
 *
 * It derives the default from the project ref in the URL. Anybody
 * signed in before this change has their session under that name, and
 * simply renaming the key would sign every one of them out — a real
 * regression traded for a smaller bundle, which is not a trade worth
 * making. So the old value is carried across, once, on first look.
 */
const legacyKey = url
  ? `sb-${url.replace(/^https?:\/\//, '').split('.')[0]}-auth-token`
  : null;

function adoptLegacySession() {
  if (!legacyKey || legacyKey === AUTH_STORAGE_KEY) return;
  try {
    if (kv.getItem(AUTH_STORAGE_KEY) != null) return;
    const held = kv.getItem(legacyKey);
    if (held == null) return;
    kv.setItem(AUTH_STORAGE_KEY, held);
    kv.removeItem(legacyKey);
  } catch {
    // Storage that will not cooperate costs a sign-in, not a crash.
  }
}

// Once, at import, so the read below is a pure read and no component
// has to migrate storage while it renders.
adoptLegacySession();

/** Whether this device is holding a session worth restoring. */
export function hasStoredSession(): boolean {
  if (!authConfigured) return false;
  try {
    return kv.getItem(AUTH_STORAGE_KEY) != null;
  } catch {
    // Unusable storage reads as signed out, which is the truth: a
    // session that cannot be read cannot be restored.
    return false;
  }
}

/**
 * Whether this page load is a provider handing a session back.
 *
 * The one case where nothing is stored and the client is still needed
 * immediately: coming back from Google, the tokens are in the URL and
 * only supabase-js can turn them into a session. Miss this and the
 * redirect silently does nothing, which is the worst possible bug to
 * ship in exchange for a smaller bundle.
 */
export function isAuthCallback(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  return (
    hash.includes('access_token=') ||
    hash.includes('error_description=') ||
    new URLSearchParams(search).has('code')
  );
}

/**
 * Whether this page load has anything to restore, decided once.
 *
 * Memoised because the auth provider needs the answer while it is
 * rendering — to know whether it starts in `loading` — and again in
 * its effect, and the two must not disagree. It cannot change during
 * a page load: the only thing that creates a session is a sign-in,
 * which loads the client anyway.
 */
let restorable: boolean | null = null;
export const somethingToRestore = (): boolean =>
  (restorable ??= hasStoredSession() || isAuthCallback());

let client: SupabaseClient | null = null;
let pending: Promise<SupabaseClient> | null = null;

/**
 * The client, fetched on first use and kept.
 *
 * Memoised on the promise rather than the result, so two callers racing
 * at startup — the auth provider restoring a session and a sync round
 * starting — share one download and one client rather than two.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (client) return Promise.resolve(client);
  pending ??= import('@supabase/supabase-js').then(({ createClient }) => {
    client ??= createClient(
      url ?? 'http://unconfigured',
      key ?? 'unconfigured',
      {
        auth: {
          storage,
          storageKey: AUTH_STORAGE_KEY,
          persistSession: true,
          autoRefreshToken: true,
          /**
           * Web reads the session out of the URL after a redirect; native
           * never sees one, because native signs in with an ID token and
           * no round trip through a browser.
           */
          detectSessionInUrl: Platform.OS === 'web',
        },
      }
    );
    return client;
  });
  return pending;
}

/** Only for tests, which need each case to start from nothing. */
export function resetSupabaseForTests() {
  client = null;
  pending = null;
  restorable = null;
}
