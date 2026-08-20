import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SteamConnect } from '../SteamConnect';
import type { SteamSnapshot } from '@/api/steam';
import { renderApp, useFakeStorage } from '@/test-utils';

const snapshot: SteamSnapshot = {
  steamid: '76561198000000000',
  name: 'gino',
  avatar: null,
  gameCount: 412,
  hoursPerWeek: 9.5,
  recent: [
    { appid: 1, name: 'Hades II', minutesForever: 900, minutes2Weeks: 600 },
    { appid: 2, name: 'Celeste', minutesForever: 300, minutes2Weeks: 120 },
  ],
  fetchedAt: 0,
};

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

/**
 * Measuring the pace instead of guessing it. The whole plan hangs off
 * this number, so the states that matter are: asking, failing, and
 * having an answer you can apply.
 */
describe('connecting Steam', () => {
  it('will not connect nothing', async () => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
    await renderApp(<SteamConnect onUsePace={jest.fn()} />);
    await fireEvent.press(screen.getByText('Connect'));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('explains an input that is not a profile, without calling out', async () => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
    await renderApp(<SteamConnect onUsePace={jest.fn()} />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Profile URL or vanity name…'),
      'not a profile!!'
    );
    await fireEvent.press(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByText(/doesn’t look like a Steam profile/)).toBeTruthy()
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('surfaces what Steam said when the request fails', async () => {
    globalThis.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Profile is private' }), {
          status: 403,
        })
    ) as unknown as typeof fetch;
    await renderApp(<SteamConnect onUsePace={jest.fn()} />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Profile URL or vanity name…'),
      '76561198000000000'
    );
    await fireEvent.press(screen.getByText('Connect'));
    await waitFor(() =>
      expect(screen.getByText('Profile is private')).toBeTruthy()
    );
  });

  it('measures a pace from what a profile actually played', async () => {
    globalThis.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            player: { name: 'gino', avatar: null },
            gameCount: 412,
            games: snapshot.recent,
          })
        )
    ) as unknown as typeof fetch;
    await renderApp(<SteamConnect onUsePace={jest.fn()} />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('Profile URL or vanity name…'),
      '76561198000000000'
    );
    await fireEvent.press(screen.getByText('Connect'));
    // 720 minutes over Steam's two-week window is 6h a week.
    await waitFor(() =>
      expect(screen.getByText(/playing 6h a week/)).toBeTruthy()
    );
    expect(screen.getByText(/Hades II \(10h\)/)).toBeTruthy();
  });

  it('hands the measured pace to the plan when you apply it', async () => {
    store['sidequest.steam.v1'] = JSON.stringify(snapshot);
    const onUsePace = jest.fn();
    await renderApp(<SteamConnect onUsePace={onUsePace} />);
    await fireEvent.press(screen.getByText('Use my measured pace — 9.5h/week'));
    expect(onUsePace).toHaveBeenCalledWith(9.5);
  });

  it('forgets the profile when you disconnect', async () => {
    store['sidequest.steam.v1'] = JSON.stringify(snapshot);
    await renderApp(<SteamConnect onUsePace={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText('Disconnect Steam'));
    expect(
      screen.getByPlaceholderText('Profile URL or vanity name…')
    ).toBeTruthy();
    await waitFor(() =>
      expect(store['sidequest.steam.v1']).toBe(JSON.stringify(null))
    );
  });
});
