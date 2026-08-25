/**
 * Steam Web API proxy (Vercel serverless function).
 *
 * The Steam key lives in the STEAM_API_KEY environment variable, server-side
 * only - Valve's terms require treating it like a password, so it must never
 * reach the client bundle. The client calls:
 *
 *   /api/steam?op=resolve&vanity=<name>   -> { steamid }
 *   /api/steam?op=owned&steamid=<id64>    -> { player, games[] }
 *
 * The function is a proxy to a keyed upstream, so it is also a way to
 * spend our Steam quota: every call is rate limited per IP and every
 * upstream request has a deadline.
 */

/** Upstream calls that never settle would hold a function open. */
const TIMEOUT_MS = 8_000;

/** Requests accepted per IP per window. */
const LIMIT = 30;
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

/** fetch with a deadline — an unbounded upstream call is a stuck user. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
export default async function handler(
  req: {
    method?: string;
    query: Record<string, string | string[] | undefined>;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
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

  const key = process.env.STEAM_API_KEY;
  if (!key) {
    res.status(503).json({
      error:
        'Steam is not configured yet — add STEAM_API_KEY to the deployment environment.',
    });
    return;
  }

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const op = one(req.query.op);

  try {
    if (op === 'resolve') {
      const vanity = one(req.query.vanity);
      if (!vanity || !/^[A-Za-z0-9_-]{2,64}$/.test(vanity)) {
        res.status(400).json({ error: 'Invalid vanity name' });
        return;
      }
      const r = await fetchWithTimeout(
        `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`
      );
      const data = (await r.json()) as {
        response?: { success?: number; steamid?: string };
      };
      if (data.response?.success !== 1 || !data.response.steamid) {
        res.status(404).json({ error: 'No Steam profile with that name' });
        return;
      }
      res.setHeader('Cache-Control', 's-maxage=3600');
      res.status(200).json({ steamid: data.response.steamid });
      return;
    }

    if (op === 'owned') {
      const steamid = one(req.query.steamid);
      if (!steamid || !/^7656\d{13}$/.test(steamid)) {
        res.status(400).json({ error: 'Invalid Steam ID' });
        return;
      }
      const [ownedRes, summaryRes] = await Promise.all([
        fetchWithTimeout(
          `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamid}&include_appinfo=1&include_played_free_games=1&format=json`
        ),
        fetchWithTimeout(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamid}`
        ),
      ]);
      const owned = (await ownedRes.json()) as {
        response?: {
          game_count?: number;
          games?: {
            appid: number;
            name: string;
            playtime_forever: number;
            playtime_2weeks?: number;
          }[];
        };
      };
      const summary = (await summaryRes.json()) as {
        response?: {
          players?: { personaname?: string; avatarmedium?: string }[];
        };
      };
      if (!owned.response?.games) {
        res.status(403).json({
          error:
            'Game details are private — set "Game details" to Public in Steam privacy settings.',
        });
        return;
      }
      const player = summary.response?.players?.[0] ?? {};
      // Private: this body is one person's name, avatar and full game
      // list. SteamID64s are public and enumerable, so a shared edge
      // cache of this response is a lookup service we never meant to run.
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.status(200).json({
        player: {
          name: player.personaname ?? 'Steam player',
          avatar: player.avatarmedium ?? null,
        },
        gameCount: owned.response.game_count ?? owned.response.games.length,
        games: owned.response.games.map((g) => ({
          appid: g.appid,
          name: g.name,
          minutesForever: g.playtime_forever,
          minutes2Weeks: g.playtime_2weeks ?? 0,
        })),
      });
      return;
    }

    res.status(400).json({ error: 'Unknown op' });
  } catch {
    res
      .status(502)
      .json({ error: 'Steam did not answer — try again shortly.' });
  }
}
