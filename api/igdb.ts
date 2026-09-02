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

/** Every field the page enriches with, shared by both lookup passes. */
const GAME_FIELDS =
  'id,slug,name,first_release_date,cover.image_id,aggregated_rating,aggregated_rating_count,storyline,similar_games.slug,similar_games.name,similar_games.cover.image_id';

interface IgdbGame {
  id: number;
  slug: string;
  name?: string;
  first_release_date?: number;
  cover?: { image_id?: string };
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  storyline?: string;
  similar_games?: {
    slug?: string;
    name?: string;
    cover?: { image_id?: string };
  }[];
}

interface Want {
  slug: string;
  name: string;
  year: number | null;
}

/**
 * Which candidate a request actually meant, and how sure we are.
 *
 * The year is the strongest evidence: RAWG knows when its game came
 * out, IGDB knows when each candidate did, and the pair that agree are
 * the same game. A year either way is the same release seen through
 * two catalogues - a December game dated to the January port.
 */
function pickBest(
  want: Want,
  candidates: IgdbGame[]
): { game: IgdbGame; score: number; exact: boolean } | null {
  if (candidates.length === 0) return null;
  const lowerName = want.name.toLowerCase();
  return candidates
    .map((game) => {
      const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getUTCFullYear()
        : null;
      let score = 0;
      if (want.year != null && releaseYear != null) {
        const drift = Math.abs(releaseYear - want.year);
        if (drift === 0) score += 12;
        else if (drift <= 1) score += 7;
        else score -= drift;
      }
      if (game.slug === want.slug) score += 3;
      if (lowerName.length > 0 && game.name?.toLowerCase() === lowerName)
        score += 2;
      // A tie broken towards the entry that actually has art: the
      // whole reason this lookup exists.
      if (game.cover?.image_id) score += 1;
      const exact =
        lowerName.length > 0 && game.name?.toLowerCase() === lowerName;
      return { game, score, exact };
    })
    .sort((a, b) => b.score - a.score)[0];
}

/** Seconds to hours, one decimal — the precision anyone can feel. */
/**
 * The words a name is recognisable by: five letters and up, lowercased.
 * "Assassin's Creed Back Flag Resynced" - RAWG's typo, "Back" for
 * "Black" - keeps assassin's, creed and resynced; IGDB's search, which
 * finds nothing for the typo, finds the game from those three alone.
 */
