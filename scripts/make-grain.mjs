/**
 * Draws the native grain tile: assets/images/grain.png and its @2x/@3x.
 *
 * Luminance noise, not a lightening dust: some specks lift the ground
 * and some press into it, so the surface reads as a material rather
 * than as a film of pale powder. Deterministic (seeded), so rerunning
 * the script reproduces the committed files byte for byte.
 *
 *   node scripts/make-grain.mjs
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

/** The tile's size in points; every density draws the same 150pt. */
const POINTS = 150;

/**
 * Share of pixels that carry a speck, and how hard each kind lands.
 *
 * A third softer than the first cut. On a phone at arm's length the
 * first read as sandpaper across the flat stretches of a page — grain
 * should be felt as a surface, not seen as a pattern.
 */
const LIGHT = { share: 0.2, alpha: [6, 12] };
const DARK = { share: 0.26, alpha: [9, 20] };
/** A rarer, brighter fleck — the dust that says the grain is physical. */
const FLECK = { share: 0.003, alpha: [24, 34] };

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One speck per `cell` device pixels, so the grain keeps a size in points. */
function draw(scale, cell, seed) {
  const size = POINTS * scale;
  const cells = size / cell;
  const rand = rng(seed);
  const png = new PNG({ width: size, height: size });
  const between = ([lo, hi]) => Math.round(lo + rand() * (hi - lo));
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const r = rand();
      let v = 0;
      let a = 0;
      if (r < FLECK.share) {
        v = 255;
        a = between(FLECK.alpha);
      } else if (r < FLECK.share + LIGHT.share) {
        v = 255;
        a = between(LIGHT.alpha);
      } else if (r < FLECK.share + LIGHT.share + DARK.share) {
        v = 0;
        a = between(DARK.alpha);
      }
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const i = ((cy * cell + y) * size + (cx * cell + x)) * 4;
          png.data[i] = v;
          png.data[i + 1] = v;
          png.data[i + 2] = v;
          png.data[i + 3] = a;
        }
      }
    }
  }
  return PNG.sync.write(png, { colorType: 6 });
}

const out = 'assets/images/grain';
writeFileSync(`${out}.png`, draw(1, 1, 7));
writeFileSync(`${out}@2x.png`, draw(2, 1, 7));
// At 3x a one-pixel speck is a third of a point and vanishes; two
// device pixels keeps the grain at the size it is on every other screen.
writeFileSync(`${out}@3x.png`, draw(3, 2, 7));
