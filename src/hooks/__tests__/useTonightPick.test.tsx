import { act, renderHook } from '@testing-library/react-native';

import { useTonightPick } from '../useTonightPick';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider, useLibrary } from '@/lib/library';
import { useFakeStorage } from '@/test-utils';
import type { Game } from '@/api/types';

/**
 * The verb is the product: Finish, Continue or Start decide the whole
 * card's copy, and until now only the Finish branch had ever executed
 * in a test. Each branch is forced by construction — the durations are
 * RAWG playtimes, and the session is whatever tonight's real session
 * length is, so games are sized relative to it.
 */

const game = (id: number, playtime: number, name = `Game ${id}`): Game =>
  ({
    id,
    slug: `game-${id}`,
    name,
    playtime,
    background_image: null,
    parent_platforms: [],
    genres: [],
  }) as unknown as Game;

function harness() {
  return renderHook(
    () => ({ pick: useTonightPick(), library: useLibrary() }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <LibraryProvider>
          <DurationsProvider>{children}</DurationsProvider>
        </LibraryProvider>
      ),
    }
  );
}

beforeEach(() => {
  useFakeStorage();
});

describe('useTonightPick', () => {
  it('is null with nothing saved — most nights, honestly', async () => {
    const { result } = await harness();
    expect(result.current.pick).toBeNull();
  });

  it('Finish: something short enough to see the credits tonight', async () => {
    const { result } = await harness();
    await act(async () => {
      // 1 RAWG hour: under any session length once "playing" halves it.
      result.current.library.setStatus(game(1, 1, 'Short One'), 'playing');
    });
    expect(result.current.pick?.verb).toBe('Finish');
    expect(result.current.pick?.reason).toMatch(/credits/);
  });

  it('Continue: a long game under way beats a long game unstarted', async () => {
    const { result } = await harness();
    await act(async () => {
      result.current.library.setStatus(game(1, 80, 'The Epic'), 'playing');
      result.current.library.setStatus(game(2, 90, 'The Other'), 'wishlist');
    });
    expect(result.current.pick?.verb).toBe('Continue');
    expect(result.current.pick?.game.name).toBe('The Epic');
  });

  it('Start: nothing under way, so the shortest thing saved', async () => {
    const { result } = await harness();
    await act(async () => {
      result.current.library.setStatus(game(1, 90, 'The Epic'), 'wishlist');
      result.current.library.setStatus(game(2, 40, 'The Shorter'), 'wishlist');
    });
    expect(result.current.pick?.verb).toBe('Start');
    expect(result.current.pick?.game.name).toBe('The Shorter');
  });
});
