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

/**
 * How far the glyph rides up inside its own box, in mark units.
 *
 * The mark's ink runs from y=7 (the ball's crown) to y=99.2 (the near
 * edge of the plinth's side), so its centre is at 53.1 — three units
 * below the middle of the box it is drawn in. Centred by the box, it
 * therefore sits low on every plate derived from it: measured at icon
 * scale, 13.9 units of navy above the ball against 8.7 below the base,
 * a top gap sixty percent larger than the bottom one.
 *
 * The first 3.1 units put the ink's own centre on the plate's. The
 * last one is the optical correction a bottom-heavy object needs: all
 * the mass is in the plinth, and an object like that reads as sinking
 * when it is centred honestly. Held in mark units rather than plate
 * ones so it stays correct at every scale the mark is drawn at.
 */
const INK_CENTRE = 53.1;
const OPTICAL_LIFT = 1.1;
const LIFT = INK_CENTRE - 50 + OPTICAL_LIFT;

/**
 * The mark's own bounds, for lockups where it stands alone.
 *
 * Identical to VIEW_BOX in src/components/Mark.tsx, and it has to stay
 * that way: the splash image is drawn through this box and SplashCurtain
 * draws the same mark through that one, one on top of the other at the
 * hand-off. Two percent apart — which is what 92 against 94 came to —
 * is not a mismatch anybody could name, but it is a visible twitch at
 * the exact moment the app is supposed to be seamless.
 */
const TIGHT = '4 6 94 94';

/**
 * The mark in a 100×100 box. `scale` shrinks it about its centre.
 *
 * `lift` is on by default — anything that centres the mark in a plate
 * wants it. The lockups pass false: there the mark is aligned to a line
 * of type, not to a box, and moving it up unsettles that instead.
 */
