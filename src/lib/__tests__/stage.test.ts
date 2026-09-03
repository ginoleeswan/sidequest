import {
  buildStage,
  MAX_SLIDES,
  STAGE_BOUNDS,
  stageHeight,
  type StageInput,
  pickTrailer,
} from '../stage';
import type { Game } from '@/api/types';

const game = (id: number, name: string, playtime = 0): Game =>
  ({ id, name, playtime, background_image: null }) as unknown as Game;

const input = (over: Partial<StageInput> = {}): StageInput => ({
  tonight: null,
  fresh: [],
  short: [],
  trending: [],
  outToday: 0,
  dateLabel: '',
  ...over,
});

describe('buildStage', () => {
  it('leads with what the library says, over anything a storefront knows', () => {
    const slides = buildStage(
      input({
        tonight: {
          game: game(1, 'Hades'),
          hours: 3,
          verb: 'Finish',
          reason: 'You could see the credits before bed.',
        },
        fresh: [game(2, 'Brand New')],
        trending: [game(3, 'Everyone Is Playing This')],
      })
    );
    expect(slides[0].kind).toBe('tonight');
    // The name, not "Finish Hades". The verb is on the button, and a
    // headline that repeats it spends the largest type on the page
    // saying what the smallest already said.
    expect(slides[0].title).toBe('Hades');
    expect(slides[0].figure).toBe('3h left');
    expect(slides[0].action).toBe('Finish it');
  });

  it('carries how far through, so the stage can draw it', () => {
    const [slide] = buildStage(
      input({
        tonight: {
          game: game(1, 'Hades'),
          hours: 3,
          verb: 'Continue',
          reason: 'Already under way — chip away at it.',
          progress: 0.88,
        },
      })
    );
    expect(slide.progress).toBe(0.88);
  });

  it('leaves the bar off a game nobody has started', () => {
    const [slide] = buildStage(
      input({
        tonight: {
          game: game(1, 'Hades'),
          hours: 3,
          verb: 'Start',
          reason: 'The shortest thing you’ve saved.',
        },
      })
    );
    expect(slide.progress).toBeUndefined();
  });

  it('says how many games landed today, not just that some did', () => {
    const [slide] = buildStage(
      input({ fresh: [game(2, 'Brand New')], outToday: 3 })
    );
    expect(slide.eyebrow).toBe('3 games out today');
  });

  it('does not pluralise a single release', () => {
    const [slide] = buildStage(
      input({ fresh: [game(2, 'Brand New')], outToday: 1 })
    );
    expect(slide.eyebrow).toBe('1 game out today');
  });

  it('falls back to the week when nothing came out today', () => {
    const [slide] = buildStage(input({ fresh: [game(2, 'Brand New')] }));
    expect(slide.eyebrow).toBe('Out this week');
  });

  /**
   * Beside the reason, not welded in front of it. Concatenated, the
   * lead slide's eyebrow read "THURSDAY, SEPTEMBER 3 · TONIGHT" — the
   * proof-of-freshness in front of the one word that says why the game
   * is on the screen, and both in the same tracked caps.
   */
  it('puts the date on whichever reason leads, as its own line', () => {
    const [slide] = buildStage(
      input({ fresh: [game(2, 'Brand New')], dateLabel: 'Thu 20 Aug' })
    );
    expect(slide.eyebrow).toBe('Out this week');
    expect(slide.date).toBe('Thu 20 Aug');
  });

  it('leaves the date off the slides behind the first', () => {
    const slides = buildStage(
      input({
        fresh: [game(2, 'Brand New')],
        short: [game(3, 'Quick One', 4)],
        dateLabel: 'Thu 20 Aug',
      })
    );
    expect(slides[1].date).toBeUndefined();
  });

  it('never shows the same game twice in one stage', () => {
    const shared = game(7, 'Both Fresh And Short', 4);
    const slides = buildStage(
      input({ fresh: [shared], short: [shared], trending: [shared] })
    );
    expect(slides).toHaveLength(1);
  });

  /**
   * "Popular" is the weakest reason there is. It exists so the stage is
   * never empty, not as a slide that elbows in beside a real one.
   */
  it('only reaches for trending when nothing else has anything to say', () => {
    const withReason = buildStage(
      input({ fresh: [game(2, 'Brand New')], trending: [game(3, 'Popular')] })
    );
    expect(withReason.map((s) => s.kind)).toEqual(['fresh']);

    const bare = buildStage(
      input({
        trending: [game(3, 'Popular'), game(4, 'Also'), game(5, 'And')],
      })
    );
    expect(bare.map((s) => s.kind)).toEqual([
      'trending',
      'trending',
      'trending',
    ]);
  });

  it('stays empty when there is genuinely nothing to show', () => {
    expect(buildStage(input())).toEqual([]);
  });

  it('never runs longer than the cap', () => {
    const many = Array.from({ length: 9 }, (_, i) => game(i + 1, `G${i}`, 4));
    const slides = buildStage(
      input({ fresh: many, short: many, trending: many })
    );
    expect(slides.length).toBeLessThanOrEqual(MAX_SLIDES);
  });

  it('leaves the length out rather than claiming a game takes zero hours', () => {
    const [slide] = buildStage(
      input({ fresh: [game(2, 'Unknown Length', 0)] })
    );
    expect(slide.figure).toBe('');
    expect(slide.detail).not.toContain('0h');
    expect(slide.detail).toContain('just landed');
  });
});

