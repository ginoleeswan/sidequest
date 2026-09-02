/**
 * A game's artwork, the way a storefront draws it (Vercel serverless
 * function).
 *
 * RAWG hands the app screenshots and one piece of key art. A shelf
 * built from those is a catalogue; a shelf built the way Netflix or
 * Steam builds one needs three more things per game, and SteamGridDB
 * has all of them: the publisher's LOGO (the title as they drew it),
 * a HERO (a wide banner composed to sit behind that logo), a GRID (box
 * art, portrait) and an ICON (the square mark). Steam's own CDN serves
 * official versions of the first three for anything with a Steam
 * release, which is the fallback — and the only source when no key is
 * configured.
 *
 *   /api/art?name=Hades&year=2020[&steam=1145360][&slug=hades]
 *     -> { logo, hero, grid, icon }     each { url, thumb, width,
 *                                        height, source, style } | null
 *
 * One round trip per game, because a page wants several of these at
 * once and a tile wants one; a single answer, cached hard at the edge,
 * serves both. A wrong picture is far worse than no picture — "Hades'
 * Star" over Hades is the failure a reader notices from across the
 * room — so a name search has to land on the exact title, and on the
 * right year where a title has been used twice, or it lands on nothing.
 */

const TIMEOUT_MS = 8_000;
const LIMIT = 120;
const WINDOW_MS = 60_000;

const SGDB = 'https://www.steamgriddb.com/api/v2';
const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

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

export interface Asset {
  /** The full-size file. */
  url: string;
  /** A smaller cut for a phone: ~500px logos, 850px heroes, 267px grids. */
  thumb: string;
  width: number;
  height: number;
  source: 'sgdb' | 'steam';
  style: string;
}

export interface Art {
  logo: Asset | null;
  hero: Asset | null;
  grid: Asset | null;
  icon: Asset | null;
}

interface SgdbGame {
  id: number;
  name: string;
  verified?: boolean;
  release_date?: number;
}

