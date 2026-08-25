/**
 * Anonymous crash sink (Vercel serverless function).
 *
 * Receives the shape of a failure that already broke a screen — message,
 * stack, route, viewport — and writes it to the function log, where the
 * deployment's log drain can pick it up. Deliberately stores nothing and
 * sets no cookie: there is no identifier to correlate reports with, and
 * nothing about what a person browsed or saved is accepted.
 *
 * Everything here is defensive. A crash reporter that can be used to
 * flood logs, or that trusts a payload, is a liability rather than a
 * safety net.
 */

/** Biggest payload we will read, before parsing. */
const MAX_BYTES = 8_000;

/** Reports accepted per IP per window. */
const LIMIT = 20;
const WINDOW_MS = 60_000;

/**
 * Per-instance rate limiting. Serverless instances are short-lived and
 * not shared, so this is a speed bump rather than a guarantee — enough to
 * stop one stuck client looping reports, which is the realistic case.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

function overLimit(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Bound the map: it lives as long as the instance does.
    // Evict only what has expired. `clear()` was a bypass with a
    // doorbell: five thousand and one requests behind spoofed
    // forwarded-for headers wiped every REAL client's counter too, and
    // the attacker resumed against an empty table.
    if (hits.size > 5_000) {
      for (const [key, value] of hits) {
        if (now > value.resetAt) hits.delete(key);
      }
    }
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

const str = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.length > 0
    ? value.slice(0, max)
    : undefined;

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    headers: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
      end: () => void;
    };
    setHeader: (name: string, value: string) => void;
  }
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // x-real-ip is set by Vercel itself; the forwarded-for chain's first
  // hop is whatever the caller wrote into it. Trust the platform first.
  const real = req.headers['x-real-ip'];
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (
    (Array.isArray(real) ? real[0] : real) ??
    (Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? 'unknown'))
  )
    .split(',')[0]
    .trim();

  if (overLimit(ip, Date.now())) {
    res.status(429).json({ error: 'Too many reports' });
    return;
  }

  const raw =
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (raw.length > MAX_BYTES) {
    res.status(413).json({ error: 'Report too large' });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, unknown>)
        : (JSON.parse(raw) as Record<string, unknown>);
  } catch {
    res.status(400).json({ error: 'Malformed report' });
    return;
  }

  const message = str(payload.message, 500);
  if (!message) {
    res.status(400).json({ error: 'Report needs a message' });
    return;
  }

  // Only the named fields, each truncated: whatever else was sent is
  // dropped rather than logged.
  console.error(
    '[crash]',
    JSON.stringify({
      message,
      route: str(payload.route, 200),
      viewport: str(payload.viewport, 20),
      at: str(payload.at, 40),
      stack: str(payload.stack, 4000),
    })
  );

  res.status(204).end();
}