/**
 * The loading skeleton has to occupy the pixels the stage will, and it
 * used to carry its own hard-coded number. The two drifted 117px apart
 * the moment this one changed, so they share a function now — and the
 * web bones express the same bounds as a CSS clamp, which is why the
 * bounds are exported rather than inlined.
 */
describe('stageHeight', () => {
  it('gives a phone three fifths of its window', () => {
    expect(stageHeight(844, false)).toBe(506);
  });

  it('floors on a short window rather than collapsing', () => {
    expect(stageHeight(400, false)).toBe(STAGE_BOUNDS.min);
  });

  it('caps on a tall one rather than becoming a billboard', () => {
    expect(stageHeight(2000, false)).toBe(STAGE_BOUNDS.max);
  });

  /**
   * The two shapes have swapped, and for a reason worth stating.
   *
   * The phone's stage used to be the taller of the two, because the
   * picture WAS the stage there: edge to edge, with the copy laid
   * across its bottom third. It is a picture band plus a block of copy
   * on the page's own ground now, so it needs less of the window than
   * a desk whose masthead still carries its words on the artwork.
   */
  it('gives the desk the taller stage, since its words sit on the art', () => {
    // 0.62 of a 900px window: a masthead near the 16:7 the streaming
    // apps use, and the first shelf's header still above the fold.
    expect(stageHeight(900, true)).toBe(558);
    expect(stageHeight(900, true)).toBeGreaterThan(stageHeight(900, false));
  });

  it('still floors on a short laptop window', () => {
    expect(stageHeight(500, true)).toBe(STAGE_BOUNDS.expandedMin);
  });

  /**
   * The compact bones are a CSS clamp built from exactly these three;
   * drift here is drift there, and nothing in JavaScript would catch it.
   */
  it('keeps the bounds the CSS clamp is written from', () => {
    const { min, max, ratio } = STAGE_BOUNDS;
    expect({ min, max, ratio }).toEqual({ min: 420, max: 620, ratio: 0.6 });
  });
});

/**
 * The stage's trailer is the game's, not its first expansion's.
 */
describe('pickTrailer', () => {
  const movie = (name: string) => ({ id: name, name });

  it('prefers the trailer that carries the game’s own name', () => {
    const picked = pickTrailer(
      [
        movie('GTA Online: Heists Trailer'),
        movie('Grand Theft Auto V Trailer'),
      ],
      'Grand Theft Auto V'
    );
    expect(picked?.name).toBe('Grand Theft Auto V Trailer');
  });

  it('skips expansions and updates when nothing is named for the game', () => {
    const picked = pickTrailer(
      [movie('Season 4 Update'), movie('Launch Trailer'), movie('DLC Pack 2')],
      'Some Game'
    );
    expect(picked?.name).toBe('Launch Trailer');
  });

  it('falls back to the first when every trailer is an expansion', () => {
    const picked = pickTrailer(
      [movie('GTA Online: Smuggler’s Run'), movie('GTA Online: Gunrunning')],
      'Grand Theft Auto V'
    );
    expect(picked?.name).toBe('GTA Online: Smuggler’s Run');
  });

  it('has nothing to pick from an empty list', () => {
    expect(pickTrailer([], 'Anything')).toBeNull();
  });
});
