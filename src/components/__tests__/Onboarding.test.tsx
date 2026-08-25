import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { Onboarding } from '../Onboarding';
import type { Game } from '@/api/types';
import { renderApp, useFakeStorage } from '@/test-utils';

const picks: Game[] = [1, 2, 3, 4, 5, 6].map(
  (id) => ({ id, name: `Game ${id}`, playtime: 10 }) as Game
);

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

/** The route the test is standing on. See jest.setup's usePathname. */
const at = (pathname: string) => {
  (globalThis as { routePathname?: string }).routePathname = pathname;
};

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  /**
   * The must-play FEED shape, not a plain page of games.
   *
   * Onboarding seeds itself from `collections/must-play/feed`, where a
   * result is a post that carries a game rather than being one — see
   * `getMustPlayGames`. It reads `item.game`, so a flat list of games
   * decodes to a list of `undefined`, gets filtered away, and the step
   * renders with no tiles at all. Which is exactly how this test
   * failed, and exactly what a reader would have seen.
   */
  globalThis.fetch = jest.fn(
    async () =>
      new Response(
        JSON.stringify({
          count: picks.length,
          next: null,
          results: picks.map((game) => ({ id: game.id, game })),
        })
      )
  ) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.mocked(router.push).mockClear();
});

/**
 * First visit. Three acts, skippable at every step, and it must never
 * come back once it is done — an onboarding that reappears is worse than
 * none at all.
 */
describe('onboarding', () => {
  it('opens on the promise', async () => {
    await renderApp(<Onboarding />);
    expect(screen.getByText('Set me up')).toBeTruthy();
  });

  it.each([
    ['a shared game link', '/game/3498'],
    ['a browse page', '/by/developer'],
    ['the about page', '/about'],
    ['the privacy policy', '/privacy'],
    ['the terms', '/terms'],
    ['a shared plan', '/shared'],
  ])('stays out of the way of %s', async (_name, pathname) => {
    // Somebody who followed a link is being shown the thing they
    // clicked. Game pages are the ones this originally missed and the
    // worst ones to miss: they are the main shareable surface, they
    // have link previews built for them, and the sitemap submits them
    // to search engines — so every search result led to a carousel
    // about backlogs rather than to the game just searched for.
    at(pathname);
    await renderApp(<Onboarding />);
    expect(screen.queryByText(/Your backlog isn/)).toBeNull();
    at('/');
  });

  it.each([
    ['the home screen', '/'],
    ['the plan', '/plan'],
    ['the library', '/library'],
    ['you', '/you'],
  ])('still opens on %s, which is somebody using the app', async (_n, path) => {
    at(path);
    await renderApp(<Onboarding />);
    expect(screen.getByText(/Your backlog isn/)).toBeTruthy();
    at('/');
  });

  it('stays away once it has been seen', async () => {
    store['sidequest.onboarded.v1'] = JSON.stringify(true);
    await renderApp(<Onboarding />);
    expect(screen.queryByText('Set me up')).toBeNull();
  });

  it('remembers being skipped, and does not send you anywhere', async () => {
    await renderApp(<Onboarding />);
    // One way out, top right, the same on every act. Act one carried a
    // second "Skip the tour" under its button until it was noticed that
    // the screen offered the same escape twice.
    await fireEvent.press(screen.getByText('Skip'));
    await waitFor(() =>
      expect(store['sidequest.onboarded.v1']).toBe(JSON.stringify(true))
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('seeds the plan with the pace you claim, then moves on', async () => {
    jest.useFakeTimers();
    try {
      await renderApp(<Onboarding />);
      await fireEvent.press(screen.getByText('Set me up'));
      await fireEvent.press(screen.getByText('Most nights'));
      expect(store['sidequest.plan.pace']).toBe('8');
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(screen.getByText('FIRST SAVES')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('lets you walk back a step', async () => {
    await renderApp(<Onboarding />);
    await fireEvent.press(screen.getByText('Set me up'));
    expect(screen.getByText('YOUR PACE')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByText('Set me up')).toBeTruthy();
  });

  it('saves what you tap, and counts it on the button', async () => {
    await renderApp(<Onboarding />);
    await fireEvent.press(screen.getByText('Set me up'));
    await fireEvent.press(screen.getByText('A couple of evenings'));
    await waitFor(() => expect(screen.getByText('FIRST SAVES')).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByLabelText('Save Game 1')).toBeTruthy()
    );

    await fireEvent.press(screen.getByLabelText('Save Game 1'));
    expect(screen.getByText('Build my plan — 1 saved')).toBeTruthy();

    // Tapping again takes it back out, and the count follows.
    await fireEvent.press(screen.getByLabelText('Remove Game 1'));
    expect(screen.getByText('Start exploring')).toBeTruthy();
  });

  it('opens the plan when you finish with something saved', async () => {
    await renderApp(<Onboarding />);
    await fireEvent.press(screen.getByText('Set me up'));
    await fireEvent.press(screen.getByText('A couple of evenings'));
    await waitFor(() =>
      expect(screen.getByLabelText('Save Game 1')).toBeTruthy()
    );
    await fireEvent.press(screen.getByLabelText('Save Game 1'));
    await fireEvent.press(screen.getByText('Build my plan — 1 saved'));
    expect(router.push).toHaveBeenCalledWith('/plan');
  });

  it('leaves you where you are when you finish with nothing saved', async () => {
    await renderApp(<Onboarding />);
    await fireEvent.press(screen.getByText('Set me up'));
    await fireEvent.press(screen.getByText('A couple of evenings'));
    await waitFor(() =>
      expect(screen.getByText('Start exploring')).toBeTruthy()
    );
    await fireEvent.press(screen.getByText('Start exploring'));
    expect(router.push).not.toHaveBeenCalled();
  });
});
