/**
 * The app at iPad sizes, as pictures.
 *
 * Native gives a tablet the wide layout without the web's sidebar, and
 * no test here had ever looked at it: every browser check runs at a
 * phone's width or a desk's. This renders the export
 * at every iPad size Apple sells, portrait and landscape, with the
 * fixture RAWG and a lived-in library, and writes a screenshot per
 * screen for a person to look at. It asserts nothing: layout is read,
 * not measured.
 *
 * The export has to be one built as a tablet sees it — the wide layout
 * with no desk chrome — which `useBreakpoint` does when asked:
 *
 *   EXPO_PUBLIC_PREVIEW_TABLET=1 npx expo export --platform web --clear --output-dir dist-ipad
 *   npm run shots:ipad           # → e2e/ipad-shots/<size>/<screen>.png
 *
 * Chrome is not WebKit and react-native-web is not UIKit, so what this
 * shows is the flex layout, the type and the columns — not the native
 * tab bar, the stack header or the safe areas. That is the part that
 * can go wrong in the app's own code, and the part the simulator
 * screenshots in scripts/store-screenshots.sh then confirm.
 */
import { mkdir } from 'node:fs/promises';

import { chromium } from 'playwright';

import { rawgFixture } from './rawgFixtures.mjs';
import { serve } from './serve.mjs';

const PORT = 8945;
const ROOT = new URL(`../${process.env.DIST ?? 'dist-ipad'}`, import.meta.url)
  .pathname;
const OUT = new URL(
  `../${process.env.OUT ?? 'e2e/ipad-shots'}`,
  import.meta.url
).pathname;

const DAY = 86_400_000;
const now = Date.now();

const entry = (id, name, playtime, over = {}) => ({
  game: {
    id,
    name,
    slug: name.toLowerCase(),
    playtime,
    background_image: null,
  },
  status: 'wishlist',
  addedAt: now - 10 * DAY,
  updatedAt: now - DAY,
  ...over,
});

/** A device mid-life: playing one, one deadline, a few on the shelf. */
const SEED = {
  'sidequest.onboarded.v1': 'true',
  'sidequest.plan.pace': '6',
  'sidequest.library.v1': JSON.stringify({
    1: entry(1, 'Hades', 21, { status: 'playing', hoursPlayed: 9 }),
    2: entry(2, 'Elden Ring', 58, { deadline: now + 4 * DAY }),
    3: entry(3, 'Tunic', 12),
    4: entry(4, 'Celeste', 12, {
      status: 'finished',
      finishedAt: now - 30 * DAY,
    }),
    5: entry(5, 'Outer Wilds', 17),
    6: entry(6, 'Chicory', 10),
  }),
};

/** Every iPad Apple sells, in points, both ways round. */
const SIZES = [
  { name: 'ipad-mini-portrait', width: 744, height: 1133 },
  { name: 'ipad-11-portrait', width: 834, height: 1194 },
  { name: 'ipad-13-portrait', width: 1024, height: 1366 },
  { name: 'ipad-11-landscape', width: 1194, height: 834 },
  { name: 'ipad-13-landscape', width: 1366, height: 1024 },
];

const ROUTES = [
  ['home', '/'],
  ['plan', '/plan'],
  ['library', '/library'],
  ['game', '/game/3498'],
  ['memcard', '/memcard'],
  ['you', '/you'],
  ['import', '/import'],
  ['tidy', '/tidy'],
  ['account', '/account'],
];

const server = await serve(ROOT, PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

for (const size of SIZES) {
  const dir = `${OUT}/${size.name}`;
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await context.route(`**/localhost:${PORT}/rawg/**`, (route) => {
    const url = new URL(route.request().url());
    const body = rawgFixture(url.pathname.slice('/rawg/'.length) + url.search);
    if (!body) return route.abort();
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await context.route(`**/localhost:${PORT}/media/**`, (route) =>
    route.abort()
  );
  await context.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed))
      localStorage.setItem(key, value);
  }, SEED);

  for (const [name, route] of ROUTES) {
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${dir}/${name}.png` });
    await page.screenshot({ path: `${dir}/${name}-full.png`, fullPage: true });
    await page.close();
    console.log(`${size.name}/${name}`);
  }
  await context.close();
}

await browser.close();
server.close();
