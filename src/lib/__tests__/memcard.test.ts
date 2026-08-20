import type { Game } from '@/api/types';
import type { LibraryEntry } from '../library';
import { blocksByMonth, buildMemcard, memcardYears } from '../memcard';

const at = (year: number, month: number) => Date.UTC(year, month, 15);

const entry = (
  id: number,
  name: string,
  playtime: number,
  status: LibraryEntry['status'],
  finishedAt?: number
): LibraryEntry => ({
  game: { id, name, playtime } as Game,
  status,
  addedAt: at(2025, 0),
  finishedAt,
});

const hoursOf = (game: { playtime?: number }) => game.playtime ?? 0;

/**
 * The card celebrates finishing, not volume — so what it counts, and
 * what it refuses to count, is the whole design.
 */
describe('the Memcard', () => {
  it('counts only what was finished, and only in its year', () => {
    const card = buildMemcard(
      [
        entry(1, 'Celeste', 12, 'finished', at(2026, 2)),
        entry(2, 'Hades', 25, 'finished', at(2025, 5)),
        entry(3, 'Still Going', 40, 'playing'),
      ],
      hoursOf,
      2026
    );
    expect(card.count).toBe(1);
    expect(card.blocks.map((b) => b.name)).toEqual(['Celeste']);
    expect(card.hours).toBe(12);
  });

  it('falls back to when a game was saved rather than losing it', () => {
    const card = buildMemcard(
      [entry(1, 'No Date', 8, 'finished')],
      hoursOf,
      2025
    );
    expect(card.count).toBe(1);
  });

  it('orders the year as it happened', () => {
    const card = buildMemcard(
      [
        entry(1, 'December', 5, 'finished', at(2026, 11)),
        entry(2, 'January', 5, 'finished', at(2026, 0)),
      ],
      hoursOf,
      2026
    );
    expect(card.blocks.map((b) => b.name)).toEqual(['January', 'December']);
  });

  it('names the longest one — that is the brag', () => {
    const card = buildMemcard(
      [
        entry(1, 'Short', 4, 'finished', at(2026, 1)),
        entry(2, 'Epic', 60, 'finished', at(2026, 2)),
      ],
      hoursOf,
      2026
    );
    expect(card.longest?.name).toBe('Epic');
  });

  it('speaks in evenings, not decimals', () => {
    const card = buildMemcard(
      [entry(1, 'Celeste', 12, 'finished', at(2026, 2))],
      hoursOf,
      2026
    );
    expect(card.headline).toBe('One game, all the way to the credits');
    expect(card.subhead).toMatch(/About 8 evenings/);
  });

  it('is encouraging rather than empty when nothing is finished', () => {
    const card = buildMemcard([], hoursOf, 2026);
    expect(card.headline).toBe('Nothing finished yet');
    expect(card.subhead).toMatch(/One short game is all it takes/);
    expect(card.longest).toBeNull();
  });

  it('reads a plural year the way a person would say it', () => {
    const card = buildMemcard(
      [
        entry(1, 'A', 10, 'finished', at(2026, 1)),
        entry(2, 'B', 20, 'finished', at(2026, 3)),
      ],
      hoursOf,
      2026
    );
    expect(card.headline).toBe('2 games finished · 30 hours');
  });

  it('lays the year out as twelve months', () => {
    const card = buildMemcard(
      [
        entry(1, 'A', 10, 'finished', at(2026, 0)),
        entry(2, 'B', 10, 'finished', at(2026, 0)),
        entry(3, 'C', 10, 'finished', at(2026, 11)),
      ],
      hoursOf,
      2026
    );
    const months = blocksByMonth(card);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe(2);
    expect(months[11]).toBe(1);
  });

  it('offers the years there is something to show for, newest first', () => {
    expect(
      memcardYears([
        entry(1, 'A', 10, 'finished', at(2024, 1)),
        entry(2, 'B', 10, 'finished', at(2026, 1)),
        entry(3, 'C', 10, 'playing'),
      ])
    ).toEqual([2026, 2024]);
  });
});
