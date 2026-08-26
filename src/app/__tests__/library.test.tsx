import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import LibraryScreen from '../(tabs)/library';
import type { Game } from '@/api/types';
import type { LibraryStatus } from '@/lib/library';
import { renderApp, useFakeStorage } from '@/test-utils';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  // Pasted titles have no ids, so each is looked up by name.
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const search = new URL(String(input)).searchParams.get('search') ?? '';
    const results =
      search === 'celeste'
        ? [{ id: 77, name: 'Celeste', playtime: 12 }]
        : search === 'hades'
          ? [{ id: 78, name: 'Hades', playtime: 21 }]
          : [];
    return new Response(JSON.stringify({ count: 0, next: null, results }));
  }) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const KEY = 'sidequest.library.v1';

/** What actually landed on the device. */
const library = () => JSON.parse(store[KEY] ?? '{}');

const game = (id: number, name: string, playtime: number) =>
  ({ id, name, playtime }) as Game;

function seed(rows: { game: Game; status: LibraryStatus; tags?: string[] }[]) {
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

  it('offers a way to bring a library in', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    // In fixed chrome, on the panel it fills. It has been a chip at the
    // foot of the page and a chip under a rule inside the panel; the
    // first was unreachable past two hundred games and the second read
    // as an orphan.
    expect(screen.getByLabelText('Import a library')).toBeTruthy();
    // Copying moved to /you: it is a settings action, and at the foot of
    // this page it sat below every game you own.
    expect(screen.queryByText('Copy library')).toBeNull();
  });

  /**
   * "Shortest first" is the single most useful order there is when you
   * have an hour and forty games, so the ordering is a feature, not a
   * preference.
   */
  it('reorders by length on demand', async () => {
    // Six, because that is where the control appears: two across the
    // grid, three rows, the point a shelf stops fitting on a screen.
    seed([
      { game: game(1, 'Long', 40), status: 'wishlist' },
      { game: game(2, 'Short', 4), status: 'wishlist' },
      { game: game(3, 'Filler c', 20), status: 'wishlist' },
      { game: game(4, 'Filler d', 21), status: 'wishlist' },
      { game: game(5, 'Filler e', 22), status: 'wishlist' },
      { game: game(6, 'Filler f', 23), status: 'wishlist' },
    ]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('Shortest'));
    const titles = screen
      .getAllByText(/^(Long|Short)$/)
      .map((node) => node.props.children);
    expect(titles[0]).toBe('Short');
  });

  it('offers no sort control for a library you can already see', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    expect(screen.queryByText('Shortest')).toBeNull();
  });

  it('refuses a paste that is not a library', async () => {
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByLabelText('Import a library'));
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
    await fireEvent.press(screen.getByLabelText('Import a library'));
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

  it('filters by a shelf of your own', async () => {
    seed([
      { game: game(1, 'Together', 12), status: 'wishlist', tags: ['co-op'] },
      { game: game(2, 'Alone', 30), status: 'wishlist' },
    ]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByText('co-op'));
    expect(screen.getByText('Together')).toBeTruthy();
    expect(screen.queryByText('Alone')).toBeNull();
  });

  it('offers no shelves when none have been made', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    expect(screen.queryByText('All shelves')).toBeNull();
  });

  /**
   * The other three-quarters of a backlog live in Backloggd, HLTB or a
   * spreadsheet. One box reads all of them.
   */
  it('imports a pasted CSV export, with its statuses and hours', async () => {
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByLabelText('Import a library'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste/i),
      ['Title,Status,Hours', 'Celeste,Completed,9', 'Hades,Playing,4'].join(
        '\n'
      )
    );
    await fireEvent.press(screen.getByText('Merge into my library'));

    await waitFor(() => expect(library()['77']).toBeTruthy());
    expect(library()['77'].status).toBe('finished');
    expect(library()['77'].hoursPlayed).toBe(9);
    expect(library()['78'].status).toBe('playing');
  });

  it('says which titles it could not match rather than dropping them silently', async () => {
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByLabelText('Import a library'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste/i),
      ['Title', 'Celeste', 'Some Obscure Thing'].join('\n')
    );
    await fireEvent.press(screen.getByText('Merge into my library'));
    await waitFor(() =>
      expect(screen.getByText(/couldn’t match 1/)).toBeTruthy()
    );
  });

  it('explains a spreadsheet with no title column', async () => {
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByLabelText('Import a library'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste/i),
      ['Foo,Bar', '1,2'].join('\n')
    );
    await fireEvent.press(screen.getByText('Merge into my library'));
    await waitFor(() =>
      expect(screen.getByText(/expected Title, Name or Game/)).toBeTruthy()
    );
  });
});

/**
 * A shelf of two games left most of the screen empty, and the only way
 * to add anything was to leave the page — so the grid ends on the shape
 * a game would take, waiting for one.
 */
describe('the last cell', () => {
  it('offers somewhere to put the next game', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    await fireEvent.press(screen.getByLabelText('Find a game to add'));
    expect(router.push).toHaveBeenCalledWith('/');
  });

  it('stays out of the way when the shelf is empty', async () => {
    await renderApp(<LibraryScreen />);
    // The empty state is the invitation there; two of them would be one
    // too many.
    expect(screen.queryByLabelText('Find a game to add')).toBeNull();
  });
});

/**
 * The shelf's own voice.
 *
 * §2.1 says guilt reading is the enemy, and every other surface was
 * rewritten to answer rather than accuse — the Plan says what will get
 * done, the misfits say "and that's allowed", a free evening says
 * "free". The Library was still keeping score in the largest numeral
 * in the app, on the page opened most.
 */
describe('what the shelf calls its hours', () => {
  it('is an inventory, not a debt', async () => {
    seed([{ game: game(1, 'Celeste', 12), status: 'wishlist' }]);
    await renderApp(<LibraryScreen />);
    await waitFor(() => expect(screen.getByText('on your shelf')).toBeTruthy());
    // "ahead of you" is a road you are late down. Same number, and it
    // still earns its size — it is what the Plan runs on.
    expect(screen.queryByText('ahead of you')).toBeNull();
  });

  it('leads with the credits when there are any', async () => {
    seed([
      { game: game(1, 'Celeste', 12), status: 'wishlist' },
      { game: game(2, 'Inside', 4), status: 'finished' },
    ]);
    await renderApp(<LibraryScreen />);
    // The app's whole thesis is finishing; where the shelf has evidence
    // of it, it goes first rather than last and quietest.
    await waitFor(() => expect(screen.getByText(/^1 finished/)).toBeTruthy());
  });
});
