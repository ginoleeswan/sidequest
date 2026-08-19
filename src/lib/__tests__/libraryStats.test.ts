import { libraryStats, sortLibrary } from '../libraryStats';
import type { LibraryEntry, LibraryStatus } from '../library';

const NOW = Date.parse('2026-08-19T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const entry = (
  id: number,
  status: LibraryStatus,
  playtime: number,
  addedAt = NOW,
  name = `Game ${id}`
): LibraryEntry =>
  ({
    game: { id, name, playtime, released: '2023-01-01' },
    status,
    addedAt,
  }) as unknown as LibraryEntry;

const hoursOf = (game: { playtime: number }) => game.playtime;

describe('libraryStats', () => {
  it('is all zeros for an empty library', () => {
    expect(libraryStats([], hoursOf, NOW)).toEqual({
      waiting: 0,
      playing: 0,
      finished: 0,
      hoursAhead: 0,
      hoursFinished: 0,
      finishedThisYear: 0,
    });
  });

  it('counts each shelf separately', () => {
    const stats = libraryStats(
      [
        entry(1, 'wishlist', 10),
        entry(2, 'wishlist', 5),
        entry(3, 'playing', 20),
        entry(4, 'finished', 8),
      ],
      hoursOf,
      NOW
    );
    expect(stats).toMatchObject({ waiting: 2, playing: 1, finished: 1 });
  });

  it('counts a game under way as half remaining', () => {
    const stats = libraryStats([entry(1, 'playing', 30)], hoursOf, NOW);
    expect(stats.hoursAhead).toBe(15);
  });

  it('keeps finished hours out of the hours ahead', () => {
    const stats = libraryStats(
      [entry(1, 'wishlist', 10), entry(2, 'finished', 40)],
      hoursOf,
      NOW
    );
    expect(stats.hoursAhead).toBe(10);
    expect(stats.hoursFinished).toBe(40);
  });

  it('counts only the last twelve months as this year', () => {
    const stats = libraryStats(
      [
        entry(1, 'finished', 5, NOW - 30 * DAY),
        entry(2, 'finished', 5, NOW - 400 * DAY),
      ],
      hoursOf,
      NOW
    );
    expect(stats.finished).toBe(2);
    expect(stats.finishedThisYear).toBe(1);
  });

  it('uses the caller’s lengths, so a corrected duration counts', () => {
    const corrected = libraryStats([entry(1, 'wishlist', 300)], () => 12, NOW);
    expect(corrected.hoursAhead).toBe(12);
  });
});

describe('sortLibrary', () => {
  const library = [
    entry(1, 'wishlist', 40, NOW - 3 * DAY, 'Baldur'),
    entry(2, 'wishlist', 2, NOW - 1 * DAY, 'A Short Hike'),
    entry(3, 'wishlist', 0, NOW - 2 * DAY, 'Mystery'),
  ];
  const names = (entries: LibraryEntry[]) => entries.map((e) => e.game.name);

  it('defaults to most recently added', () => {
    expect(names(sortLibrary(library, 'added', hoursOf))[0]).toBe(
      'A Short Hike'
    );
  });

  it('puts the quickest first, and unknown lengths last', () => {
    expect(names(sortLibrary(library, 'shortest', hoursOf))).toEqual([
      'A Short Hike',
      'Baldur',
      'Mystery',
    ]);
  });

  it('puts the longest first', () => {
    expect(names(sortLibrary(library, 'longest', hoursOf))[0]).toBe('Baldur');
  });

  it('sorts by name without regard to case', () => {
    expect(names(sortLibrary(library, 'name', hoursOf))).toEqual([
      'A Short Hike',
      'Baldur',
      'Mystery',
    ]);
  });

  it('never mutates the library it was given', () => {
    const original = [...library];
    sortLibrary(library, 'longest', hoursOf);
    expect(library).toEqual(original);
  });
});
