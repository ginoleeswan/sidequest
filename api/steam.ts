/**
 * Steam Web API proxy (Vercel serverless function).
 *
 * The Steam key lives in the STEAM_API_KEY environment variable, server-side
 * only - Valve's terms require treating it like a password, so it must never
 * reach the client bundle. The client calls:
 *
 *   /api/steam?op=resolve&vanity=<name>   -> { steamid }
 *   /api/steam?op=owned&steamid=<id64>    -> { player, games[] }
 */
export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
    };
    setHeader: (name: string, value: string) => void;
  }
) {
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
      const r = await fetch(
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
        fetch(
          `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamid}&include_appinfo=1&include_played_free_games=1&format=json`
        ),
        fetch(
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
      res.setHeader('Cache-Control', 's-maxage=300');
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
    res.status(502).json({ error: 'Steam did not answer — try again shortly.' });
  }
}
