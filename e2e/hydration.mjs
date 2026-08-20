/**
 * Fails if any route logs an uncaught error while loading.
 *
 * This exists for one class of bug that unit tests cannot see. The site
 * ships pre-rendered HTML; if a component reads the device during render
 * — stored state, viewport width, the clock — the client's first render
 * disagrees with the file, React throws the server markup away and
 * re-renders everything, and the only symptom is a console error in
 * production. That is exactly what happened to the plan page once a
 * library was saved, and nothing in the test suite noticed.
 *
 * Storage is seeded on purpose: an empty device hydrates cleanly even
 * when the bug is present, so checking the fresh case proves nothing.
 *
 * RAWG is blocked rather than relayed. Hydration is decided by the first
 * render, before any request resolves, so the check needs no API key and
 * cannot flake on someone else's uptime.
 */
import { chromium } from 'playwright';

import { serve } from './serve.mjs';

const PORT = 8940;
const ROOT = new URL('../dist', import.meta.url).pathname;
const ROUTES = [
  '/',
  '/plan',
  '/library',
  '/import',
  '/memcard',
  '/tidy',
  '/game/3498',
  '/by/developer?id=9&name=Supergiant%20Games',
  '/about',
];
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true },
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
];

/** A device that has actually been used: library, durations, settings. */
const SEED = {
  'sidequest.onboarded.v1': 'true',
  'sidequest.plan.pace': '10',
  'sidequest.durations.v1': JSON.stringify({ 1: 25 }),
  'sidequest.library.v1': JSON.stringify([
    {
      game: { id: 1, name: 'Hades II', playtime: 30, background_image: null },
      status: 'playing',
      addedAt: 1,
    },
    {
      game: { id: 5, name: 'Celeste', playtime: 12, background_image: null },
      status: 'wishlist',
      addedAt: 5,
    },
  ]),
};

const server = await serve(ROOT, PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const failures = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  });
  await context.route(`**/localhost:${PORT}/rawg/**`, (route) => route.abort());
  await context.route(`**/localhost:${PORT}/media/**`, (route) =>
    route.abort()
  );
  await context.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed))
      localStorage.setItem(key, value);
  }, SEED);

  for (const route of ROUTES) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);
    await page.close();

    const label = `${route} (${viewport.name})`;
    if (errors.length) {
      failures.push(`${label}\n    ${errors.join('\n    ')}`);
      console.error(`FAIL ${label}`);
    } else {
      console.log(`ok   ${label}`);
    }
  }
  await context.close();
}

/**
 * The offline pass.
 *
 * The service worker answers navigations from cache, and serving the
 * wrong route's document is invisible — the page renders correctly and
 * only the console shows the mismatch. That is exactly how the first bug
 * hid, so the guard has to cover the cached path too, not just the
 * network one.
 */
const offlineContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
await offlineContext.route(`**/localhost:${PORT}/rawg/**`, (route) =>
  route.abort()
);
await offlineContext.route(`**/localhost:${PORT}/media/**`, (route) =>
  route.abort()
);
await offlineContext.addInitScript((seed) => {
  for (const [key, value] of Object.entries(seed))
    localStorage.setItem(key, value);
}, SEED);

const primer = await offlineContext.newPage();
await primer.goto(`http://localhost:${PORT}/`, {
  waitUntil: 'domcontentloaded',
});
await primer.waitForTimeout(4000);
// Reload so the worker is controlling the page before the network goes.
await primer.reload({ waitUntil: 'domcontentloaded' });
await primer.waitForTimeout(2500);

/*
 * Visit a game page while still online.
 *
 * Offline support is deliberately scoped: the static routes, plus games
 * that have actually been opened. There is one pre-rendered shell for
 * every game id, so serving it for a game nobody visited would hand
 * React markup written for a different URL. That case is left to the
 * browser's offline page on purpose, and asserting on it here proved
 * environment-dependent — it passed locally and failed on CI, which is
 * a test measuring the harness rather than the app.
 */
await primer.goto(`http://localhost:${PORT}/game/3498`, {
  waitUntil: 'domcontentloaded',
});
await primer.waitForTimeout(2500);

const controlled = await primer.evaluate(
  () => !!navigator.serviceWorker.controller
);
if (!controlled) {
  failures.push(
    'service worker never took control — the offline pass proved nothing'
  );
  console.error('FAIL  service worker did not take control');
} else {
  console.log('ok   service worker controlling');
}

/**
 * Assert the precache directly, before going offline.
 *
 * This is the invariant that matters, and asserting it beats watching
 * for errors. When a route is missing from the cache the worker serves
 * some other route's document, and React hydrates markup belonging to a
 * different page — but whether that surfaces as an uncaught error turns
 * out to depend on navigation order and timing. It reproduced reliably
 * by hand and not at all inside this harness, so an error-watching
 * assertion here would be a check that passes whether or not the bug is
 * present. The cache contents are not ambiguous.
 */
const cached = await primer.evaluate(async () => {
  const cache = await caches.open('sidequest-shell-v1');
  return (await cache.keys()).map((request) => new URL(request.url).pathname);
});
// Game pages are deliberately not precached: there is one pre-rendered
// shell for every id, and serving it for a game that was never opened
// breaks hydration. Offline covers the static routes plus whichever
// games were actually visited, and nothing else.
const staticRoutes = ROUTES.filter((route) => !route.startsWith('/game/'));
// Compared by path: a document is the same document whatever query
// string led to it, and the worker matches it the same way.
const cachedPaths = cached.map((entry) => entry.split('?')[0]);
const missing = staticRoutes.filter(
  (route) => !cachedPaths.includes(route.split('?')[0])
);
if (missing.length) {
  failures.push(
    `service worker did not precache: ${missing.join(', ')}\n` +
      `    cached instead: ${cached.join(', ')}\n` +
      "    An uncached route is served another route's document offline, " +
      'which hydrates the wrong markup.'
  );
  console.error(`FAIL precache missing ${missing.length} route(s)`);
} else {
  console.log(`ok   precached every route (${cached.length} entries)`);
}

await offlineContext.setOffline(true);

/** Secondary: the routes should also actually load and stay quiet. */
for (const route of ROUTES) {
  const page = await offlineContext.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page
    .goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  await page.waitForTimeout(4000);
  const rendered = await page.evaluate(
    () => document.body.innerText.trim().length > 0
  );
  await page.close();

  const label = `${route} (offline)`;
  if (errors.length || !rendered) {
    failures.push(
      `${label}\n    ${errors.join('\n    ') || 'rendered nothing'}`
    );
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

await offlineContext.close();

await browser.close();
server.close();

if (failures.length) {
  console.error(
    `\n${failures.length} route(s) raised errors:\n\n${failures.join('\n\n')}`
  );
  process.exit(1);
}
console.log(
  `\nNo errors across ${ROUTES.length * VIEWPORTS.length} online and ${ROUTES.length} offline page loads.`
);
