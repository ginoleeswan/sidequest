import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '../index';
import type { Game } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { renderApp, useFakeStorage } from '@/test-utils';

jest.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: jest.fn(() => ({
    width: 1280,
    isCompact: false,
    isExpanded: true,
    columns: 4,
  })),
}));

const compact = () =>
  jest.mocked(useBreakpoint).mockReturnValue({
    width: 390,
    isCompact: true,
    isExpanded: false,
    columns: 2,
  });

const games: Game[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Game ${i + 1}`,
  playtime: i === 0 ? 3 : 40,
  rating: 4,
  released: '2024-05-05',
  background_image: null,
})) as unknown as Game[];

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
let store: Record<string, string>;
let respond: () => Response;

beforeAll(() => {
  store = useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(async () => respond()) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  // Onboarding would cover the screen on a first visit.
  store['sidequest.onboarded.v1'] = JSON.stringify(true);
  respond = () =>
    new Response(
      JSON.stringify({ count: games.length, next: null, results: games })
    );
});

/**
 * The storefront. Its job is to answer three different questions from
 * one screen — what's out there, what am I looking for, and what can I
 * play tonight — so these pin each of those states rather than layout.
 */
describe('the home screen', () => {
  it('shows the shelves once the games arrive', async () => {
    await renderApp(<HomeScreen />);
    // Twice over: once as the rail's nav item, once as the shelf itself.
    await waitFor(() =>
      expect(screen.getAllByText('Trending now').length).toBe(2)
    );
    expect(screen.getAllByText('Game 1').length).toBeGreaterThan(0);
  });

  it('offers a quick-wins shelf built from what it already has', async () => {
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText('Finish it this weekend')).toBeTruthy()
    );
    // Only the 3-hour game is short enough to qualify.
    expect(screen.getByText('Under 8 hours')).toBeTruthy();
  });

  it('says so plainly when RAWG cannot be reached', async () => {
    respond = () => new Response('nope', { status: 503 });
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText("Couldn't reach RAWG")).toBeTruthy()
    );
  });

  it('searches after you stop typing, not on every keystroke', async () => {
    jest.useFakeTimers();
    try {
      await renderApp(<HomeScreen />);
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await fireEvent.changeText(
        screen.getByPlaceholderText('Search games…'),
        'hollow'
      );
      expect(screen.queryByText(/Results for/)).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await waitFor(() =>
        expect(screen.getByText('Results for “hollow”')).toBeTruthy()
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers a way back when a search finds nothing', async () => {
    jest.useFakeTimers();
    try {
      await renderApp(<HomeScreen />);
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      respond = () =>
        new Response(JSON.stringify({ count: 0, next: null, results: [] }));
      await fireEvent.changeText(
        screen.getByPlaceholderText('Search games…'),
        'zzzzzz'
      );
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await waitFor(() =>
        expect(screen.getByText('No games match "zzzzzz"')).toBeTruthy()
      );
      expect(screen.getByText('Clear search')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('leaves the storefront behind when you open a category', async () => {
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText('Finish it this weekend')).toBeTruthy()
    );
    await fireEvent.press(screen.getAllByText('Critically acclaimed')[0]);
    await waitFor(() =>
      expect(screen.queryByText('Finish it this weekend')).toBeNull()
    );
  });

  it('drops the sidebar on a phone', async () => {
    compact();
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText('Finish it this weekend')).toBeTruthy()
    );
    // The rail's tagline is the one string only the sidebar renders.
    expect(screen.queryByText('Discover your next game')).toBeNull();
  });
});
