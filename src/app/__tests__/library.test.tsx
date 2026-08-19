import { screen } from '@testing-library/react-native';

import LibraryScreen from '../library';
import type { Game } from '@/api/types';
import type { LibraryStatus } from '@/lib/library';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const KEY = 'sidequest.library.v1';

const game = (id: number, name: string, playtime: number) =>
  ({ id, name, playtime }) as Game;

function seed(rows: { game: Game; status: LibraryStatus }[]) {
  store[KEY] = JSON.stringify(
    Object.fromEntries(
      rows.map((r, i) => [String(r.game.id), { addedAt: i + 1, ...r }])
    )
  );
}

describe('the library screen', () => {
  it('invites you to save something when it is empty', async () => {
    await renderApp(<LibraryScreen />);
    expect(screen.getByText(/Nothing saved yet/i)).toBeTruthy();
  });

  it('lists what you saved', async () => {
    seed([
      { game: game(1, 'Celeste', 12), status: 'wishlist' },
      { game: game(2, 'Hades II', 30), status: 'wishlist' },
    ]);
    await renderApp(<LibraryScreen />);
    expect(screen.getByText('Celeste')).toBeTruthy();
    expect(screen.getByText('Hades II')).toBeTruthy();
  });

  /** The tabs are the backlog's three states, and they filter. */
  it('separates the three states', async () => {
    seed([
      { game: game(1, 'Waiting', 12), status: 'wishlist' },
      { game: game(2, 'Underway', 30), status: 'playing' },
    ]);
    await renderApp(<LibraryScreen />);
    expect(screen.getByText('Waiting')).toBeTruthy();
    expect(screen.queryByText('Underway')).toBeNull();
  });

  it('offers the library as a transferable string', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    expect(screen.getByText('Copy library')).toBeTruthy();
    expect(screen.getByText('Import')).toBeTruthy();
  });
});
