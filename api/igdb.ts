/**
 * IGDB time-to-beat proxy (Vercel serverless function).
 *
 * RAWG's `playtime` is an average of what players reported, and the
 * repo's own validation found it inaccurate often enough to matter —
 * Pentiment at 2h against a real ~9, Disco Elysium at 6h against ~21.
 * IGDB publishes submitted completion times instead, which is the number
 * the plan should be built on.
 *
 * Twitch credentials live server-side only: IGDB is authenticated
 * through Twitch's client-credentials flow, and a client id and secret
 * in a web bundle is a secret given away. The client calls:
 *
 *   /api/igdb?slugs=hades,celeste   -> { durations: { slug: {...} } }
 *
 * Answers are cached hard at the edge. A game's time to beat moves by
 * minutes a year, and every cache hit is a request we do not spend
 * against a rate limit shared by every visitor.
 */

const TIMEOUT_MS = 8_000;

/** IGDB allows 4 requests a second; batches keep us well under it. */
const MAX_SLUGS = 60;

/** Requests accepted per IP per window. */
const LIMIT = 30;
const WINDOW_MS = 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function overLimit(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5_000) hits.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The app token, kept warm between invocations.
 *
 * Twitch issues these for about sixty days; asking for a new one on
 * every request would be both slow and rude. A minute of slack means a
 * token is never used in the second it expires.
 */
let cached: { token: string; expiresAt: number } | null = null;

async function token(id: string, secret: string): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  const res = await fetchWithTimeout(
    `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error(`Twitch token: ${res.status}`);
  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) throw new Error('Twitch returned no token');

  cached = {
    token: body.access_token,
    expiresAt: now + (body.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

async function igdb<T>(
  clientId: string,
  accessToken: string,
  endpoint: string,
  query: string
): Promise<T[]> {
  const res = await fetchWithTimeout(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
    body: query,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint}: ${res.status}`);
  return (await res.json()) as T[];
}

/** Seconds to hours, one decimal — the precision anyone can feel. */
const hours = (seconds: number | undefined) =>
  seconds && seconds > 0 ? Math.round((seconds / 3600) * 10) / 10 : null;

export default async function handler(
  req: {
    method?: string;
    query: Record<string, string | string[] | undefined>;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    setHeader: (name: string, value: string) => void;
  }
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = (
    Array.isArray(forwarded) ? forwarded[0] : (forwarded ?? 'unknown')
  )
    .split(',')[0]
    .trim();
  if (overLimit(ip, Date.now())) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Too many requests — give it a minute.' });
    return;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // Not an error the user caused, and not fatal: the app falls back to
    // RAWG's estimate and says so.
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(503).json({
      error:
        'Time-to-beat data is not configured — add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.',
    });
    return;
  }

  const raw = req.query.slugs;
  const slugs = (Array.isArray(raw) ? raw.join(',') : (raw ?? ''))
    .split(',')
    .map((slug) => slug.trim().toLowerCase())
    .filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug))
    .slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    res.status(400).json({ error: 'No slugs' });
    return;
  }

  try {
    const accessToken = await token(clientId, clientSecret);

    const games = await igdb<{ id: number; slug: string }>(
      clientId,
      accessToken,
      'games',
      `fields id,slug; where slug = (${slugs
        .map((slug) => `"${slug}"`)
        .join(',')}); limit ${MAX_SLUGS * 2};`
    );

    const durations: Record<
      string,
      {
        hastily: number | null;
        normally: number | null;
        completely: number | null;
        submissions: number;
      }
    > = {};

    if (games.length > 0) {
      const times = await igdb<{
        game_id: number;
        hastily?: number;
        normally?: number;
        completely?: number;
        count?: number;
      }>(
        clientId,
        accessToken,
        'game_time_to_beats',
        `fields game_id,hastily,normally,completely,count; where game_id = (${games
          .map((game) => game.id)
          .join(',')}); limit ${MAX_SLUGS * 2};`
      );

      const byGameId = new Map(times.map((row) => [row.game_id, row]));
      for (const game of games) {
        const row = byGameId.get(game.id);
        if (!row) continue;
        durations[game.slug] = {
          hastily: hours(row.hastily),
          normally: hours(row.normally),
          completely: hours(row.completely),
          submissions: row.count ?? 0,
        };
      }
    }

    // A day at the edge, a week in a browser: these numbers move by
    // minutes a year, and the rate limit is shared by every visitor.
    res.setHeader('Cache-Control', 's-maxage=86400, max-age=604800');
    res.status(200).json({ durations });
  } catch {
    res.status(502).json({ error: 'IGDB did not answer — try again shortly.' });
  }
}
