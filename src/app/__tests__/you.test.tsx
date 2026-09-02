import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { router } from 'expo-router';

import YouScreen from '../(pages)/you';
import type { Game } from '@/api/types';
import type { LibraryStatus } from '@/lib/library';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.mocked(router.push).mockClear();
  jest.mocked(Share.share).mockClear().mockResolvedValue({
    action: Share.sharedAction,
  });
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
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<YouScreen />);

    await fireEvent.press(screen.getByText('Send my library'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sent = jest.mocked(Share.share).mock.calls[0][0].message as string;
    expect(JSON.parse(sent)['1'].game.name).toBe('Celeste');
    expect(screen.getByText(/Library sent/)).toBeTruthy();
  });

  /**
   * A clipboard write can be refused — Safari does it whenever the call
   * is not close enough to the tap. Failing quietly would tell somebody
   * their library was safely copied when nothing left the device, which
   * is the one lie this screen must not tell.
   */
  /**
   * A dismissal is REPORTED, not thrown — the sheet resolves with
   * `dismissedAction`, and Safari answers a blocked copy the same way.
   * Code that only catches would tell somebody their library was safely
   * copied when nothing left the device, which is the one lie this
   * screen must not tell.
   */
  it('says so rather than failing silently when nothing was sent', async () => {
    jest
      .mocked(Share.share)
      .mockResolvedValue({ action: Share.dismissedAction });
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<YouScreen />);

    await fireEvent.press(screen.getByText('Send my library'));
    await waitFor(() =>
      expect(screen.getByText(/Nothing left the app/)).toBeTruthy()
    );
  });

  it('says so when the hand-off throws instead', async () => {
    jest.mocked(Share.share).mockRejectedValue(new Error('no sheet here'));
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<YouScreen />);

    await fireEvent.press(screen.getByText('Send my library'));
    await waitFor(() =>
      expect(screen.getByText(/Nothing left the app/)).toBeTruthy()
    );
  });

  it('offers nothing to copy when there is nothing in the library', async () => {
    await renderApp(<YouScreen />);
    expect(screen.getByText('Send my library')).toBeTruthy();
    // Present but inert: a control that copies an empty library is a
    // control that lies about having done something.
    expect(screen.queryByText(/games$/)).toBeNull();
  });
});

/**
 * The three figures are doors, not a scoreboard: what is ahead, what you
 * finished, what you let go, each opening the screen that holds it. That
 * is the whole reason they are allowed to repeat numbers the Library and
 * the Memcard already show.
 */
describe('the three doors', () => {
  it('opens the year on the finished figure', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'finished' }]);
    await renderApp(<YouScreen />);
    await fireEvent.press(screen.getByLabelText('1 FINISHED'));
    expect(router.push).toHaveBeenCalledWith('/memcard');
  });

  it('opens the amnesty on the let-go figure', async () => {
    await renderApp(<YouScreen />);
    await fireEvent.press(screen.getByLabelText('0 LET GO'));
    expect(router.push).toHaveBeenCalledWith('/tidy');
  });
});

/**
 * Signing in buys sync and never a feature, so it is one row that opens
 * when asked. Two versions of this screen gave it solid white buttons
 * above the fold, which made the one optional thing on the page the
 * loudest thing on it.
 *
 * Tests run without Supabase configuration, which is the same state a
 * build made without those keys is in — and the guarantee worth holding
 * is that such a build offers no account at all rather than a row that
 * opens onto nothing.
 */
describe('the account row', () => {
  it('offers no account where there is no auth to offer', async () => {
    await renderApp(<YouScreen />);
    expect(screen.queryByText('ACCOUNT')).toBeNull();
    expect(screen.queryByText('Sync to another device')).toBeNull();
  });
});
