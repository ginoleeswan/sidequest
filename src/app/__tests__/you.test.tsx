import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import YouScreen from '../you';
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

const game = (id: number, name: string, playtime = 10) =>
  ({ id, name, slug: name.toLowerCase(), playtime }) as Game;

const seed = (rows: { game: Game; status: LibraryStatus }[]) => {
  store['sidequest.library.v1'] = JSON.stringify(
    Object.fromEntries(
      rows.map((row) => [
        row.game.id,
        { game: row.game, status: row.status, addedAt: Date.now() },
      ])
    )
  );
};

/**
 * The one screen that is about the reader rather than the games — and
 * the home of the actions that act on their data rather than on a shelf.
 */
describe('the you screen', () => {
  it('hands the library over as a string, and says it did', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { writeText } },
    });
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<YouScreen />);

    await fireEvent.press(screen.getByText('Copy library'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(JSON.parse(writeText.mock.calls[0][0])['1'].game.name).toBe(
      'Celeste'
    );
    expect(screen.getByText(/Library copied/)).toBeTruthy();
  });

  /**
   * A clipboard write can be refused — Safari does it whenever the call
   * is not close enough to the tap. Failing quietly would tell somebody
   * their library was safely copied when nothing left the device, which
   * is the one lie this screen must not tell.
   */
  it('says so rather than failing silently when the clipboard is blocked', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: jest.fn().mockRejectedValue(new Error('denied')),
        },
      },
    });
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<YouScreen />);

    await fireEvent.press(screen.getByText('Copy library'));
    await waitFor(() => expect(screen.getByText(/Copy failed/)).toBeTruthy());
  });

  it('offers nothing to copy when there is nothing in the library', async () => {
    await renderApp(<YouScreen />);
    expect(screen.getByText('Copy library')).toBeTruthy();
    // Present but inert: a control that copies an empty library is a
    // control that lies about having done something.
    expect(screen.queryByText(/games$/)).toBeNull();
  });
});
