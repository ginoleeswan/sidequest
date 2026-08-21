import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import IoniconsGlyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

import { SUBSET_ICONS } from '../iconSubset';

/**
 * The app ships a cut-down Ionicons — a few dozen glyphs out of ~1,300,
 * 9 KB instead of 381. The cut is generated from the source by
 * scripts/subset-icons.mjs, so the danger is not the subset being wrong
 * but the source moving on: name a new icon, forget to regenerate, and
 * it renders as a blank box for everyone.
 *
 * The browser-side proof that the glyphs actually draw lives in
 * e2e/icons.mjs. This is the fast half: does the shipped list still
 * cover what the code asks for?
 */
const ionicons = IoniconsGlyphs as Record<string, number>;
const SRC = join(__dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/**
 * Quoted words that are Ionicons names and are not icons.
 *
 * The scan is deliberately blunt — any quoted lowercase word that
 * matches a glyph name counts — because a false positive costs one
 * unused glyph and a false negative ships a blank box. That trade is
 * right, but the glyph map is a thousand ordinary English words, so it
 * collides with the rest of the platform's vocabulary: "resize" is a
 * DOM event, "radio" is an ARIA role. The honest fix is to name the
 * collisions rather than to ship glyphs nothing draws, or to contort
 * the source around a regex in a test.
 *
 * Add to this only for a word the app genuinely never draws as an icon.
 */
const NOT_ICONS = new Set(['resize', 'radio']);

const used = new Set<string>();
for (const file of sources(SRC)) {
  for (const [, name] of readFileSync(file, 'utf8').matchAll(
    /['"`]([a-z][a-z0-9-]{2,})['"`]/g
  )) {
    if (name in ionicons && !NOT_ICONS.has(name)) used.add(name);
  }
}

describe('the Ionicons subset', () => {
  it('finds the icons the app names', () => {
    expect(used.size).toBeGreaterThan(30);
  });

  it('carries every one of them', () => {
    const missing = [...used].filter(
      (name) => !(SUBSET_ICONS as readonly string[]).includes(name)
    );
    expect(missing).toEqual([]);
  });

  it('carries nothing the app does not name', () => {
    // Not waste for its own sake: an entry here that the source no
    // longer uses means the list was hand-edited rather than generated.
    const stale = SUBSET_ICONS.filter((name) => !used.has(name));
    expect(stale).toEqual([]);
  });
});
