import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import ImportScreen from '../(pages)/import';
import { renderApp, useFakeStorage } from '@/test-utils';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

const SNAPSHOT = {
  steamid: '76561198000000000',
  name: 'gino',
  avatar: null,
  gameCount: 3,
  hoursPerWeek: 6,
  recent: [],
  fetchedAt: 0,
};

const OWNED = [
  { appid: 1, name: 'Hades II', minutesForever: 600, minutes2Weeks: 120 },
  { appid: 2, name: 'Celeste', minutesForever: 90, minutes2Weeks: 0 },
  { appid: 3, name: 'Bundle Filler', minutesForever: 0, minutes2Weeks: 0 },
];

let store: Record<string, string>;
let ownedFails = false;

beforeAll(() => {
  store = useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/steam')) {
      if (ownedFails)
        return new Response(JSON.stringify({ error: 'Profile is private' }), {
          status: 403,
        });
      return new Response(
        JSON.stringify({
          player: { name: 'gino', avatar: null },
          gameCount: OWNED.length,
          games: OWNED,
        })
      );
    }
    const search = new URL(url).searchParams.get('search') ?? '';
    const results =
      search === 'hades ii'
        ? [{ id: 11, name: 'Hades 2', playtime: 25 }]
        : search === 'celeste'
          ? [{ id: 12, name: 'Celeste', playtime: 12 }]
          : [];
    return new Response(JSON.stringify({ count: 0, next: null, results }));
  }) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  store['sidequest.steam.v1'] = JSON.stringify(SNAPSHOT);
  ownedFails = false;
});

const library = () => JSON.parse(store['sidequest.library.v1'] ?? '{}');

/**
 * The import is the moment the app stops being a database and starts
 * being about your backlog. It has to be a review, not a firehose: what
 * arrives is what was chosen, with the hours already on it.
 */
describe('importing from Steam', () => {
  it('asks you to connect first when nothing is connected', async () => {
    delete store['sidequest.steam.v1'];
    await renderApp(<ImportScreen />);
    expect(screen.getByText('Connect Steam first')).toBeTruthy();
  });

  it('lists what you played lately, first', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    // 'Played lately' is the opening filter, so the untouched games are out.
    expect(screen.queryByText('Bundle Filler')).toBeNull();
  });

  it('can show the games never started, which is most of a backlog', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    await fireEvent.press(screen.getByText('Never started'));
    expect(screen.getByText('Bundle Filler')).toBeTruthy();
    expect(screen.queryByText('Hades II')).toBeNull();
  });

  it('says how long you have played each one', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    expect(screen.getByText('2h this fortnight')).toBeTruthy();
    await fireEvent.press(screen.getByText('Everything'));
    expect(screen.getByText('1.5h played')).toBeTruthy();
    expect(screen.getByText('never started')).toBeTruthy();
  });

  it('imports only what was chosen, with its hours and status', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Hades II'));
    await fireEvent.press(screen.getByText('Import 1 game'));

    await waitFor(() => expect(Object.keys(library())).toHaveLength(1));
    const entry = library()['11'];
    expect(entry.game.name).toBe('Hades 2');
    // Played in the last fortnight, so it is under way rather than a wish.
    expect(entry.status).toBe('playing');
    expect(entry.hoursPlayed).toBe(10);
    expect(entry.steamAppId).toBe(1);
  });

  it('brings in a game nobody has touched lately as something to play', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    await fireEvent.press(screen.getByText('Everything'));
    await fireEvent.press(screen.getByLabelText('Celeste'));
    await fireEvent.press(screen.getByText('Import 1 game'));
    await waitFor(() => expect(library()['12']).toBeTruthy());
    expect(library()['12'].status).toBe('wishlist');
    expect(library()['12'].hoursPlayed).toBe(1.5);
  });

  it('names what it could not match rather than dropping it', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    await fireEvent.press(screen.getByText('Everything'));
    await fireEvent.press(screen.getByLabelText('Bundle Filler'));
    await fireEvent.press(screen.getByText('Import 1 game'));
    await waitFor(() =>
      expect(screen.getByText('Couldn’t be matched')).toBeTruthy()
    );
  });

  it('chooses and clears in bulk', async () => {
    await renderApp(<ImportScreen />);
    await waitFor(() => expect(screen.getByText('Hades II')).toBeTruthy());
    await fireEvent.press(screen.getByText('Everything'));
    await fireEvent.press(screen.getByText('Choose all shown'));
    expect(screen.getByText('Import 3 games')).toBeTruthy();
    await fireEvent.press(screen.getByText('Clear'));
    expect(screen.queryByText(/^Import /)).toBeNull();
  });

  it('says so when Steam will not hand the library over', async () => {
    ownedFails = true;
    await renderApp(<ImportScreen />);
    await waitFor(() =>
      expect(screen.getByText('Couldn’t read your Steam library')).toBeTruthy()
    );
    expect(screen.getByText('Profile is private')).toBeTruthy();
  });
});
