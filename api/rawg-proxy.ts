/**
 * RAWG data proxy (Vercel serverless function).
 *
 * EXPO_PUBLIC_ vars ship in the web bundle in plain sight — anyone who
 * opens devtools on the deployed site can read EXPO_PUBLIC_RAWG_API_KEY
 * straight out of the JS. This function holds the real key server-side
 * (RAWG_API_KEY, no EXPO_PUBLIC_ prefix) and makes the RAWG call on the
 * browser's behalf, so the key itself never reaches a browser tab.
 *
 * vercel.json rewrites /rawg/:path* to /api/rawg-proxy?path=:path* — the
 * same query-forwarding shape already used for /game/:id -> preview.ts.
 * Native still calls RAWG directly with the embedded key: a key shipped
 * in an app binary is extractable regardless of where it lives, so
 * there is nothing to gain by routing native traffic through here too.
 */

const TIMEOUT_MS = 12_000;

/**
 * A single page load fires a dozen-plus RAWG calls (home rows, filters,
 * a game detail's movies/series/stores). The limit sits well above that
 * so ordinary browsing never trips it, while still capping runaway or
 * scripted use of the shared key.
 */
const LIMIT = 120;
const WINDOW_MS = 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function overLimit(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
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

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** RAWG resource paths are slugs, ids and literal segments — nothing else. */
const SAFE_PATH = /^[A-Za-z0-9_/-]+$/;

export default async function handler(
  req: {
    method?: string;
    query: Record<string, string | string[] | undefined>;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
      send: (body: string) => void;
    };
    setHeader: (name: string, value: string) => void;
  }
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // x-real-ip is set by Vercel itself; the forwarded-for chain's first
  // hop is whatever the caller wrote into it. Trust the platform first.
  const real = req.headers?.['x-real-ip'];
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = (
    (Array.isArray(real) ? real[0] : real) ??
    (Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? 'unknown'))
  )
    .split(',')[0]
    .trim();
  if (overLimit(ip, Date.now())) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests — give it a minute.' });
    return;
  }

  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) {
    res.status(503).json({
      error:
        'RAWG is not configured — add RAWG_API_KEY to the deployment environment.',
    });
    return;
  }

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const path = one(req.query.path);
  if (!path || !SAFE_PATH.test(path)) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  // Forward every client param except the routing artifact and any
  // client-supplied `key` — the real one below is the only one that goes.
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(req.query)) {
    if (name === 'path' || name === 'key') continue;
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined) params.append(name, v);
    }
  }
  params.set('key', key);

  try {
    const upstream = await fetchWithTimeout(
      `https://api.rawg.io/api/${path}?${params}`
    );
    const body = await upstream.text();
    // RAWG embeds this same URL — key included — in every list response's
    // next/previous fields. The app never follows them (pages are asked
    // for by number, not by link), so the key is scrubbed outright rather
    // than rewritten: nothing depends on those fields staying live.
    const scrubbed = body.split(key).join('');
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/json'
    );
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(upstream.status).send(scrubbed);
  } catch {
    res.status(502).json({ error: 'RAWG did not answer — try again shortly.' });
  }
}
