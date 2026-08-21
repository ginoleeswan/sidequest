import type { Game } from '@/api/types';
import type { LibraryEntry } from '../library';
import { _setBackendForTests } from '../storage';
import { yearStats } from '../yearStats';

const at = (month: number, day = 10) => Date.UTC(2026, month, day);
const NOW = at(11, 31);

// A fresh backend per test, through the storage layer's own seam: under
// jest the app runs its native code paths, where localStorage is a global
// nothing reads.
let store: Record<string, string>;
beforeEach(() => {
  store = {};
  _setBackendForTests({
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
  });
});

const entry = (
  id: number,
  hours: number,
  status: LibraryEntry['status'],
  addedAt: number,
  finishedAt?: number
): LibraryEntry => ({
  game: { id, name: `Game ${id}`, playtime: hours } as Game,
  status,
  addedAt,
  finishedAt,
});

const hoursOf = (e: LibraryEntry) => e.game.playtime ?? 0;

/**
 * The Memcard is the brag; this is the mirror. It has to be able to say
 * an unflattering thing without turning it into a telling-off.
 */
describe('a year, honestly', () => {
  it('counts what was finished in the year, not what was saved in it', () => {
    const stats = yearStats(
      [
        entry(1, 10, 'finished', at(0), at(1)),
        entry(2, 20, 'finished', at(0), Date.UTC(2025, 5, 1)),
        entry(3, 30, 'wishlist', at(2)),
      ],
      hoursOf,
      2026,
      NOW
    );
    expect(stats.finished).toBe(1);
    expect(stats.hoursFinished).toBe(10);
    expect(stats.added).toBe(3);
  });

  it('says plainly when the pile grew', () => {
    const stats = yearStats(
      [
        entry(1, 10, 'finished', at(0), at(1)),
        ...Array.from({ length: 6 }, (_, i) =>
          entry(i + 2, 10, 'wishlist', at(2))
        ),
      ],
      hoursOf,
      2026,
      NOW
    );
    expect(stats.netChange).toBe(6);
    expect(stats.verdict).toMatch(/pile grew by 6/);
    expect(stats.verdict).not.toMatch(/should/i);
  });

  it('celebrates the other direction', () => {
    const stats = yearStats(
      [
        entry(1, 10, 'finished', Date.UTC(2025, 1, 1), at(1)),
        entry(2, 10, 'finished', Date.UTC(2025, 1, 1), at(2)),
      ],
      hoursOf,
      2026,
      NOW
    );
    expect(stats.netChange).toBe(-2);
    expect(stats.verdict).toMatch(/2 smaller/);
  });

  it('finds the median length and the best month', () => {
    const stats = yearStats(
      [
        entry(1, 4, 'finished', at(0), at(3)),
        entry(2, 10, 'finished', at(0), at(3)),
        entry(3, 40, 'finished', at(0), at(7)),
      ],
      hoursOf,
      2026,
      NOW
    );
    expect(stats.medianLength).toBe(10);
    expect(stats.bestMonth).toBe(3);
  });

  it('measures the longest silence, including one still going', () => {
    const stats = yearStats(
      [entry(1, 10, 'finished', at(0), at(0, 1))],
      hoursOf,
      2026,
      at(3, 1)
    );
    // January to April with nothing finished.
    expect(stats.longestGap).toBeGreaterThan(80);
  });

  it('counts the minutes the timer actually recorded', () => {
    store['sidequest.sessions.v1'] = JSON.stringify([
      { gameId: 1, minutes: 90, endedAt: at(2) },
      { gameId: 1, minutes: 45, endedAt: Date.UTC(2025, 2, 2) },
    ]);
    const stats = yearStats([], hoursOf, 2026, NOW);
    expect(stats.measuredMinutes).toBe(90);
  });

  it('encourages rather than shrugs at an empty year', () => {
    const stats = yearStats([], hoursOf, 2026, NOW);
    expect(stats.finished).toBe(0);
    expect(stats.bestMonth).toBeNull();
    expect(stats.verdict).toMatch(/One short game changes that/);
  });
});
