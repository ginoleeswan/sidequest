/**
 * Generates public/sitemap.xml at build time.
 *
 * The committed sitemap listed four static pages with a hand-typed
 * lastmod that went stale the day it was written, and none of the game
 * pages — which are the only content a search engine has any reason to
 * index. api/preview.ts already renders those for crawlers; nothing was
 * telling crawlers they exist.
 *
 * /plan and /library are deliberately absent: they are personal, and to
 * anyone not signed into this device they are empty.
 *
 * The RAWG fetch fails soft. A sitemap is worth less than a deploy, so a
 * rate limit or an outage degrades this to the static pages rather than
 * breaking the build.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Must match SITE in api/preview.ts. */
const SITE = 'https://gosidequest.vercel.app';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'sitemap.xml'
);

const STATIC = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

/** Enough to be useful to a crawler without pretending to be a catalogue. */
const GAME_PAGES = 200;
const PER_PAGE = 40;

const today = new Date().toISOString().slice(0, 10);

async function popularGames() {
  // Build-time and server-side, so RAWG_API_KEY is the right var — the
  // EXPO_PUBLIC_ copy is a fallback for native/older setups that still
  // only set that one. Without this the sitemap silently drops every
  // game page on a deployment configured with the server-side key alone.
  const key = (
    process.env.RAWG_API_KEY ?? process.env.EXPO_PUBLIC_RAWG_API_KEY
  )?.trim();
  if (!key) {
    console.warn('sitemap: no RAWG key, emitting static pages only');
    return [];
  }
  const games = [];
  for (let page = 1; games.length < GAME_PAGES; page += 1) {
    const url =
      `https://api.rawg.io/api/games?key=${key}&ordering=-added` +
      `&page_size=${PER_PAGE}&page=${page}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RAWG ${response.status}`);
    const body = await response.json();
    const results = body.results ?? [];
    if (results.length === 0) break;
    games.push(...results.map((game) => game.id));
    if (!body.next) break;
  }
  return games.slice(0, GAME_PAGES);
}

const entry = (loc, changefreq, priority, lastmod) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
  `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

let games = [];
try {
  games = await popularGames();
} catch (error) {
  console.warn(
    `sitemap: RAWG unavailable (${error.message}); static pages only`
  );
}

const urls = [
  ...STATIC.map((page) =>
    entry(`${SITE}${page.path}`, page.changefreq, page.priority, today)
  ),
  ...games.map((id) => entry(`${SITE}/game/${id}`, 'weekly', '0.6', today)),
];

await writeFile(
  OUT,
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
);
console.log(`sitemap: ${STATIC.length} static + ${games.length} game pages`);
