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
 *
 * 0.72, down from 0.84. The mark was running to within a few percent of
 * the plate on every side, which reads as cramped beside the icons it
 * actually sits next to on a home screen — Apple's own grid leaves a
 * glyph closer to two thirds of the tile than five sixths. The margin
 * is the design, not wasted space.
 */
function icon({ maskable = false } = {}) {
  const plate = maskable
    ? `<rect width="100" height="100" fill="${NAVY}"/>`
    : `<rect width="100" height="100" rx="22" fill="${NAVY}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${plate}${mark({ scale: maskable ? 0.66 : 0.72 })}</svg>`;
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
 * The splash image: the mark, and the wordmark under it.
 *
 * The platform gives you ONE image. It centres that image and scales it
 * to `imageWidth` on a flat colour — there is no second layer and no way
 * to anchor anything to the foot of the screen, so a wordmark on this
 * screen has to be part of the same picture as the mark.
 *
 * Which means the canvas has to stay tight around the artwork. Shipped
 * once as a full 1284x2778 phone-shaped canvas, the whole canvas was
 * what got scaled to those 200 points: the mark inside it came out at
 * 28% of that width, and the app opened on a 56-point joystick adrift
 * in the middle of the screen. The canvas is the artwork. Empty space
 * in the file is empty space you paid for.
 *
 * So this is a lockup rather than a screen: the mark at its full width,
 * a measured gap, then SIDEQUEST at the same letterspacing SplashCurtain
 * uses. It sits higher than the curtain's wordmark, which lives at 11%
 * off the bottom — nothing can put it there in a centred image — and the
 * curtain's first frame animates from here rather than popping the word
 * in from nothing, which was the whole complaint.
 */
/**
 * The splash lockup, positioned from the screen's centre.
 *
 * The iOS storyboard centres this image and scales it to `imageWidth`.
 * That is the whole API: no bottom anchor, no second layer. So a
 * wordmark cannot be pinned a fixed percentage off the foot of the
 * screen — that distance from the centre depends on how tall the device
 * is, and one image cannot be right for all of them.
 *
 * What IS device-independent is the centre. This file and SplashCurtain
 * both lay out as offsets from it, in points, so the static image and
 * the curtain's first frame land on the same pixels everywhere.
 *
 * The subtlety that bit once: everything in this file scales together,
 * because the platform scales the FILE. Shrinking the mark from 180pt
 * to 130 also shrank the wordmark by 28%, since its size was expressed
 * in the mark's units. The two are decoupled here by sizing the canvas
 * for the type and deriving `imageWidth` from the mark instead — so the
 * wordmark stays at the 17pt SplashCurtain draws, whatever the mark does.
 *
 * SPLASH_MARK_PT is mirrored as MARK in SplashCurtain.tsx, and
 * SPLASH_IMAGE_WIDTH must equal app.json's imageWidth. All three, or the
 * hand-off jumps.
 */
// The 94-unit BOX, matching Mark.tsx's `size` prop — not the visible
// glyph, which is ~77% of it because the plinth does not fill the box.
// 145 here is the 112pt joystick the composition was chosen at.
const SPLASH_MARK_PT = 145;
const WORD_PT = 20; // matches SplashCurtain's wordmark
const TRACK_PT = 7; // matches its letterSpacing
const MARK_RISE_PT = 70; // mark centre, above screen centre
/**
 * Low, and deliberately not derived from the foot.
 *
 * SplashCurtain pins its wordmark 11% off the bottom, which is a
 * fraction of the screen and therefore a different number of points on
 * every device. A centred image cannot express that. 300 puts it at
 * roughly 85% on a phone, which reads as "at the foot" there and drifts
 * to 73% on an iPad and 95% on an SE. That drift is the accepted cost
 * of this composition, not an oversight.
 */
const WORD_DROP_PT = 300;

// The mark is 94 units wide by construction, and that must come out at
// SPLASH_MARK_PT — which fixes the scale for everything else.
const PT_PER_UNIT = SPLASH_MARK_PT / 94;
// Wide enough for the type at full size. SIDEQUEST at 17pt tracked 6pt
// is wider than the mark, and a viewBox clips rather than shrinking to
// fit: set too narrow once, it shipped a splash reading IDEQUES1.
const VB_W = 124;
const SPLASH_IMAGE_WIDTH = Math.round(VB_W * PT_PER_UNIT);

// 50, not 51. The viewBox the mark is normally drawn in starts at x=4,
// which invites the assumption that its centre is 51 — but the glyph
// itself is built around x=50: the plinth spans 13.63..86.37 and the
// ball sits at cx=50. Centring the box is not centring the mark, and
// the one-unit difference showed up as 11px of drift in the file.
const MARK_CENTRE_X = 50;
const MARK_CENTRE_Y = 53;
const riseU = MARK_RISE_PT / PT_PER_UNIT;
const dropU = WORD_DROP_PT / PT_PER_UNIT;
const centreY = MARK_CENTRE_Y + riseU;
const wordY = centreY + dropU;
const halfH = Math.max(centreY - 6, wordY + 10 - centreY);
const vbX = MARK_CENTRE_X - VB_W / 2;
const vbY = centreY - halfH;
const vbH = halfH * 2;
const SPLASH_PX_W = 1400;
const SPLASH_PX_H = Math.round((SPLASH_PX_W * vbH) / VB_W);

await shoot(
  `<!doctype html><meta charset="utf-8"><style>*{margin:0}` +
    `@font-face { font-family: Noah; font-weight: 900; src: url(data:font/ttf;base64,${FONT}); }` +
    `body{width:${SPLASH_PX_W}px;height:${SPLASH_PX_H}px}` +
    `svg{display:block;width:${SPLASH_PX_W}px;height:${SPLASH_PX_H}px}</style>` +
    `<svg viewBox="${vbX} ${vbY} ${VB_W} ${vbH}">` +
    `${mark({ lift: false })}` +
    /**
     * The x nudge is measured, not derived. `text-anchor="middle"`
     * centres the full advance width, which includes the letter-space
     * trailing the final T, and Noah's side bearings are not symmetric
     * either — together they left the word visibly off centre. Verify
     * with the pixel bbox check, not by eye.
     */
    `<text x="${MARK_CENTRE_X + TRACK_PT / PT_PER_UNIT / 2}" y="${wordY}"` +
    ` font-family="Noah" font-weight="900"` +
    ` font-size="${WORD_PT / PT_PER_UNIT}" letter-spacing="${TRACK_PT / PT_PER_UNIT}"` +
    ` fill="${WHITE}" text-anchor="middle" dominant-baseline="middle">SIDEQUEST</text>` +
    `</svg>`,
  { width: SPLASH_PX_W, height: SPLASH_PX_H, out: 'splash.png', dir: ASSETS }
);
console.log(`splash: mark ${SPLASH_MARK_PT}pt, set app.json imageWidth = ${SPLASH_IMAGE_WIDTH}`);

/**
 * The Android notification icon: the mark as a flat white silhouette.
 *
 * Android does not draw this file. It reads the alpha channel and paints
 * the result in the accent colour, discarding every colour in the source
 * — so an ordinary icon here arrives as a solid white blob the shape of
 * its own background plate, which is what happens to every app that
 * hands it the launcher icon by mistake. One colour, no plate, no
 * shading, and the transparency doing all the drawing.
 *
 * 96px is the largest density bucket (xxxhdpi wants 96); Android scales
 * down cleanly and never up.
 */
await shoot(
  `<!doctype html><meta charset="utf-8"><style>*{margin:0}` +
    `body{width:96px;height:96px}svg{display:block;width:96px;height:96px}</style>` +
    `<svg viewBox="${TIGHT}">${mark({
      color: WHITE,
      knob: WHITE,
      shade: WHITE,
      lift: false,
    })}</svg>`,
  { width: 96, height: 96, out: 'notification-icon.png', dir: ASSETS }
);

// The favicon and the native icons live in assets/, not public/.
writeFileSync(join(ROOT, 'assets/brand-mark.svg'), icon());
console.log('assets/brand-mark.svg');

await browser.close();
