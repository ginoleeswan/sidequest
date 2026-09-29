/**
 * Draws the lamplight: assets/images/lamp.png.
 *
 * The light at the top of every native page used to be SVG radial
 * gradients,
 * which iOS paints on the main thread every time a page mounts: during
 * the splash, during every push. As a picture it is decoded once and
 * stretched by the GPU. Drawn small (it is nothing but soft gradient),
 * with a whisper of noise so eight-bit steps in so faint a ramp cannot
 * band. Deterministic, so rerunning reproduces the committed file.
 *
 *   node scripts/make-lamp.mjs
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

// The box it is stretched over: a phone's width by LAMP_REACH, halved.
const W = 196;
const H = 230;

/**
 * One light, not two. The first cut was an amber pool from the left
 * and a violet one from the right, and on a phone the seam where their
 * hues met read as a vertical stripe down the top of every page, with
 * the amber going grey where it thinned over the navy. A single warm-
 * white pool from above has no seam to show: the page is simply lit
 * from over the reader's shoulder, brighter at the top, gone by the fold.
 */
const LIGHT = [255, 236, 208];

let seed = 11;
const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32 - 0.5;

const png = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Smoothstep falloff, so the edge of the light has no ring.
    const t = Math.min(
      1,
      Math.hypot((x / W - 0.5) / 0.95, (y / H + 0.12) / 1.05)
    );
    const a = 0.055 * (1 - t * t * (3 - 2 * t));
    const i = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) png.data[i + k] = LIGHT[k];
    png.data[i + 3] = Math.max(0, Math.min(255, Math.round(a * 255 + rand())));
  }
}
writeFileSync('assets/images/lamp.png', PNG.sync.write(png));
