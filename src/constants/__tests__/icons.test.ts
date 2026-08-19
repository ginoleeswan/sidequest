import IoniconsGlyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

import { DISCOVER, GENRES, HOME_SHELVES, SEARCH_SECTION } from '../categories';
import { GLYPH_NAMES } from '@/components/Glyph';

/**
 * Icon names are strings, and a wrong one fails silently — the glyph
 * simply does not draw. Nothing in the type system catches it, and it
 * survives every other test in the suite, so it needs its own.
 *
 * This exists because these names were rewritten wholesale: five
 * MaterialCommunity icons became Ionicons when those fonts were dropped,
 * and two more moved off FontAwesome. Any of those could have been a
 * name that does not exist in the family it moved to.
 */
const ionicons = IoniconsGlyphs as Record<string, number>;

const sections = [...DISCOVER, ...GENRES, ...HOME_SHELVES, SEARCH_SECTION];

describe('section icons', () => {
  it('covers every section the app renders', () => {
    expect(sections.length).toBeGreaterThan(10);
  });

  it.each(sections.map((s) => [s.title ?? 'search', s.iconName, s.iconType]))(
    '%s uses a glyph that exists (%s)',
    (_title, name, type) => {
      const known = type === 'glyph' ? GLYPH_NAMES : Object.keys(ionicons);
      expect(known).toContain(name);
    }
  );

  it('only names families the app still bundles', () => {
    for (const section of sections) {
      expect(['ionicon', 'glyph']).toContain(section.iconType);
    }
  });
});
