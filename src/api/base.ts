import { Platform } from 'react-native';

import { SITE_ORIGIN } from '@/constants/site';

/**
 * Where the app's own serverless functions live, from wherever this
 * code is running.
 *
 * On the web a relative `/api/...` is same-origin and the browser fills
 * in the rest. A native app has no origin: `fetch('/api/igdb')` on iOS
 * is not a request to anything, it is a rejected promise — and because
 * every client in this folder degrades quietly on failure, the native
 * build simply had no time-to-beat figures, no box art, no critic
 * scores, no similar games, no live streams and no Steam connect,
 * without a single error saying why. Every `/api` call goes through
 * here so that cannot happen again.
 */
export function apiUrl(path: string): string {
  return Platform.OS === 'web' ? path : `${SITE_ORIGIN}${path}`;
}
