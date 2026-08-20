/**
 * Runs axe against the exported site and fails on any violation.
 *
 * The accessibility work so far — names on icon-only controls, state on
 * toggles, a skip link — was done by reading the code. This checks the
 * thing that actually ships: the rendered DOM, at both widths, with a
 * library already saved so the states a real device reaches are the ones
 * audited.
 *
 * RAWG is blocked, as in the hydration check: the audit is about markup
 * the app produces, and must not depend on someone else's uptime.
 */
import { readFile } from 'node:fs/promises';

import { chromium } from 'playwright';

import { serve } from './serve.mjs';

const PORT = 8941;
const ROOT = new URL('../dist', import.meta.url).pathname;
const AXE = new URL('../node_modules/axe-core/axe.min.js', import.meta.url)
  .pathname;

const ROUTES = [
  '/',
  '/plan',
  '/library',
  '/import',
  '/memcard',
  '/tidy',
  '/shared',
  '/game/3498',
  '/by/developer?id=9&name=Supergiant%20Games',
  '/about',
  '/privacy',
];
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true },
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
];

/** WCAG 2.1 A and AA — the level the site claims to meet. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const SEED = {
  'sidequest.onboarded.v1': 'true',
  'sidequest.plan.pace': '10',
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

const axeSource = await readFile(AXE, 'utf8');
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
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: 'domcontentloaded',
    });
    // Let the client render past the pre-rendered HTML.
    await page.waitForTimeout(2500);
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(
      async (tags) =>
        window.axe.run({ runOnly: { type: 'tag', values: tags } }),
      TAGS
    );
    await page.close();

    const label = `${route} (${viewport.name})`;
    if (results.violations.length) {
      for (const violation of results.violations) {
        failures.push(
          `${label}\n    ${violation.id} (${violation.impact}): ${violation.help}` +
            violation.nodes
              .slice(0, 3)
              .map((node) => `\n      ${node.html.slice(0, 160)}`)
              .join('')
        );
      }
      console.error(
        `FAIL ${label} — ${results.violations.length} violation(s)`
      );
    } else {
      console.log(`ok   ${label}`);
    }
  }
  await context.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n${failures.length} accessibility violation(s):\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}

console.log(
  `\nNo WCAG A/AA violations across ${ROUTES.length * VIEWPORTS.length} page loads.`
);
