/**
 * Live streams for a game (Vercel serverless function).
 *
 * The product's whole question is "is this worth my forty hours?", and
 * the fastest honest answer is five minutes of watching somebody else
 * play it. Screenshots are marketing and reviews are opinions; a live
 * stream is the game, running, right now.
 *
 * No user account is involved and none can be. Twitch's app
 * credentials — the same client-credentials pair `api/igdb.ts` already
 * uses to reach IGDB — read public data: which streams are live, for
 * which game. There is no login, no scope, and nothing about the person
 * asking is sent anywhere. That is not a limitation worked around, it
 * is the only shape of Twitch feature this app is allowed to have, for
 * the same reason the calendar hand-off is a file rather than an OAuth
 * integration.
 *
 *   /api/twitch?game=Hades   -> { streams: [...] }
 *
 * Deliberately NOT "what you have watched". Twitch has no public API
 * for a person's history, it would need their account if it did, and it
 * would be the wrong signal anyway: Twitch knows what somebody watches,
 * which is not what they play.
 */

const TIMEOUT_MS = 8_000;

/** Requests accepted per IP per window. */
const LIMIT = 60;
const WINDOW_MS = 60_000;

/** Enough to show the game is alive without becoming a directory. */
const MAX_STREAMS = 4;

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
 * The app token, kept warm between invocations — the same arrangement
 * `api/igdb.ts` makes, and for the same reason: Twitch issues these for
 * about sixty days and asking for a new one per request is slow and
 * rude. A minute of slack means a token is never used in the second it
 * expires.
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

async function helix<T>(
  clientId: string,
  accessToken: string,
  path: string
): Promise<T[]> {
  const res = await fetchWithTimeout(`https://api.twitch.tv/helix/${path}`, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error(`Twitch ${path}: ${res.status}`);
  const body = (await res.json()) as { data?: T[] };
  return body.data ?? [];
}

/** Twitch ships thumbnails as a template with the size left to us. */
function thumbnail(template: string): string {
  return template.replace('{width}', '440').replace('{height}', '248');
}

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

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // Not fatal and not the reader's fault: the game page simply does
    // not offer to show them a stream. Same posture as IGDB's fallback.
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(503).json({
      error:
        'Streams are not configured — add TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.',
    });
    return;
  }

  const raw = req.query.game;
  const name = (Array.isArray(raw) ? raw[0] : (raw ?? '')).trim().slice(0, 120);
  if (!name) {
    res.status(400).json({ error: 'No game' });
    return;
  }

  try {
    const accessToken = await token(clientId, clientSecret);

    const games = await helix<{ id: string; name: string }>(
      clientId,
      accessToken,
      `games?name=${encodeURIComponent(name)}`
    );
    // Twitch's catalogue is its own; a game RAWG knows may simply not be
    // a category there. An empty list is an answer, not an error.
    if (games.length === 0) {
      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ streams: [] });
      return;
    }

    const live = await helix<{
      id: string;
      user_name: string;
      user_login: string;
      title: string;
      viewer_count: number;
      thumbnail_url: string;
      language: string;
    }>(
      clientId,
      accessToken,
      `streams?game_id=${games[0].id}&first=${MAX_STREAMS}`
    );

    /**
     * Two minutes at the edge. Who is live changes constantly, so a long
     * cache would show empty channels; no cache at all would spend the
     * rate limit on every page view of a popular game.
     */
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(200).json({
      game: games[0].name,
      streams: live.map((stream) => ({
        id: stream.id,
        channel: stream.user_name,
        login: stream.user_login,
        title: stream.title,
        viewers: stream.viewer_count,
        thumbnail: thumbnail(stream.thumbnail_url),
        language: stream.language,
      })),
    });
  } catch {
    res
      .status(502)
      .json({ error: 'Twitch did not answer — try again shortly.' });
  }
}
