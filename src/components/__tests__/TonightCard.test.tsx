import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TonightCard } from '../TonightCard';
import type { Game } from '@/api/types';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider, type LibraryStatus } from '@/lib/library';

let store: Record<string, string> = {};

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => delete store[k],
    },
  });
});

beforeEach(() => {
  store = {};
});

const game = (id: number, name: string, playtime: number) =>
  ({ id, name, playtime }) as Game;

function seed(entries: { game: Game; status: LibraryStatus }[]) {
  store['sidequest.library.v1'] = JSON.stringify(
    Object.fromEntries(
      entries.map((e, i) => [String(e.game.id), { ...e, addedAt: i + 1 }])
    )
  );
}

const mount = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <LibraryProvider>
        <DurationsProvider>
          <TonightCard />
        </DurationsProvider>
      </LibraryProvider>
    </SafeAreaProvider>
  );

/**
 * This is the one surface only Sidequest can show, so its rules matter:
 * something finishable in an evening beats something merely started,
 * which beats the shortest thing saved. It must also stay out of the way
 * when there is nothing worth saying.
 */
describe('TonightCard', () => {
  it('says nothing when the library is empty', async () => {
    await mount();
    expect(screen.queryByLabelText(/^Tonight:/)).toBeNull();
  });

  it('offers to finish a game that fits the evening', async () => {
    seed([{ game: game(1, 'A Short Hike', 1), status: 'wishlist' }]);
    await mount();
    // The label is what a screen reader announces, and it carries both
    // the verb and the pick — the whole decision in one string.
    expect(screen.getByLabelText('Tonight: Finish A Short Hike')).toBeTruthy();
  });

  /** Something already under way needs only half of what is left. */
  it('prefers continuing a game already in progress', async () => {
    seed([
      { game: game(1, 'Celeste', 12), status: 'playing' },
      { game: game(2, 'Tunic', 11), status: 'wishlist' },
    ]);
    await mount();
    expect(screen.getByLabelText('Tonight: Continue Celeste')).toBeTruthy();
  });

  it('falls back to the shortest saved game when nothing fits', async () => {
    seed([
      { game: game(1, 'Epic', 90), status: 'wishlist' },
      { game: game(2, 'Less Epic', 40), status: 'wishlist' },
    ]);
    await mount();
    expect(screen.getByLabelText('Tonight: Start Less Epic')).toBeTruthy();
  });

  it('ignores games already finished', async () => {
    seed([{ game: game(1, 'Done', 2), status: 'finished' }]);
    await mount();
    expect(screen.queryByLabelText(/^Tonight:/)).toBeNull();
  });

  it('respects a corrected length over the source estimate', async () => {
    seed([
      { game: game(1, 'Mislabelled', 60), status: 'wishlist' },
      { game: game(2, 'Honest', 30), status: 'wishlist' },
    ]);
    // The player says the first one is actually short.
    store['sidequest.durations.v1'] = JSON.stringify({ 1: 1 });
    await mount();
    expect(screen.getByLabelText(/Mislabelled/)).toBeTruthy();
  });
});
