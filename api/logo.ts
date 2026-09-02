/**
 * A game's title treatment (Vercel serverless function).
 *
 * The logo a publisher draws for a game — the thing Netflix sets over
 * every billboard instead of typing the name. Two places have them:
 * SteamGridDB, a community library with a logos category that covers
 * most of the catalogue in official, white and black styles; and
 * Steam's own CDN, which serves the logo Valve shows on a game's
 * library page for anything with a Steam release.
 *
 *   /api/logo?name=Hades&year=2020[&steam=1145360][&slug=hades]
 *     -> { logo: { url, thumb, width, height, source, style } | null }
 *
 * SteamGridDB first, because its files are cropped to the letters and
 * carry their dimensions, which is what lets a client size the mark to
 * a box before a byte of it has loaded. Steam's CDN is the fallback —
 * and the only source when no SteamGridDB key is configured — where
 * every logo is a 640×360 canvas with the letters somewhere inside it.
 *
 * A wrong logo is far worse than no logo: "Hades' Star" over Hades is
 * the one failure a reader would notice from across the room. A name
 * search therefore has to land on the exact title, and on the right
 * year where the same title has been used twice, or it lands on
 * nothing.
 *
 * Answers are cached hard at the edge. A logo changes about never, and
 * the key's rate limit is shared by every visitor.
 */

const TIMEOUT_MS = 8_000;
const LIMIT = 120;
const WINDOW_MS = 60_000;

const SGDB = 'https://www.steamgriddb.com/api/v2';
const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

/** The styles worth setting over artwork, best first. */
const STYLES = ['official', 'white', 'black'] as const;

const hits = new Map<string, { count: number; resetAt: number }>();

function overLimit(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
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

export interface Logo {
  /** The full-size PNG. */
  url: string;
  /** A smaller cut, around 500px wide, for a phone's masthead. */
  thumb: string;
  width: number;
  height: number;
  source: 'sgdb' | 'steam';
  style: string;
}

interface SgdbGame {
  id: number;
  name: string;
  verified?: boolean;
  release_date?: number;
}

interface SgdbLogo {
  id: number;
  score: number;
  style: string;
  width: number;
  height: number;
  nsfw: boolean;
  humor: boolean;
  epilepsy?: boolean;
  mime: string;
  language?: string;
  url: string;
  thumb: string;
  upvotes?: number;
  downvotes?: number;
}

async function sgdb<T>(key: string, path: string): Promise<T | null> {
  const res = await fetchWithTimeout(`${SGDB}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { success?: boolean; data?: T };
  return body.success && body.data != null ? body.data : null;
}

/** Letters only, lowercased: "Hades" and "HADES" and "Hades!" agree. */
const fold = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Which search result is the game that was asked about.
 *
 * Exact on the folded name, and where more than one game has worn the
 * title, the one released in the year RAWG gave — a year either way,
 * since two catalogues can date one release to a port. Anything less
 * exact returns nothing: a near miss here is a different game's logo
 * on this game's page.
 */
export function pickGame(
  candidates: SgdbGame[],
  name: string,
  year: number | null
): SgdbGame | null {
  const wanted = fold(name);
  const exact = candidates.filter((game) => fold(game.name) === wanted);
  if (exact.length === 0) return null;
  if (exact.length === 1 || year == null) return exact[0];
  const dated = exact.filter((game) => {
    if (!game.release_date) return false;
    const released = new Date(game.release_date * 1000).getUTCFullYear();
    return Math.abs(released - year) <= 1;
  });
  return dated[0] ?? exact.find((game) => game.verified) ?? exact[0];
}

/**
 * The best of a game's logos.
 *
 * Style first — the official mark, then a white cut of it, then black
 * — because that is the order they read over dark artwork. Within a
 * style, the community's vote, then a preference for English where
 * the language is known. Anything flagged, animated, or not a PNG is
 * out: the client sets this over a hero and asks nothing of it.
 */
export function pickLogo(logos: SgdbLogo[]): SgdbLogo | null {
  const usable = logos.filter(
    (logo) =>
      logo.mime === 'image/png' &&
      !logo.nsfw &&
      !logo.humor &&
      !logo.epilepsy &&
      logo.width > 0 &&
      logo.height > 0 &&
      // A logo taller than it is wide is a badge, not a title.
      logo.width / logo.height >= 1.2
  );
  const rank = (logo: SgdbLogo) => {
    const style = STYLES.indexOf(logo.style as (typeof STYLES)[number]);
    return style === -1 ? STYLES.length : style;
  };
  usable.sort((a, b) => {
    const style = rank(a) - rank(b);
    if (style !== 0) return style;
    const votes =
      (b.upvotes ?? 0) -
      (b.downvotes ?? 0) -
      ((a.upvotes ?? 0) - (a.downvotes ?? 0));
    if (votes !== 0) return votes;
    const english = Number(b.language === 'en') - Number(a.language === 'en');
    if (english !== 0) return english;
    return b.score - a.score;
  });
  return usable[0] ?? null;
}

const LOGO_QUERY =
  'styles=official,white,black&mimes=image/png&types=static&nsfw=false&humor=false&epilepsy=false&limit=24';

async function fromSgdb(
  key: string,
  name: string,
  year: number | null,
  steam: string | null
): Promise<Logo | null> {
  let logos: SgdbLogo[] | null = null;
  if (steam) {
    logos = await sgdb<SgdbLogo[]>(key, `/logos/steam/${steam}?${LOGO_QUERY}`);
  }
  if (!logos || logos.length === 0) {
    const found = await sgdb<SgdbGame[]>(
      key,
      `/search/autocomplete/${encodeURIComponent(name)}`
    );
    const game = found ? pickGame(found, name, year) : null;
    if (!game) return null;
    logos = await sgdb<SgdbLogo[]>(key, `/logos/game/${game.id}?${LOGO_QUERY}`);
  }
  const best = logos ? pickLogo(logos) : null;
  if (!best) return null;
  return {
    url: best.url,
    thumb: best.thumb || best.url,
    width: best.width,
    height: best.height,
    source: 'sgdb',
    style: best.style,
  };
}

async function fromSteam(steam: string): Promise<Logo | null> {
  const url = `${STEAM_CDN}/${steam}/logo.png`;
  const res = await fetchWithTimeout(url, { method: 'HEAD' });
  if (!res.ok) return null;
  // Valve's logos are a 640×360 canvas with the letters inside it; the
  // canvas is the only size there is to report.
  return {
    url,
    thumb: url,
    width: 640,
    height: 360,
    source: 'steam',
    style: 'official',
  };
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

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const name = one(req.query.name)?.trim() ?? '';
  if (!name) {
    res.status(400).json({ error: 'No game' });
    return;
  }
  const yearRaw = one(req.query.year);
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const steamRaw = one(req.query.steam);
  const steam = steamRaw && /^\d{1,9}$/.test(steamRaw) ? steamRaw : null;

  const key = process.env.STEAMGRIDDB_API_KEY?.trim() || null;

  try {
    let logo: Logo | null = null;
    if (key) logo = await fromSgdb(key, name, year, steam);
    if (!logo && steam) logo = await fromSteam(steam);

    // A week at the edge either way: a logo that exists is not going
    // to change, and one that does not is not going to appear tonight.
    res.setHeader(
      'Cache-Control',
      logo
        ? 's-maxage=604800, stale-while-revalidate=2592000'
        : 's-maxage=86400, stale-while-revalidate=604800'
    );
    res.status(200).json({ logo });
  } catch {
    // Upstream trouble is a page with its typed title, which is the
    // page as it was. Briefly cached so a blip does not become a storm.
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json({ logo: null });
  }
}