function mark({
  color = WHITE,
  knob = AMBER,
  shade = SHADE,
  scale = 1,
  lift = true,
} = {}) {
  const glyph =
    `<g transform="${layFlat(PLINTH_CY + PLINTH_DEPTH)}"><path d="${HEX}" fill="${shade}"/></g>` +
    `<g transform="${layFlat(PLINTH_CY)}"><path d="${HEX}" fill="${color}"/></g>` +
    `<path d="${SHAFT}" stroke="${color}" stroke-width="${SHAFT_WIDTH}" stroke-linecap="round"/>` +
    `<circle cx="50" cy="${BALL_CY}" r="${BALL_R}" fill="${knob}"/>`;
  const up = lift ? LIFT : 0;
  const body = up ? `<g transform="translate(0 ${-up})">${glyph}</g>` : glyph;
  if (scale === 1) return body;
  const shift = 50 * (1 - scale);
  return `<g transform="translate(${shift} ${shift}) scale(${scale})">${body}</g>`;
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

/**
 * The memory card, drawn at card scale.
 *
 * Sidequest's own object rather than a game's cover: twelve columns, one
 * per month, one block per game finished. It is the only image here the
 * app can use without borrowing a publisher's art for its marketing, and
 * it says what the product is about — a year, and what you saw the end
 * of — without a word.
 */
function memcard() {
  const cols = 12;
  const rows = 4;
  const cellW = 30;
  const cellH = 26;
  const gx = 40;
  const gy = 52;
  // A plausible year: quiet spring, a good autumn.
  const filled = [1, 0, 2, 1, 0, 1, 3, 2, 4, 2, 1, 3];

  let blocks = '';
  for (let month = 0; month < cols; month++) {
    for (let row = 0; row < rows; row++) {
      const on = row < filled[month];
      const x = gx + month * cellW;
      const y = gy + (rows - 1 - row) * cellH;
      blocks +=
        `<rect x="${x}" y="${y}" width="${cellW - 5}" height="${cellH - 5}" rx="3" ` +
        `fill="${on ? AMBER : 'rgba(255,255,255,0.07)'}"/>`;
    }
  }

  const w = gx * 2 + cols * cellW - 5;
  const h = gy + rows * cellH + 44;
  const cut = 26;
  // The notched corner every memory card has.
  const shell =
    `M14 0 H${w - cut} L${w} ${cut} V${h - 14} A14 14 0 0 1 ${w - 14} ${h} ` +
    `H14 A14 14 0 0 1 0 ${h - 14} V14 A14 14 0 0 1 14 0 Z`;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="${shell}" fill="${NAVY}" stroke="rgba(255,255,255,0.10)"/>
    ${blocks}
    <text x="${gx}" y="${h - 18}" font-family="Noah" font-weight="700"
          font-size="17" letter-spacing="2" fill="#7C8496">A YEAR OF FINISHING THINGS</text>
  </svg>`;
}

/**
 * The link-preview card: 1200×630, the size every crawler crops from.
 *
 * Built for the size it is actually seen at. In a timeline this is about
 * five hundred pixels wide, so the promise is set large enough to survive
 * the shrink and everything else gets out of its way. The old card set
 * that line at 44px and left the right-hand forty percent of the canvas
 * empty, which is a lot of nothing to publish under your own name.
 */
function ogCard() {
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Noah; font-weight: 900; src: url(data:font/ttf;base64,${FONT}); }
    @font-face { font-family: Noah; font-weight: 700; src: url(data:font/ttf;base64,${FONT_BOLD}); }
    @font-face { font-family: Noah; font-weight: 400; src: url(data:font/ttf;base64,${FONT_BODY}); }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; font-family: Noah, sans-serif;
           background:
             radial-gradient(1100px 620px at 88% 12%, rgba(242,169,59,0.10), transparent 60%),
             radial-gradient(900px 700px at 8% 96%, rgba(39,47,63,0.85), transparent 62%),
             ${DEEP};
           padding: 74px 78px; display: flex; align-items: center; gap: 56px; }
    /* Held short of the art so the sub-line does not orphan a word. */
    .copy { flex: 1; min-width: 0; max-width: 560px; }
    .lockup { display: flex; align-items: center; gap: 18px; margin-bottom: 40px; }
    .word { font-weight: 900; font-size: 40px; letter-spacing: 0.5px; color: ${WHITE}; }
    h1 { font-weight: 900; font-size: 66px; line-height: 1.04; letter-spacing: -1.6px;
         color: ${WHITE}; margin-bottom: 26px; }
    p { font-weight: 400; font-size: 27px; line-height: 1.35; color: ${GREY}; }
    .rule { width: 108px; height: 5px; border-radius: 3px; background: ${AMBER}; margin: 40px 0 22px; }
    .fine { font-weight: 400; font-size: 21px; color: #7C8496; }
    .art { flex: 0 0 auto; transform: rotate(-4deg); }
  </style>
  <div class="copy">
    <div class="lockup">
      <svg viewBox="${TIGHT}" width="52" height="52">${mark({ lift: false })}</svg>
      <div class="word">SIDEQUEST</div>
    </div>
    <h1>Know what you<br/>can actually finish.</h1>
    <p>Backlog triage for people with<br/>more games than time.</p>
    <div class="rule"></div>
    <div class="fine">No account. No tracking. It stays on your device.</div>
  </div>
  <div class="art">${memcard()}</div>`;
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

/**
 * The splash image: the mark alone, square, on nothing.
 *
 * Square and transparent because of what the platform does with it.
 * The modern splash API takes ONE image, centres it, and scales it to
 * `imageWidth` on a flat background colour — so the file has to be the
 * mark and only the mark. Shipped as a full 1284x2778 canvas, the whole
 * canvas was what got scaled to those 200 points: the mark inside it
 * was 28% of that width, and the app opened on a 56-point joystick
 * adrift in the middle of the screen.
 *
 * Everything else the splash wants to say — the wordmark, and the way
 * it hands over — belongs to SplashCurtain, which can lay out real type
 * and animate. This file only has to match that curtain's first frame.
 */
await shoot(
  `<!doctype html><meta charset="utf-8"><style>*{margin:0}` +
    `body{width:1024px;height:1024px}svg{display:block;width:1024px;height:1024px}</style>` +
    `<svg viewBox="${TIGHT}">${mark({ lift: false })}</svg>`,
  { width: 1024, height: 1024, out: 'splash.png', dir: ASSETS }
);

// The favicon and the native icons live in assets/, not public/.
writeFileSync(join(ROOT, 'assets/brand-mark.svg'), icon());
console.log('assets/brand-mark.svg');

await browser.close();
