/**
 * The screens with data on them, checked as a reader would check them.
 *
 * Every other browser check here runs with RAWG blocked, which is
 * right for what they measure and blind to a whole class of shipped
 * bug. Three were found in one sitting by rendering the built site and
 * reading it: a shared game link opened the onboarding instead of the
 * game, a deadline alert promised an action it did not offer, and the
 * shared-plan page invited the reader to build a plan with nothing to
 * press. None were visible in the source. All were obvious on the
 * rendered page.
 *
 * So this boots the export with a fixture RAWG (see rawgFixtures.mjs)
 * and asserts the sentences a person acts on are actually there — and
 * that the ones that must not be there are not. It is a reading test,
 * not a screenshot diff: markers are the words a reader would tap,
 * which move only when the product's promises move.
 */
import { Buffer } from 'node:buffer';

import { chromium } from 'playwright';

import { rawgFixture } from './rawgFixtures.mjs';
import { serve } from './serve.mjs';

const PORT = 8943;
const ROOT = new URL('../dist', import.meta.url).pathname;

const DAY = 86_400_000;
const now = Date.now();

/** The same base64url the app writes into a share link. */
const encodePlan = (pace, games) => {
  const rows = games.map(({ name, hours }) => `${name}~${hours}`).join('|');
  return Buffer.from(`1;${pace};${rows}`, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

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

/** A device mid-life: a plan under way, and one deadline that cannot be met. */
const SEED = {
  'sidequest.onboarded.v1': 'true',
  'sidequest.plan.pace': '6',
  'sidequest.library.v1': JSON.stringify({
    1: entry(1, 'Hades', 21, { status: 'playing', hoursPlayed: 9 }),
    2: entry(2, 'Elden Ring', 58, { deadline: now + 4 * DAY }),
    3: entry(3, 'Tunic', 12),
  }),
};

/**
 * Each scenario is a page and the sentences that make it that page.
 * `absent` guards the regressions where the wrong thing appeared.
 */
const SCENARIOS = [
  {
    name: 'a stranger follows a game link',
    route: '/game/3498',
    seed: {},
    expect: ['Hades', 'Player verdict', 'More in this series', 'Want to play'],
    // The onboarding must never cover a page somebody was linked to.
    absent: ['Your backlog isn’t'],
  },
  {
    name: 'the home shelves, with data',
    route: '/',
    seed: { 'sidequest.onboarded.v1': 'true' },
    expect: ['Out this week', 'How this works'],
  },
  {
    name: 'the plan, with a deadline that cannot be met',
    route: '/plan',
    seed: SEED,
    // The alert offers every escape its sentence names.
    expect: ['Drop the date', 'Let it go', 'Tonight', 'This week'],
  },
  {
    name: 'a shared plan asks for something back',
    route: `/shared?p=${encodePlan(6, [
      { name: 'Hades', hours: 12 },
      { name: 'Tunic', hours: 12 },
    ])}`,
    seed: {},
    expect: ['Shared with you', 'Hades', 'Build your own'],
  },
];

const server = await serve(ROOT, PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const failures = [];

for (const scenario of SCENARIOS) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
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
  await context.addInitScript((seed) => {
    for (const [key, value] of Object.entries(seed))
      localStorage.setItem(key, value);
  }, scenario.seed);

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://localhost:${PORT}${scenario.route}`, {
    waitUntil: 'networkidle',
  });

  const missing = [];
  for (const text of scenario.expect) {
    const found = await page
      .getByText(text, { exact: false })
      .first()
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!found) missing.push(`missing "${text}"`);
  }
  for (const text of scenario.absent ?? []) {
    const count = await page.getByText(text, { exact: false }).count();
    if (count > 0) missing.push(`must not show "${text}"`);
  }
  if (errors.length) missing.push(...errors.map((e) => `pageerror: ${e}`));

  if (missing.length) {
    failures.push(`${scenario.name}\n    ${missing.join('\n    ')}`);
    console.error(`FAIL ${scenario.name}`);
  } else {
    console.log(`ok   ${scenario.name}`);
  }
  await context.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(
    `\nScreens not saying what they must:\n\n${failures.join('\n')}`
  );
  process.exit(1);
}
console.log('\nEvery screen says what it promises.');
