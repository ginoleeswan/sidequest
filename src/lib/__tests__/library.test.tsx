import { act, renderHook } from '@testing-library/react-native';

import { LibraryProvider, useLibrary } from '../library';
import { useFakeStorage } from '@/test-utils';
import type { Game } from '@/api/types';

const game = (id: number, name = `Game ${id}`): Game =>
  ({
    id,
    slug: `game-${id}`,
    name,
    background_image: null,
    rating: 4,
    rating_top: 5,
    released: '2024-01-01',
    playtime: 12,
    metacritic: 80,
    parent_platforms: [],
    genres: [],
  }) as unknown as Game;

function setup() {
  return renderHook(() => useLibrary(), { wrapper: LibraryProvider });
}

describe('LibraryProvider', () => {
  beforeEach(() => {
    // A fresh backend per test: under jest the app is on its native
    // storage path, where there is no localStorage to clear.
    useFakeStorage();
  });

  it('starts empty', async () => {
    const { result } = await setup();
    expect(result.current.count).toBe(0);
    expect(result.current.statusOf(1)).toBeNull();
  });

  it('saves a game under a status and reads it back', async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.setStatus(game(1), 'wishlist');
    });
    expect(result.current.statusOf(1)).toBe('wishlist');
    expect(result.current.byStatus('wishlist')).toHaveLength(1);
    expect(result.current.count).toBe(1);
  });

  it('moves a game between statuses rather than duplicating it', async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.setStatus(game(1), 'wishlist');
    });
    await act(async () => {
      result.current.setStatus(game(1), 'playing');
    });
    expect(result.current.count).toBe(1);
    expect(result.current.statusOf(1)).toBe('playing');
    expect(result.current.byStatus('wishlist')).toHaveLength(0);
  });

  it('removes a game when its status is cleared', async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.setStatus(game(1), 'finished');
    });
    await act(async () => {
      result.current.setStatus(game(1), null);
    });
    expect(result.current.count).toBe(0);
    expect(result.current.statusOf(1)).toBeNull();
  });

  it('persists only a slim snapshot of the game', async () => {
    const { result } = await setup();
    const fat = {
      ...game(7),
      description: 'x'.repeat(5000),
      screenshots: Array(50).fill({ id: 1 }),
    } as unknown as Game;
    await act(async () => {
      result.current.setStatus(fat, 'wishlist');
    });
    const stored = JSON.parse(result.current.exportJson());
    expect(stored['7'].game.description).toBeUndefined();
    expect(stored['7'].game.screenshots).toBeUndefined();
    expect(stored['7'].game.name).toBe('Game 7');
  });

  it('orders each shelf by most recently added', async () => {
    // Two saves inside the same millisecond would tie on addedAt; step
    // the clock so the assertion is about ordering, not about timer
    // resolution.
    let clock = 1_000;
    const now = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => (clock += 1000));
    const { result } = await setup();
    await act(async () => {
      result.current.setStatus(game(1, 'First'), 'wishlist');
    });
    await act(async () => {
      result.current.setStatus(game(2, 'Second'), 'wishlist');
    });
    const names = result.current.byStatus('wishlist').map((e) => e.game.name);
    expect(names[0]).toBe('Second');
    now.mockRestore();
  });

  it('round-trips an export through import', async () => {
    const source = await setup();
    await act(async () => {
      source.result.current.setStatus(game(1), 'playing');
    });
    await act(async () => {
      source.result.current.setStatus(game(2), 'wishlist');
    });
    const transfer = source.result.current.exportJson();

    // A fresh backend per test: under jest the app is on its native
    // storage path, where there is no localStorage to clear.
    useFakeStorage();
    const target = await setup();
    let added = 0;
    await act(async () => {
      added = target.result.current.importJson(transfer);
    });
    expect(added).toBe(2);
    expect(target.result.current.statusOf(1)).toBe('playing');
    expect(target.result.current.statusOf(2)).toBe('wishlist');
  });

  it('merges an import into an existing library instead of replacing it', async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.setStatus(game(1), 'finished');
    });
    const incoming = JSON.stringify({
      '2': { game: game(2), status: 'wishlist', addedAt: 1 },
    });
    await act(async () => {
      result.current.importJson(incoming);
    });
    expect(result.current.count).toBe(2);
    expect(result.current.statusOf(1)).toBe('finished');
  });

  it('rejects a transfer with no valid entries', async () => {
    const { result } = await setup();
    expect(() => result.current.importJson('{}')).toThrow();
    expect(() =>
      result.current.importJson(
        JSON.stringify({ '1': { game: { id: 'nope' }, status: 'wishlist' } })
      )
    ).toThrow();
  });

  it('rejects entries with an unknown status', async () => {
    const { result } = await setup();
    expect(() =>
      result.current.importJson(
        JSON.stringify({
          '9': { game: game(9), status: 'abandoned', addedAt: 1 },
        })
      )
    ).toThrow();
  });

  it('rejects malformed JSON', async () => {
    const { result } = await setup();
    expect(() => result.current.importJson('not json')).toThrow();
  });
});
