import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';
import {
  becauseYouSaved,
  dayNumber,
  feedSeed,
  likeYouFinish,
  pickShelves,
  withinLength,
  withoutOwned,
  dedupeGames,
} from '../homeFeed';
import type { LibraryEntry } from '../library';

const game = (id: number, over: Partial<Game> = {}) =>
  ({ id, name: `Game ${id}`, playtime: 10, ...over }) as Game;

const entry = (
  id: number,
  over: Partial<LibraryEntry> & { genre?: string; hours?: number } = {}
): LibraryEntry => ({
  game: game(id, {
    name: over.game?.name ?? `Game ${id}`,
    playtime: over.hours ?? 10,
    genres: over.genre
      ? [{ id: 1, name: over.genre, slug: over.genre.toLowerCase() }]
      : undefined,
  }),
  status: over.status ?? 'wishlist',
  addedAt: over.addedAt ?? id,
  finishedAt: over.finishedAt,
});

const pool = (n: number): Section[] =>
  Array.from({ length: n }, (_, i) => ({ key: `s${i}` }) as Section);

/**
 * The page has to be different tomorrow and the same all day. Those two
 * pull in opposite directions, and everything here is about holding
 * both.
 */
describe('the daily rotation', () => {
  /**
   * Local times, not UTC, because the thing under test is deliberately
   * local: `dayNumber` reads the calendar date off the runner's own
   * clock, so the shelves turn over at the READER's midnight rather
   * than at Greenwich's. Feeding it `Date.UTC(...)` asserted that 23:00
   * UTC is the same day as 09:00 UTC, which is only true for a machine
   * sitting on UTC — green on CI, red on any developer east or west of
   * it. Measured at UTC+2: 23:00Z is already the 21st locally, so
   * `dayNumber` returned 20685 and 20686 and the suite failed on a
   * correctly behaving app.
   */
  const morning = new Date(2026, 7, 20, 9).getTime();
  const evening = new Date(2026, 7, 20, 23).getTime();
  const tomorrow = new Date(2026, 7, 21, 9).getTime();

  it('is one number for a whole day', () => {
    expect(dayNumber(morning)).toBe(dayNumber(evening));
    expect(dayNumber(tomorrow)).toBe(dayNumber(morning) + 1);
  });

  it('gives the same shelves all day and different ones tomorrow', () => {
    const today = pickShelves(pool(10), 4, feedSeed(morning, []));
    const later = pickShelves(pool(10), 4, feedSeed(evening, []));
    const next = pickShelves(pool(10), 4, feedSeed(tomorrow, []));
    expect(later.map((s) => s.key)).toEqual(today.map((s) => s.key));
    expect(next.map((s) => s.key)).not.toEqual(today.map((s) => s.key));
  });

  it('gives two people different pages on the same day', () => {
    const mine = pickShelves(pool(10), 4, feedSeed(morning, [entry(1)]));
    const yours = pickShelves(pool(10), 4, feedSeed(morning, [entry(99)]));
    expect(mine.map((s) => s.key)).not.toEqual(yours.map((s) => s.key));
  });

  it('never repeats a shelf within a day', () => {
    const picked = pickShelves(pool(10), 6, feedSeed(morning, []));
    expect(new Set(picked.map((s) => s.key)).size).toBe(6);
  });

  it('asks for more than it has without breaking', () => {
    expect(pickShelves(pool(3), 8, 1)).toHaveLength(3);
    expect(pickShelves([], 4, 1)).toEqual([]);
  });
});

describe('leaving out what you already have', () => {
  it('drops saved games from a shelf', () => {
    const shown = withoutOwned([game(1), game(2), game(3)], [entry(2)]);
    expect(shown.map((g) => g.id)).toEqual([1, 3]);
  });

  it('leaves an empty library alone, cheaply', () => {
    const games = [game(1), game(2)];
    expect(withoutOwned(games, [])).toBe(games);
  });
});

