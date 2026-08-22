/**
 * Link previews for shared game pages (Vercel serverless function).
 *
 * The app is a static export: one HTML shell for every route, carrying
 * the site-wide Open Graph tags. That means a link to a specific game
 * previews as "Sidequest — Discover your next game" with the generic
 * card, which throws away the single best reason to share one.
 *
 * Crawlers don't run JavaScript, so they can't be fixed on the client.
 * This handler answers them — and only them — with a small document
 * carrying that game's real title, art and facts. Humans are never routed
 * here (see the user-agent condition in vercel.json), so the app they
 * load is unchanged.
 */

const TIMEOUT_MS = 6_000;
const SITE = 'https://gosidequest.vercel.app';

interface PreviewGame {
  name: string;
  released?: string | null;
  rating?: number;
  playtime?: number;
  metacritic?: number | null;
  background_image?: string | null;
  genres?: { name: string }[];
  description_raw?: string;
}

/** Text inside an HTML attribute or body must not be able to close it. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The line under the title in a shared card.
 *
 * Facts first — genre, year, rating, length — because that is what makes
 * someone decide whether to tap, and it is what Sidequest is for. The
 * game's own blurb follows when there is room.
 */
export function previewDescription(game: PreviewGame): string {
  const facts = [
    game.genres?.[0]?.name,
    game.released?.slice(0, 4),
    game.rating ? `★ ${game.rating.toFixed(1)}` : undefined,
    game.playtime ? `~${game.playtime}h to finish` : undefined,
  ].filter(Boolean);

  const blurb = (game.description_raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);

  const line = facts.join(' · ');
  if (!blurb) return line || 'Find your next game, and a plan to finish it.';
  return `${line}${line ? ' — ' : ''}${blurb}${blurb.length === 150 ? '…' : ''}`;
}

export function renderPreview(game: PreviewGame, id: string): string {
  const title = `${game.name} — Sidequest`;
  const description = previewDescription(game);
  const image = game.background_image ?? `${SITE}/og.png`;
  const url = `${SITE}/game/${id}`;

  const tags = [
    ['og:type', 'article'],
    ['og:site_name', 'Sidequest'],
    ['og:title', title],
    ['og:description', description],
    ['og:image', image],
    ['og:url', url],
  ]
    .map(
      ([property, content]) =>
        `<meta property="${property}" content="${escapeHtml(content)}"/>`
    )
    .join('');

  const twitter = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', image],
  ]
    .map(
      ([name, content]) =>
        `<meta name="${name}" content="${escapeHtml(content)}"/>`
    )
    .join('');

  // A crawler that reads text rather than tags still gets a real page.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<link rel="canonical" href="${url}"/>
${tags}${twitter}
</head><body>
<h1>${escapeHtml(game.name)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${url}">Open ${escapeHtml(game.name)} on Sidequest</a></p>
</body></html>`;
}

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { send: (body: string) => void };
    setHeader: (name: string, value: string) => void;
  }
) {
  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!id || !/^\d{1,9}$/.test(id)) {
    res.status(400).send('<!doctype html><title>Not a game</title>');
    return;
  }

  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) {
    res.status(503).send('<!doctype html><title>Sidequest</title>');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(
      `https://api.rawg.io/api/games/${id}?key=${key}`,
      { signal: controller.signal }
    );
    if (!upstream.ok) {
      res
        .status(upstream.status === 404 ? 404 : 502)
        .send('<!doctype html><title>Sidequest</title>');
      return;
    }
    const game = (await upstream.json()) as PreviewGame;
    // Crawlers re-fetch often; let the edge answer most of it.
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800'
    );
    res.status(200).send(renderPreview(game, id));
  } catch {
    res.status(504).send('<!doctype html><title>Sidequest</title>');
  } finally {
    clearTimeout(timer);
  }
}
