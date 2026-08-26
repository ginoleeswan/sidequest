import { act, renderHook } from '@testing-library/react-native';

import { usePlanStanding } from '../usePlanStanding';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider, useLibrary } from '@/lib/library';
import { useFakeStorage } from '@/test-utils';
import type { Game } from '@/api/types';

/**
 * Where one game stands in your plan.
 *
 * The game page could say a great deal about a game and nothing about
 * YOUR game — "about 3 weeks at 8h a week" is true of anybody with that
 * pace, while the plan page two taps away knew it was third in the
 * route with credits around 5 September. Same drift the widgets had:
 * one truth, told by only one of the surfaces that hold it. So the rule
 * lives in this hook, built from the same `planItems` and
 * `planSchedule` the plan page and the widgets use.
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

function harness(id: number | undefined) {
  return renderHook(
    () => ({ standing: usePlanStanding(id), library: useLibrary() }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <LibraryProvider>
          <DurationsProvider>{children}</DurationsProvider>
        </LibraryProvider>
      ),
    }
  );
}

let store: Record<string, string>;
beforeEach(() => {
  store = useFakeStorage();
});

/** Seeded before the hook mounts, because the dials are read on mount. */
const seed = (
  rows: { game: Game; status: string }[],
  windowWeeks?: number,
  pace = 6
) => {
  store['sidequest.library.v1'] = JSON.stringify(
    Object.fromEntries(
      rows.map((row, i) => [String(row.game.id), { addedAt: i + 1, ...row }])
    )
  );
  store['sidequest.plan.pace'] = String(pace);
  if (windowWeeks != null) {
    store['sidequest.plan.window'] = String(windowWeeks);
  }
};

describe('usePlanStanding', () => {
  it('says nothing about a game nobody saved', async () => {
    const { result } = await harness(1);
    expect(result.current.standing).toBeNull();
  });

  it('says nothing when it was asked about nothing', async () => {
    const { result } = await harness(undefined);
    expect(result.current.standing).toBeNull();
  });

  it('places a saved game in the route, with its date', async () => {
    const { result } = await harness(1);
    await act(async () => {
      result.current.library.setStatus(game(1, 12, 'Celeste'), 'wishlist');
    });
    expect(result.current.standing?.kind).toBe('scheduled');
    if (result.current.standing?.kind !== 'scheduled') throw new Error('nope');
    expect(result.current.standing.position).toBe(0);
    expect(result.current.standing.finishAt).toBeGreaterThan(Date.now());
  });

  /**
   * The route is shortest-first, and the game page's number has to be
   * the number the plan page prints beside the same game.
   */
  it('gives the position the plan itself gives', async () => {
    const { result } = await harness(2);
    await act(async () => {
      result.current.library.setStatus(game(1, 4, 'Short'), 'wishlist');
      result.current.library.setStatus(game(2, 40, 'Long'), 'wishlist');
    });
    if (result.current.standing?.kind !== 'scheduled') throw new Error('nope');
    expect(result.current.standing.position).toBe(1);
  });

  /**
   * A game the window has no room for is a fact about the window, not a
   * failing of the reader — but the page still has to know, so it can
   * say "it'll still be here" rather than a pace sentence that pretends
   * the game is on its way.
   */
  it('knows when the window has no room for it', async () => {
    // Six hours a week for two weeks is twelve hours of room. The short
    // one takes it; the six-hundred-hour game cannot be placed.
    seed(
      [
        { game: game(1, 4, 'Short'), status: 'wishlist' },
        { game: game(2, 600, 'Enormous'), status: 'wishlist' },
      ],
      2
    );
    const { result } = await harness(2);
    expect(result.current.standing?.kind).toBe('dropped');
  });

  /** With no window nothing can overflow, so nothing is ever dropped. */
  it('drops nobody from a plan with no horizon', async () => {
    seed([
      { game: game(1, 4, 'Short'), status: 'wishlist' },
      { game: game(2, 600, 'Enormous'), status: 'wishlist' },
    ]);
    const { result } = await harness(2);
    expect(result.current.standing?.kind).toBe('scheduled');
  });

  it('says nothing about a game already finished', async () => {
    const { result } = await harness(1);
    await act(async () => {
      result.current.library.setStatus(game(1, 12, 'Celeste'), 'finished');
    });
    expect(result.current.standing).toBeNull();
  });
});