describe('because you saved it', () => {
  it('takes the genre of the most recent save, not the most common', () => {
    const shelf = becauseYouSaved([
      entry(1, { genre: 'RPG', addedAt: 1 }),
      entry(2, { genre: 'RPG', addedAt: 2 }),
      entry(3, { genre: 'Puzzle', addedAt: 3 }),
    ]);
    expect(shelf?.genre).toBe('puzzle');
    expect(shelf?.title).toMatch(/More puzzle/);
  });

  it('ignores what is already finished — that is history, not mood', () => {
    const shelf = becauseYouSaved([
      entry(1, { genre: 'RPG', addedAt: 1 }),
      entry(2, { genre: 'Puzzle', addedAt: 9, status: 'finished' }),
    ]);
    expect(shelf?.genre).toBe('rpg');
  });

  it('says nothing when nothing saved has a genre', () => {
    expect(becauseYouSaved([entry(1)])).toBeNull();
    expect(becauseYouSaved([])).toBeNull();
  });
});

describe('the length you actually finish', () => {
  const hoursOf = (e: LibraryEntry) => e.game.playtime ?? 0;

  it('waits for a habit rather than a coincidence', () => {
    const two = [
      entry(1, { status: 'finished', hours: 8 }),
      entry(2, { status: 'finished', hours: 10 }),
    ];
    expect(likeYouFinish(two, hoursOf)).toBeNull();
  });

  it('builds a window around the median of what was finished', () => {
    const shelf = likeYouFinish(
      [
        entry(1, { status: 'finished', hours: 8 }),
        entry(2, { status: 'finished', hours: 10 }),
        entry(3, { status: 'finished', hours: 12 }),
        entry(4, { status: 'wishlist', hours: 90 }),
      ],
      hoursOf
    );
    expect(shelf?.window).toEqual({ min: 7, max: 13 });
    expect(shelf?.title).toMatch(/Around 10 hours/);
  });

  it('ignores finished games nobody has a length for', () => {
    const shelf = likeYouFinish(
      [
        entry(1, { status: 'finished', hours: 0 }),
        entry(2, { status: 'finished', hours: 0 }),
        entry(3, { status: 'finished', hours: 20 }),
      ],
      hoursOf
    );
    expect(shelf).toBeNull();
  });

  it('filters a shelf down to that window', () => {
    const shown = withinLength(
      [
        game(1, { playtime: 4 }),
        game(2, { playtime: 10 }),
        game(3, { playtime: 40 }),
      ],
      { min: 7, max: 13 }
    );
    expect(shown.map((g) => g.id)).toEqual([2]);
  });
});

describe('dedupeGames', () => {
  const game = (id: number, name: string) => ({ id, name }) as Game;

  it('drops the same game listed under two ids', () => {
    const rows = dedupeGames([
      game(1, 'The Sinking City 2'),
      game(2, 'Sinking City 2'),
      game(3, 'Hollow Knight: Silksong'),
    ]);
    expect(rows.map((g) => g.id)).toEqual([1, 3]);
  });

  it('ignores punctuation, which is the whole of the difference', () => {
    const rows = dedupeGames([
      game(1, 'S.T.A.L.K.E.R. 2: Heart of Chornobyl'),
      game(2, 'STALKER 2 Heart of Chornobyl'),
    ]);
    expect(rows).toHaveLength(1);
  });

  /** A shared set is what stops row three repeating row one. */
  it('carries what earlier rows already showed', () => {
    const seen = new Set<string>();
    dedupeGames([game(1, 'Satisfactory')], seen);
    expect(
      dedupeGames([game(1, 'Satisfactory'), game(2, 'V Rising')], seen)
    ).toHaveLength(1);
  });

  it('keeps genuinely different games with similar names', () => {
    const rows = dedupeGames([
      game(1, 'MOUSE'),
      game(2, 'MOUSE: P.I. For Hire'),
    ]);
    expect(rows).toHaveLength(2);
  });
});
