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
const ROUTES = ['/', '/plan', '/library', '/game/3498', '/about'];
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

await browser.close();
server.close();

if (failures.length) {
  console.error(
    `\n${failures.length} route(s) raised errors:\n\n${failures.join('\n\n')}`
  );
  process.exit(1);
}
console.log(
  `\nNo errors across ${ROUTES.length * VIEWPORTS.length} page loads.`
);
