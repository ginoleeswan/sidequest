import { CARD_HEIGHT, CARD_WIDTH, memcardSvg } from '../memcardSvg';
import type { Memcard, MemcardBlock } from '../memcard';

/**
 * The card as a public artefact.
 *
 * This string becomes the image people post under their own name, so
 * the things worth pinning are the ones that would embarrass them: a
 * game title that breaks the document, a month that lands in the wrong
 * column, a half-built card shipped as if it were finished.
 */

const block = (over: Partial<MemcardBlock> = {}): MemcardBlock => ({
  id: 1,
  name: 'Hollow Knight',
  hours: 27,
  month: 2,
  ...over,
});

const card = (over: Partial<Memcard> = {}): Memcard => ({
  year: 2026,
  count: 1,
  hours: 27,
  blocks: [block()],
  longest: block(),
  headline: 'One game, seen through',
  subhead: 'Twenty-seven hours of evenings',
  ...over,
});

describe('memcardSvg', () => {
  it('is a whole document at the size every preview crops to', () => {
    const svg = memcardSvg(card());
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain(`width="${CARD_WIDTH}" height="${CARD_HEIGHT}"`);
  });

  it('escapes every character that could break the document', () => {
    const nasty = 'Sam & Max <3 "quoted" ’s';
    const svg = memcardSvg(
      card({
        headline: nasty,
        blocks: [block({ name: nasty })],
        longest: block({ name: nasty }),
      })
    );
    // The raw ampersand and angle bracket must not survive anywhere.
    expect(svg).not.toContain('Sam & Max');
    expect(svg).not.toContain('<3');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&lt;3');
  });

  it('says the year, the headline and the subhead as given', () => {
    const svg = memcardSvg(card());
    expect(svg).toContain('2026');
    expect(svg).toContain('One game, seen through');
    expect(svg).toContain('Twenty-seven hours of evenings');
  });

  it('brags about the longest finish, rounded — nobody brags in decimals', () => {
    const svg = memcardSvg(
      card({ longest: block({ name: 'Persona 5', hours: 102.4 }) })
    );
    expect(svg).toContain('Longest: Persona 5 · 102h');
  });

  it('an empty year says the thing that keeps somebody going', () => {
    const svg = memcardSvg(
      card({ count: 0, hours: 0, blocks: [], longest: null })
    );
    expect(svg).toContain('Every game you see the end of counts');
  });

  it('stamps a finished card, and never a half-built one', () => {
    const full = memcardSvg(card());
    const building = memcardSvg(card(), { progress: 0.4 });
    expect(full.length).toBeGreaterThan(building.length);
    // An empty year has nothing to stamp either, however finished it is.
    const empty = memcardSvg(card({ count: 0, blocks: [], longest: null }));
    expect(empty.length).toBeLessThan(full.length);
  });

  it('embeds the typeface only when the caller is exporting', () => {
    const onScreen = memcardSvg(card());
    expect(onScreen).not.toContain('@font-face');
    const exported = memcardSvg(card(), {
      fontCss: "@font-face{font-family:'Geom-Bold';}",
    });
    expect(exported).toContain('@font-face');
    expect(exported).toContain('<defs>');
  });

  it('names the games it has room for, and stops there', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      block({ id: i, name: `Game Number ${i}`, month: i % 12 })
    );
    const svg = memcardSvg(card({ count: 20, blocks: many, longest: many[0] }));
    const named = many.filter((b) => svg.includes(`Game Number ${b.id}`));
    // A card, not a list: the cut-off is the design.
    expect(named.length).toBeGreaterThan(0);
    expect(named.length).toBeLessThan(many.length);
  });

  it('builds left to right, so a partial card is missing its later months', () => {
    const spread = [
      block({ id: 1, name: 'Early One', month: 0 }),
      block({ id: 2, name: 'Late One', month: 11 }),
    ];
    const early = memcardSvg(
      card({ count: 2, blocks: spread, longest: spread[0] }),
      { progress: 0.2 }
    );
    expect(early).toContain('Early One');
    expect(early).not.toContain('Late One');
  });
});
