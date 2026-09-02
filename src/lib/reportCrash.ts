import { Platform } from 'react-native';

import { apiUrl } from '@/api/base';

/**
 * Anonymous crash reporting.
 *
 * Deliberately narrow: only errors that already broke a screen, and only
 * the shape of the failure — message, stack, route, viewport. No
 * identifier is generated or stored, no cookie is set, nothing about what
 * you browsed or saved is included, and the library never leaves the
 * device. Failure to report is silent; telemetry must never be the reason
 * a screen breaks twice.
 */
const ENDPOINT = '/api/report';

/** Same error, over and over, is one problem — report it once a session. */
const seen = new Set<string>();

export function reportCrash(error: unknown): void {
  // Native reports too, now that it can reach the endpoint at all: a
  // screen that breaks in somebody's pocket is the one nobody sees.
  if (__DEV__) return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const fingerprint = `${message}::${stack?.slice(0, 200) ?? ''}`;
  if (seen.has(fingerprint)) return;
  seen.add(fingerprint);

  try {
    const body = JSON.stringify({
      message: message.slice(0, 500),
      stack: stack?.slice(0, 4000),
      route: globalThis.location?.pathname ?? Platform.OS,
      viewport: globalThis.innerWidth
        ? `${globalThis.innerWidth}x${globalThis.innerHeight}`
        : undefined,
      at: new Date().toISOString(),
    });

    // Fire and forget: keepalive lets it survive the navigation that a
    // crashed screen often triggers.
    void fetch(apiUrl(ENDPOINT), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never throw into the error path it is reporting on.
  }
}
