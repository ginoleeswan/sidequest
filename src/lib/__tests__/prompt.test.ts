import { buildPrompt } from '../prompt';
import type { LibraryEntry, LibraryStatus } from '../library';
import type { Game } from '@/api/types';

const entry = (
  id: number,
  status: LibraryStatus,
  hours = 10
): LibraryEntry & { hours: number } =>
  ({
    addedAt: 1,
    status,
    game: { id, name: `Game ${id}` } as Game,
    hours,
  }) as LibraryEntry & { hours: number };

const hoursOf = (e: LibraryEntry) =>
  (e as LibraryEntry & { hours: number }).hours;

describe('buildPrompt', () => {
  it('invites rather than counts when there is nothing saved', () => {
    const prompt = buildPrompt([], hoursOf)!;
    expect(prompt.headline).toMatch(/Save a few/);
    expect(prompt.href).toBe('/about');
  });

  /** Two games is not a backlog, and arithmetic on it would be theatre. */
  it('claims no arithmetic on a library too small to have any', () => {
    const prompt = buildPrompt([entry(1, 'wishlist')], hoursOf)!;
    expect(prompt.headline).toBe('1 game saved.');
    expect(prompt.headline).not.toMatch(/hour/);
  });

  it('states the total once there is one worth stating', () => {
    const prompt = buildPrompt(
      [
        entry(1, 'wishlist', 12),
        entry(2, 'wishlist', 8),
        entry(3, 'playing', 5),
      ],
      hoursOf
    )!;
    expect(prompt.headline).toBe('3 games. About 25 hours.');
    expect(prompt.href).toBe('/plan');
  });

  /** Finished games are not a backlog — counting them would be a lie. */
  it('counts only what is still unplayed', () => {
    const prompt = buildPrompt(
      [
        entry(1, 'wishlist', 10),
        entry(2, 'finished', 40),
        entry(3, 'finished', 40),
        entry(4, 'playing', 10),
        entry(5, 'wishlist', 10),
      ],
      hoursOf
    )!;
    expect(prompt.headline).toBe('3 games. About 30 hours.');
  });

  it('does not pluralise a single hour', () => {
    const prompt = buildPrompt(
      [
        entry(1, 'wishlist', 0.4),
        entry(2, 'wishlist', 0.3),
        entry(3, 'wishlist', 0.3),
      ],
      hoursOf
    )!;
    expect(prompt.headline).toBe('3 games. About 1 hour.');
  });
});
