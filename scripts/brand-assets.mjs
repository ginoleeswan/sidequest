/**
 * Rasterises the brand assets from one source of truth.
 *
 * The mark lives in src/components/Mark.tsx as vectors; this script draws
 * the same geometry for the files a browser or an app store wants as PNG
 * (installed icons, the Apple touch icon, the link-preview card). Keeping
 * them generated rather than hand-exported means the mark can change in
 * one place and every derived asset follows.
 *
 * Requires Playwright's Chromium, which the app itself does not — run it
 * only when the mark or the card copy changes:
 *
 *   node scripts/brand-assets.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const ASSETS = join(ROOT, 'assets');

const NAVY = '#272F3F';
const DEEP = '#333D51';
const AMBER = '#F2A93B';
const WHITE = '#FFFFFF';
const GREY = '#A3A9B8';

// Joystick geometry, mirrored from src/components/Mark.tsx.
const HEX =
  'M42.00 12.62A16 16 0 0 1 58.00 12.62L78.37 24.38A16 16 0 0 1 86.37 38.24' +
  'L86.37 61.76A16 16 0 0 1 78.37 75.62L58.00 87.38A16 16 0 0 1 42.00 87.38' +
  'L21.63 75.62A16 16 0 0 1 13.63 61.76L13.63 38.24A16 16 0 0 1 21.63 24.38Z';

const SQUASH = 0.46;
const PLINTH_CY = 73;
const PLINTH_DEPTH = 9;
const BALL_CY = 26;
const BALL_R = 19;
const SHAFT_WIDTH = 11;
const SHADE = '#CBD1DC';

const layFlat = (cy) =>
  `translate(0 ${cy}) scale(1 ${SQUASH}) translate(0 -50)`;
const SHAFT = `M50 ${PLINTH_CY + 4} L50 ${BALL_CY + BALL_R * 0.5}`;

/** The mark's own bounds, for lockups where it stands alone. */
const TIGHT = '4 6 92 92';

/** The mark in a 100×100 box. `scale` shrinks it about its centre. */
function mark({ color = WHITE, knob = AMBER, shade = SHADE, scale = 1 } = {}) {
  const glyph =
    `<g transform="${layFlat(PLINTH_CY + PLINTH_DEPTH)}"><path d="${HEX}" fill="${shade}"/></g>` +
    `<g transform="${layFlat(PLINTH_CY)}"><path d="${HEX}" fill="${color}"/></g>` +
    `<path d="${SHAFT}" stroke="${color}" stroke-width="${SHAFT_WIDTH}" stroke-linecap="round"/>` +
    `<circle cx="50" cy="${BALL_CY}" r="${BALL_R}" fill="${knob}"/>`;
  if (scale === 1) return glyph;
  const shift = 50 * (1 - scale);
  return `<g transform="translate(${shift} ${shift}) scale(${scale})">${glyph}</g>`;
}

/**
 * `any` icons are shown as drawn, so they carry their own rounded plate.
 * `maskable` icons are cropped to whatever shape the platform likes, so
 * they fill the square and keep the mark inside the safe circle.
 */
function icon({ maskable = false } = {}) {
  const plate = maskable
    ? `<rect width="100" height="100" fill="${NAVY}"/>`
    : `<rect width="100" height="100" rx="22" fill="${NAVY}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${plate}${mark({ scale: maskable ? 0.66 : 0.84 })}</svg>`;
}

const FONT = readFileSync(join(ROOT, 'assets/fonts/Noah-Black.ttf')).toString(
  'base64'
);
const FONT_BOLD = readFileSync(
  join(ROOT, 'assets/fonts/Noah-Bold.ttf')
).toString('base64');
const FONT_BODY = readFileSync(
  join(ROOT, 'assets/fonts/Noah-Regular.ttf')
).toString('base64');

/** The link-preview card: 1200×630, the size every crawler crops from. */
function ogCard() {
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Noah; font-weight: 900; src: url(data:font/ttf;base64,${FONT}); }
    @font-face { font-family: Noah; font-weight: 700; src: url(data:font/ttf;base64,${FONT_BOLD}); }
    @font-face { font-family: Noah; font-weight: 400; src: url(data:font/ttf;base64,${FONT_BODY}); }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; background: ${DEEP}; font-family: Noah, sans-serif;
           padding: 92px; display: flex; flex-direction: column; justify-content: center; }
    .lockup { display: flex; align-items: center; gap: 30px; margin-bottom: 74px; }
    .word { font-weight: 900; font-size: 82px; letter-spacing: -1px; color: ${WHITE}; }
    h1 { font-weight: 700; font-size: 44px; color: ${WHITE}; margin-bottom: 22px; }
    p { font-weight: 400; font-size: 30px; color: ${GREY}; }
    .rule { width: 132px; height: 5px; border-radius: 3px; background: ${AMBER}; margin: 52px 0 26px; }
    .fine { font-size: 24px; color: #7C8496; }
  </style>
  <div class="lockup">
    <svg viewBox="${TIGHT}" width="96" height="96">${mark()}</svg>
    <div class="word">SIDEQUEST</div>
  </div>
  <h1>Know what you can actually finish.</h1>
  <p>Backlog triage for people with more games than time.</p>
  <div class="rule"></div>
  <div class="fine">No account. No tracking. Your library stays on your device.</div>`;
}

const { chromium } = await import('playwright');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
});

async function shoot(html, { width, height, out, dir = PUBLIC }) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(dir, out), omitBackground: true });
  await page.close();
  console.log(out);
}

const wrap = (svg, size) =>
  `<!doctype html><meta charset="utf-8"><style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;

for (const [size, out] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  await shoot(wrap(icon(), size), { width: size, height: size, out });
}
for (const [size, out] of [
  [192, 'icon-maskable-192.png'],
  [512, 'icon-maskable-512.png'],
]) {
  await shoot(wrap(icon({ maskable: true }), size), {
    width: size,
    height: size,
    out,
  });
}
await shoot(ogCard(), { width: 1200, height: 630, out: 'og.png' });

// The native app's own icons, and the tab favicon.
await shoot(wrap(icon(), 1024), {
  width: 1024,
  height: 1024,
  out: 'icon.png',
  dir: ASSETS,
});
await shoot(wrap(icon({ maskable: true }), 1024), {
  width: 1024,
  height: 1024,
  out: 'adaptive-icon.png',
  dir: ASSETS,
});
await shoot(wrap(icon(), 64), {
  width: 64,
  height: 64,
  out: 'favicon.png',
  dir: ASSETS,
});

// The splash: the mark alone on the app's own ground.
await shoot(
  `<!doctype html><meta charset="utf-8"><style>*{margin:0}body{width:1284px;height:2778px;` +
    `background:${NAVY};display:flex;align-items:center;justify-content:center}` +
    `svg{width:360px;height:360px}</style>` +
    `<svg viewBox="${TIGHT}">${mark()}</svg>`,
  { width: 1284, height: 2778, out: 'splash.png', dir: ASSETS }
);

// The favicon and the native icons live in assets/, not public/.
writeFileSync(join(ROOT, 'assets/brand-mark.svg'), icon());
console.log('assets/brand-mark.svg');

await browser.close();
