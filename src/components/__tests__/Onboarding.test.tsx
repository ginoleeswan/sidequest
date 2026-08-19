import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { Onboarding } from '../Onboarding';
import type { Game } from '@/api/types';
import { renderApp, useFakeStorage } from '@/test-utils';

const picks: Game[] = [1, 2, 3, 4, 5, 6].map(
  (id) => ({ id, name: `Game ${id}`, playtime: 10 }) as Game
);

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(
    async () =>
      new Response(
        JSON.stringify({ count: picks.length, next: null, results: picks })
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
    expect(screen.getByText('Set me up — 20 seconds')).toBeTruthy();
  });

  it('stays away once it has been seen', async () => {
    store['sidequest.onboarded.v1'] = JSON.stringify(true);
    await renderApp(<Onboarding />);
    expect(screen.queryByText('Set me up — 20 seconds')).toBeNull();
  });

  it('remembers being skipped, and does not send you anywhere', async () => {
    await renderApp(<Onboarding />);
    await fireEvent.press(screen.getByText('Skip the tour'));
    await waitFor(() =>
      expect(store['sidequest.onboarded.v1']).toBe(JSON.stringify(true))
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('seeds the plan with the pace you claim, then moves on', async () => {
    jest.useFakeTimers();
    try {
      await renderApp(<Onboarding />);
      await fireEvent.press(screen.getByText('Set me up — 20 seconds'));
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
    await fireEvent.press(screen.getByText('Set me up — 20 seconds'));
    expect(screen.getByText('YOUR PACE')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByText('Set me up — 20 seconds')).toBeTruthy();
  });

  it('saves what you tap, and counts it on the button', async () => {
    await renderApp(<Onboarding />);
    await fireEvent.press(screen.getByText('Set me up — 20 seconds'));
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
    await fireEvent.press(screen.getByText('Set me up — 20 seconds'));
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
    await fireEvent.press(screen.getByText('Set me up — 20 seconds'));
    await fireEvent.press(screen.getByText('A couple of evenings'));
    await waitFor(() =>
      expect(screen.getByText('Start exploring')).toBeTruthy()
    );
    await fireEvent.press(screen.getByText('Start exploring'));
    expect(router.push).not.toHaveBeenCalled();
  });
});
