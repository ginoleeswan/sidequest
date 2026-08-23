import { createClient } from '@supabase/supabase-js';
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
    kv.setItem(k, v);
    return Promise.resolve();
  },
  removeItem: (k: string) => {
    kv.removeItem?.(k);
    return Promise.resolve();
  },
};

export const supabase = createClient(
  url ?? 'http://unconfigured',
  key ?? 'unconfigured',
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      /**
       * Web reads the session out of the URL after a redirect; native
       * never sees one, because native signs in with an ID token and no
       * round trip through a browser.
       */
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);