export function distinctiveWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{N}']+/u)
    .filter((word) => word.length >= 5);
}

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

  /**
   * Titles and years, index-aligned with the slugs, and both optional:
   * an older client sends neither and still gets slug matching.
   *
   * They are here because a slug alone is the wrong key. IGDB suffixes
   * a reused title rather than overwriting it, so RAWG's `marathon`
   * (2026) collides with IGDB's `marathon` (Bungie, 1994) and the real
   * entry is `marathon--2`; `hades` is a 1995 game, not Supergiant's.
   * Matching on the title as well and then settling ties by release
   * year is what tells those apart.
   */
  const pipeSplit = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value.join('|') : (value ?? '')).split('|');
  /**
   * Latin again, where a catalogue went Cyrillic.
   *
   * RAWG spells MOUSE with a Cyrillic О - a homoglyph, identical on
   * screen and unequal in every comparison - so the exact-name match
   * missed a game both sides plainly have. Only the lookalikes are
   * folded; genuinely non-Latin titles pass through untouched.
   */
  const HOMOGLYPHS: Record<string, string> = {
    А: 'A',
    В: 'B',
    С: 'C',
    Е: 'E',
    Н: 'H',
    І: 'I',
    К: 'K',
    М: 'M',
    О: 'O',
    Р: 'P',
    Т: 'T',
    Х: 'X',
    а: 'a',
    с: 'c',
    е: 'e',
    і: 'i',
    о: 'o',
    р: 'p',
    х: 'x',
  };
  const fold = (value: string) =>
    value.replace(/[\u0400-\u04ff]/g, (ch) => HOMOGLYPHS[ch] ?? ch);
  const names = pipeSplit(req.query.names);
  const years = pipeSplit(req.query.years);
  const wanted = slugs.map((slug, index) => ({
    slug,
    // Quotes and backslashes would break out of the apicalypse string;
    // control characters would break the query. Everything else about a
    // game title is fair game, including the punctuation IGDB keeps.
    name: fold(names[index] ?? '')
      .replace(/["\\\u0000-\u001f]/g, '')
      .trim()
      .slice(0, 120),
    year: /^\d{4}$/.test(years[index] ?? '') ? Number(years[index]) : null,
  }));

  // Deduplicated: several requested games can share a title only by
  // coincidence, but a repeated one would pad the query for nothing.
  const titles = [
    ...new Set(
      wanted.map((want) => want.name).filter((name) => name.length > 0)
    ),
  ].map((name) => `"${name}"`);

  try {
    const accessToken = await token(clientId, clientSecret);

    /**
     * One query carries everything the page enriches with, not just the
     * ids the durations need: the cover (the box art RAWG simply does
     * not have), the critic aggregate, and the storyline — a short,
     * spoiler-safe synopsis that is often better prose than the
     * marketing description. Same request, same rate-limit spend.
     */
    const games = await igdb<IgdbGame>(
      clientId,
      accessToken,
      'games',
      `fields ${GAME_FIELDS}; where slug = (${slugs
        .map((slug) => `"${slug}"`)
        .join(
          ','
        )})${titles.length > 0 ? ` | name = (${titles.join(',')})` : ''}; limit ${MAX_SLUGS * 4};`
    );

    /**
     * Which IGDB entry each request actually meant.
     *
     * The query asks broadly - every slug OR every title - so a request
     * for one game can come back with several, and the naive read (the
     * one whose slug matches) is how a 2026 shooter ends up wearing a
     * 1994 box. The year decides: RAWG knows when its game came out,
     * IGDB knows when each candidate did, and the pair that agree are
     * the same game. Everything is keyed back to the slug the client
     * asked with, so callers never learn IGDB's naming.
     */
    const chosen = new Map<string, IgdbGame>();
    for (const want of wanted) {
      const lowerName = want.name.toLowerCase();
      const best = pickBest(
        want,
        games.filter(
          (game) =>
            game.slug === want.slug ||
            (lowerName.length > 0 && game.name?.toLowerCase() === lowerName)
        )
      );
      if (best) chosen.set(want.slug, best.game);
    }

    /**
     * Second pass: IGDB's own search, for what exact matching missed.
     *
     * Titles diverge in ways no fold anticipates - RAWG's "Slay the
     * Spire 2" is IGDB's "Slay the Spire II" - and fuzzy matching is
     * IGDB's job, not this handler's; their search endpoint exists for
     * exactly this. One search per miss, run in sequence: measured
     * against the live API, a search inside multiquery silently
     * returns nothing, and IGDB allows four requests a second - so the
     * cap is small, the requests are serial, and the day-long edge
     * cache means a given miss is searched once, not per visitor.
     *
     * A search hit is adopted only when the year agrees (or the name
     * turns out exact after all): fuzzy results are suggestions, and a
     * wrong cover is worse than no cover.
     */
    const missed = wanted
      .filter((want) => !chosen.has(want.slug) && want.name.length > 0)
      .slice(0, 4);
    for (const want of missed) {
      try {
        const found = await igdb<IgdbGame>(
          clientId,
          accessToken,
          'games',
          `fields ${GAME_FIELDS}; search "${want.name}"; limit 3;`
        );
        const best = pickBest(want, found);
        /**
         * Adopted when the year agrees - or when the name is exact and
         * the entry is undated. An announced game has no release date
         * on IGDB yet, so no year can ever agree with it, and "Phantom
         * Blade Zero" found by its exact name was being refused for a
         * date nobody has. A dated entry whose year disagrees is still
         * refused: that is the 1994 Marathon rule, and it stands.
         */
        const undated = best && best.game.first_release_date == null;
        if (best && (best.score >= 7 || (best.exact && undated))) {
          chosen.set(want.slug, best.game);
          continue;
        }
        // Third pass, for a name the catalogue has misspelt: search on
        // the distinctive words alone, and adopt only a hit that both
        // dates right and carries every one of those words - the year
        // alone would hand a franchise's other entry the cover.
        const words = distinctiveWords(want.name);
        const loose = words.join(' ');
        if (words.length < 2 || loose === want.name.toLowerCase()) continue;
        const looser = await igdb<IgdbGame>(
          clientId,
          accessToken,
          'games',
          `fields ${GAME_FIELDS}; search "${loose}"; limit 3;`
        );
        const carrying = looser.filter((game) => {
          const has = new Set(distinctiveWords(game.name ?? ''));
          return words.every((word) => has.has(word));
        });
        const rescued = pickBest(want, carrying);
        if (rescued && rescued.score >= 7) chosen.set(want.slug, rescued.game);
      } catch {
        // The first pass already answered for most of the batch; a
        // failed rescue must not take those answers with it.
      }
    }

    const durations: Record<
      string,
      {
        hastily: number | null;
        normally: number | null;
        completely: number | null;
        submissions: number;
      }
    > = {};

    if (chosen.size > 0) {
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
        `fields game_id,hastily,normally,completely,count; where game_id = (${[
          ...new Set([...chosen.values()].map((game) => game.id)),
        ].join(',')}); limit ${MAX_SLUGS * 2};`
      );

      const byGameId = new Map(times.map((row) => [row.game_id, row]));
      for (const [slug, game] of chosen) {
        const row = byGameId.get(game.id);
        if (!row) continue;
        durations[slug] = {
          hastily: hours(row.hastily),
          normally: hours(row.normally),
          completely: hours(row.completely),
          submissions: row.count ?? 0,
        };
      }
    }

    const extras: Record<
      string,
      {
        cover: string | null;
        critic: number | null;
        criticCount: number;
        storyline: string | null;
        similar: { slug: string; name: string; cover: string }[];
      }
    > = {};
    for (const [slug, game] of chosen) {
      extras[slug] = {
        cover: game.cover?.image_id ?? null,
        critic:
          game.aggregated_rating != null
            ? Math.round(game.aggregated_rating)
            : null,
        criticCount: game.aggregated_rating_count ?? 0,
        storyline: game.storyline ?? null,
        /**
         * IGDB's own graph, which RAWG's flat series cannot draw:
         * "games like this one", with covers, capped so a hub game
         * does not ship a catalogue. Only entries with both a slug
         * and a cover — a card with no picture or no destination is
         * not a recommendation.
         */
        similar: (game.similar_games ?? [])
          .filter((similar) => similar.slug && similar.cover?.image_id)
          .slice(0, 8)
          .map((similar) => ({
            slug: similar.slug as string,
            name: (similar.name ?? similar.slug) as string,
            cover: similar.cover?.image_id as string,
          })),
      };
    }

    // A day at the edge, a week in a browser: these numbers move by
    // minutes a year, and the rate limit is shared by every visitor.
    res.setHeader('Cache-Control', 's-maxage=86400, max-age=604800');
    res.status(200).json({ durations, extras });
  } catch {
    res.status(502).json({ error: 'IGDB did not answer — try again shortly.' });
  }
}
