import { fireEvent, screen, waitFor } from '@testing-library/react-native';

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

  /**
   * "Shortest first" is the single most useful order there is when you
   * have an hour and forty games, so the ordering is a feature, not a
   * preference.
   */
  it('reorders by length on demand', async () => {
    seed([
      { game: game(1, 'Long', 40), status: 'wishlist' },
      { game: game(2, 'Short', 4), status: 'wishlist' },
    ]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('Shortest'));
    const titles = screen
      .getAllByText(/^(Long|Short)$/)
      .map((node) => node.props.children);
    expect(titles[0]).toBe('Short');
  });

  it('offers no sort control for a single game', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    expect(screen.queryByText('Shortest')).toBeNull();
  });

  it('copies the library out, and says so', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { writeText } },
    });
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('Copy library'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(JSON.parse(writeText.mock.calls[0][0])['1'].game.name).toBe(
      'Celeste'
    );
    await waitFor(() =>
      expect(screen.getByText(/Library copied/)).toBeTruthy()
    );
  });

  it('says so rather than failing silently when the browser blocks the clipboard', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: { writeText: jest.fn().mockRejectedValue(new Error('no')) },
      },
    });
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('Copy library'));
    await waitFor(() => expect(screen.getByText(/Copy failed/)).toBeTruthy());
  });

  it('refuses a paste that is not a library', async () => {
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('Import'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste/i),
      'not json'
    );
    await fireEvent.press(screen.getByText('Merge into my library'));
    await waitFor(() =>
      expect(
        screen.getByText(/doesn’t look like a library export/)
      ).toBeTruthy()
    );
  });

  it('merges a pasted library in, and counts what arrived', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('Import'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste/i),
      JSON.stringify({
        '2': { addedAt: 9, status: 'wishlist', game: game(2, 'Hades II', 30) },
      })
    );
    await fireEvent.press(screen.getByText('Merge into my library'));
    await waitFor(() =>
      expect(screen.getByText('Imported 1 game')).toBeTruthy()
    );
    // The one already there is still there.
    expect(screen.getByText('Celeste')).toBeTruthy();
    expect(screen.getByText('Hades II')).toBeTruthy();
  });
});
