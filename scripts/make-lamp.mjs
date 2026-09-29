/**
 * Draws the lamplight: assets/images/lamp.png.
 *
 * The two pools of light at the top of every native page — amber from
 * the left, violet from the right — used to be SVG radial gradients,
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

const AMBER = [242, 169, 59];
const VIOLET = [157, 143, 255];

/** An elliptical pool: centre and radii as fractions of the box. */
function pool(x, y, cx, cy, rx, ry, stops) {
  const d = Math.hypot((x / W - cx) / rx, (y / H - cy) / ry);
  for (let i = 1; i < stops.length; i++) {
    const [o0, a0] = stops[i - 1];
    const [o1, a1] = stops[i];
    if (d <= o1) return a0 + ((a1 - a0) * (d - o0)) / (o1 - o0);
  }
  return 0;
}

let seed = 11;
const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32 - 0.5;

const png = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const amber = pool(x, y, 0.12, 0, 0.8, 0.95, [
      [0, 0.085],
      [0.55, 0.025],
      [1, 0],
    ]);
    const violet = pool(x, y, 1, 0.08, 0.7, 0.8, [
      [0, 0.07],
      [1, 0],
    ]);
    // Amber laid over violet, as the SVG drew them.
    const a = amber + violet * (1 - amber);
    const i = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) {
      const c =
        a > 0 ? (AMBER[k] * amber + VIOLET[k] * violet * (1 - amber)) / a : 0;
      png.data[i + k] = Math.round(c);
    }
    png.data[i + 3] = Math.max(0, Math.min(255, Math.round(a * 255 + rand())));
  }
}
writeFileSync('assets/images/lamp.png', PNG.sync.write(png));
