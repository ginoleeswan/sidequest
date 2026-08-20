/**
 * Proves the icon subset actually draws every icon the app names.
 *
 * The font shipped to the browser carries a few dozen of Ionicons'
 * ~1,300 glyphs. A name the subset does not carry does not fail loudly:
 * it renders as a blank or a fallback box, in a corner of a screen
 * nobody was looking at. So each glyph is measured against a codepoint
 * deliberately left out — a glyph that is present must not measure the
 * same as one that is missing.
 */
import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';

import { serve } from './serve.mjs';

const PORT = 8946;
const ROOT = new URL('../dist', import.meta.url).pathname;
const LIST = new URL('../src/constants/iconSubset.ts', import.meta.url)
  .pathname;
const GLYPH_MAP = new URL(
  '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json',
  import.meta.url
).pathname;

const glyphMap = JSON.parse(readFileSync(GLYPH_MAP, 'utf8'));
const names = [
  ...readFileSync(LIST, 'utf8').matchAll(/^ {2}'([^']+)',$/gm),
].map(([, name]) => name);
const codepoints = names.map((name) => glyphMap[name]);

if (names.length === 0) {
  console.error('No icons found in src/constants/iconSubset.ts');
  process.exit(1);
}

const server = await serve(ROOT, PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
await context.route('**/rawg/**', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"count":0,"next":null,"results":[]}',
  })
);

const page = await context.newPage();
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.fonts.check('16px ionicons'), null, {
  timeout: 15000,
});

const { missing, control } = await page.evaluate(
  async (points) => {
    await document.fonts.load('64px ionicons');
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '64px ionicons';
    // A private-use codepoint no icon uses: whatever the browser draws
    // for this is what "missing" looks like in this font.
    const control = ctx.measureText(String.fromCodePoint(0xf8ff)).width;
    return {
      control,
      missing: points
        .filter(
          ({ code }) =>
            Math.abs(
              ctx.measureText(String.fromCodePoint(code)).width - control
            ) < 0.01
        )
        .map(({ name }) => name),
    };
  },
  names.map((name, i) => ({ name, code: codepoints[i] }))
);

await browser.close();
server.close();

if (missing.length) {
  console.error(
    `\n${missing.length} icon(s) do not draw from the subset:\n  ${missing.join('\n  ')}\n`
  );
  process.exit(1);
}

console.log(
  `All ${names.length} subset icons draw (a missing glyph measures ${control}px).`
);
