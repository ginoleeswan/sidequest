import { buildStage, MAX_SLIDES, type StageInput } from '../stage';
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
    expect(slides[0].title).toBe('Finish Hades');
    expect(slides[0].detail).toContain('3h left');
    expect(slides[0].action).toBe('Finish it');
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

  it('puts the date on whichever reason leads', () => {
    const [slide] = buildStage(
      input({ fresh: [game(2, 'Brand New')], dateLabel: 'Thursday, 20 August' })
    );
    expect(slide.eyebrow).toBe('Thursday, 20 August · Out this week');
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
    expect(slide.detail).not.toContain('0h');
    expect(slide.detail).toContain('just landed');
  });
});