interface SgdbAsset {
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
  try {
    const res = await fetchWithTimeout(`${SGDB}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: T };
    return body.success && body.data != null ? body.data : null;
  } catch {
    // One category failing must not cost the other three.
    return null;
  }
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
 * exact returns nothing: a near miss here is a different game's
 * artwork on this game's page.
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
 * The best of a category, given the styles worth having, best first.
 *
 * Style is the first sort — the official mark before a white cut of it,
 * the artwork before a blurred version — then the community's vote,
 * then a preference for English where the language is known. Anything
 * flagged is out before ranking begins: the client sets these over a
 * page and asks nothing of them.
 */
export function pickAsset(
  assets: SgdbAsset[],
  styles: readonly string[],
  keep: (asset: SgdbAsset) => boolean = () => true
): SgdbAsset | null {
  const usable = assets.filter(
    (asset) => !asset.nsfw && !asset.humor && !asset.epilepsy && keep(asset)
  );
  const rank = (asset: SgdbAsset) => {
    const style = styles.indexOf(asset.style);
    return style === -1 ? styles.length : style;
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

/** A title treatment: a still PNG, wider than it is tall — not a badge. */
export const pickLogo = (assets: SgdbAsset[]) =>
  pickAsset(
    assets,
    ['official', 'white', 'black'],
    (a) => a.mime === 'image/png' && a.width > 0 && a.width / a.height >= 1.2
  );

/**
 * A hero: the artwork itself, at the banner proportions the shelf is
 * built for. Blurred and flat styles exist for other jobs.
 */
export const pickHero = (assets: SgdbAsset[]) =>
  pickAsset(
    assets,
    ['alternate', 'material'],
    (a) =>
      a.width >= 1600 && a.width / a.height >= 2.8 && a.width / a.height <= 3.3
  );

/** Box art: the portrait grid, with the title on it, as a shelf shows it. */
export const pickGrid = (assets: SgdbAsset[]) =>
  pickAsset(
    assets,
    ['alternate', 'material', 'white_logo'],
    (a) => a.width === 600 && a.height === 900
  );

/** The square mark. Dimensions come back as zero for .ico files; the
 *  256px PNG the thumb points at is the one worth having. */
export const pickIcon = (assets: SgdbAsset[]) =>
  pickAsset(assets, ['official', 'custom'], (a) => Boolean(a.thumb));

const FLAGS = 'nsfw=false&humor=false&epilepsy=false&types=static';
const QUERIES = {
  logos: `styles=official,white,black&mimes=image/png&${FLAGS}&limit=24`,
  heroes: `styles=alternate,material&dimensions=1920x620,3840x1240&${FLAGS}&limit=24`,
  grids: `styles=alternate,material,white_logo&dimensions=600x900&${FLAGS}&limit=24`,
  icons: `styles=official,custom&${FLAGS}&limit=12`,
} as const;

const asAsset = (asset: SgdbAsset | null): Asset | null =>
  asset
    ? {
        url: asset.url,
        thumb: asset.thumb || asset.url,
        width: asset.width,
        height: asset.height,
        source: 'sgdb',
        style: asset.style,
      }
    : null;

/** The four categories for one SteamGridDB key path, in parallel. */
async function categories(key: string, path: string): Promise<Art> {
  const [logos, heroes, grids, icons] = await Promise.all([
    sgdb<SgdbAsset[]>(key, `/logos/${path}?${QUERIES.logos}`),
    sgdb<SgdbAsset[]>(key, `/heroes/${path}?${QUERIES.heroes}`),
    sgdb<SgdbAsset[]>(key, `/grids/${path}?${QUERIES.grids}`),
    sgdb<SgdbAsset[]>(key, `/icons/${path}?${QUERIES.icons}`),
  ]);
  const icon = pickIcon(icons ?? []);
  return {
    logo: asAsset(pickLogo(logos ?? [])),
    hero: asAsset(pickHero(heroes ?? [])),
    grid: asAsset(pickGrid(grids ?? [])),
    // The .ico is the file; the 256px PNG beside it is the picture.
    icon: icon
      ? {
          ...(asAsset(icon) as Asset),
          url: icon.thumb,
          width: 256,
          height: 256,
        }
      : null,
  };
}

const NOTHING: Art = { logo: null, hero: null, grid: null, icon: null };
const empty = (art: Art) => !art.logo && !art.hero && !art.grid && !art.icon;

async function fromSgdb(
  key: string,
  name: string,
  year: number | null,
  steam: string | null
): Promise<Art> {
  if (steam) {
    const art = await categories(key, `steam/${steam}`);
    if (!empty(art)) return art;
  }
  const found = await sgdb<SgdbGame[]>(
    key,
    `/search/autocomplete/${encodeURIComponent(name)}`
  );
  const game = found ? pickGame(found, name, year) : null;
  if (!game) return NOTHING;
  return categories(key, `game/${game.id}`);
}

/**
 * Valve's own files, for a game with a Steam release. Each is checked
 * rather than assumed: a game can have a logo and no hero. The sizes
 * are the canvases Valve draws on, which is all there is to report.
 */
async function fromSteam(steam: string, missing: Art): Promise<Art> {
  const probe = async (file: string, width: number, height: number) => {
    try {
      const url = `${STEAM_CDN}/${steam}/${file}`;
      const res = await fetchWithTimeout(url, { method: 'HEAD' });
      if (!res.ok) return null;
      return {
        url,
        thumb: url,
        width,
        height,
        source: 'steam' as const,
        style: 'official',
      };
    } catch {
      return null;
    }
  };
  const [logo, hero, grid] = await Promise.all([
    missing.logo ? null : probe('logo.png', 640, 360),
    missing.hero ? null : probe('library_hero.jpg', 3840, 1240),
    missing.grid ? null : probe('library_600x900.jpg', 600, 900),
  ]);
  return {
    logo: missing.logo ?? logo,
    hero: missing.hero ?? hero,
    grid: missing.grid ?? grid,
    icon: missing.icon,
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
    let art: Art = key ? await fromSgdb(key, name, year, steam) : NOTHING;
    if (steam && (!art.logo || !art.hero || !art.grid))
      art = await fromSteam(steam, art);

    // A week at the edge either way: artwork that exists is not going
    // to change, and artwork that does not is not going to appear
    // tonight.
    res.setHeader(
      'Cache-Control',
      empty(art)
        ? 's-maxage=86400, stale-while-revalidate=604800'
        : 's-maxage=604800, stale-while-revalidate=2592000'
    );
    res.status(200).json(art);
  } catch {
    // Upstream trouble is a page drawn from RAWG, which is the page as
    // it was. Briefly cached so a blip does not become a storm.
    res.setHeader('Cache-Control', 's-maxage=60');
    res.status(200).json(NOTHING);
  }
}
