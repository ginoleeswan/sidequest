import { render, screen } from '@testing-library/react-native';

import { PlatformIcons } from '../PlatformIcons';
import type { PlatformRef } from '@/api/types';

const refs = (...slugs: string[]): PlatformRef[] =>
  slugs.map(
    (slug, i) => ({ platform: { id: i + 1, slug, name: slug } }) as PlatformRef
  );

/**
 * Counted from the rendered tree, because a platform icon arrives three
 * different ways: extracted logo paths draw an SVG, Ionicons draw a font
 * glyph as text, and the retro platforms are PNGs. All three are "an
 * icon appeared" as far as this component's job is concerned.
 */
function drawn() {
  const counts = { paths: 0, glyphs: 0, images: 0 };
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; children?: unknown[] };
    if (n.type === 'RNSVGSvgView') counts.paths += 1;
    else if (n.type === 'Text') counts.glyphs += 1;
    else if (n.type?.includes('ExpoImage')) counts.images += 1;
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return { ...counts, total: counts.paths + counts.glyphs + counts.images };
}

describe('PlatformIcons', () => {
  it('draws one icon per platform it knows', async () => {
    await render(
      <PlatformIcons platforms={refs('pc', 'playstation', 'xbox')} />
    );
    expect(drawn().total).toBe(3);
  });

  /**
   * RAWG slugs are versioned — "playstation5", "xbox-one" — so the map is
   * matched by prefix. If that became an exact match, most real platforms
   * would silently stop drawing.
   */
  it('matches versioned slugs by prefix', async () => {
    await render(
      <PlatformIcons platforms={refs('playstation5', 'xbox-one', 'macos')} />
    );
    expect(drawn().total).toBe(3);
  });

  it('skips a platform it has no icon for', async () => {
    await render(<PlatformIcons platforms={refs('pc', 'some-new-console')} />);
    expect(drawn().total).toBe(1);
  });

  it('draws nothing for an empty list', async () => {
    await render(<PlatformIcons platforms={[]} />);
    expect(drawn().total).toBe(0);
  });

  it('draws the retro platforms from images, not glyphs', async () => {
    await render(<PlatformIcons platforms={refs('nintendo', 'sega', '3do')} />);
    expect(drawn()).toMatchObject({ images: 3, paths: 0, glyphs: 0 });
  });

  it('mixes image-backed and vector platforms in one row', async () => {
    await render(<PlatformIcons platforms={refs('pc', 'nintendo', 'linux')} />);
    expect(drawn()).toMatchObject({ images: 1, total: 3 });
  });
});
