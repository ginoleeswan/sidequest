import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import HomeScreen from '../(tabs)/index';
import { tonightsShape } from '@/lib/homeFeed';
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
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    // Studios and publishers are their own endpoints; everything else is
    // whatever the test asked for.
    if (url.includes('/developers'))
      return new Response(
        JSON.stringify({
          results: [
            { id: 9, name: 'Supergiant Games', slug: 'sg', games_count: 8 },
          ],
        })
      );
    if (url.includes('/publishers'))
      return new Response(JSON.stringify({ results: [] }));
    return respond();
  }) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  // Each test starts on a desktop-shaped screen; the compact test opts
  // out for itself rather than leaving everyone after it on a phone.
  jest.mocked(useBreakpoint).mockReturnValue({
    width: 1280,
    isCompact: false,
    isExpanded: true,
    columns: 4,
  });
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
      expect(screen.getByText(tonightsShape(Date.now()).title)).toBeTruthy()
    );
    // Only the 3-hour game is short enough to qualify.
    expect(screen.getByText(tonightsShape(Date.now()).eyebrow)).toBeTruthy();
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

  /**
   * The phone's search is its own screen: the box opens on what you
   * looked for before, and answers with the first match drawn large
   * and the rest as rows — never a second heading repeating the query.
   */
  it('opens on your recent searches on a phone, and leads with the top result', async () => {
    compact();
    store['sidequest.searches.v1'] = JSON.stringify(['hades']);
    jest.useFakeTimers();
    try {
      await renderApp(<HomeScreen />);
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await fireEvent.press(screen.getByLabelText('Search games'));
      expect(screen.getByText('hades')).toBeTruthy();
      expect(screen.getByText('Start somewhere')).toBeTruthy();

      await fireEvent.press(screen.getByLabelText('Search again for hades'));
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await waitFor(() =>
        expect(screen.getByText('12 games for “hades”')).toBeTruthy()
      );
      expect(screen.getByText('Top result')).toBeTruthy();
      expect(screen.queryByText(/Results for/)).toBeNull();
      // The top result is drawn once, in the frame, not again as a row.
      expect(screen.getAllByText('Game 1')).toHaveLength(1);

      await fireEvent.press(screen.getByLabelText('Close search'));
      expect(screen.queryByText('Top result')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('leaves the storefront behind when you open a category', async () => {
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText(tonightsShape(Date.now()).title)).toBeTruthy()
    );
    await fireEvent.press(screen.getAllByText('Critically acclaimed')[0]);
    await waitFor(() =>
      expect(screen.queryByText(tonightsShape(Date.now()).title)).toBeNull()
    );
  });

  it('drops the sidebar on a phone', async () => {
    compact();
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getByText(tonightsShape(Date.now()).title)).toBeTruthy()
    );
    // The rail's tagline is the one string only the sidebar renders.
    expect(screen.queryByText('Discover your next game')).toBeNull();
  });

  /**
   * Search only ever looked at game titles, so the name of a studio
   * found nothing — the one search everybody tries after finishing
   * something they loved.
   */
  it('offers the studio as well as the games', async () => {
    jest.useFakeTimers();
    try {
      await renderApp(<HomeScreen />);
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await fireEvent.changeText(
        screen.getByPlaceholderText('Search games…'),
        'supergiant'
      );
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      await waitFor(() =>
        expect(screen.getByText('Supergiant Games (8)')).toBeTruthy()
      );
      expect(screen.getByText('Also by')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  /**
   * The storefront used to be the same five shelves in the same order
   * for everyone, for ever. These pin the three things that changed.
   */
  it('tells you what day it is, and what came out on it', async () => {
    await renderApp(<HomeScreen />);
    // The date lives in the stage's eyebrow now, next to the reason the
    // slide is there — a floating date line above a carousel said nothing
    // about anything on screen.
    const today = new Date()
      .toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      .toUpperCase();
    await waitFor(() =>
      expect(screen.getByText(new RegExp(today, 'i'))).toBeTruthy()
    );
  });

  it('leaves out the games you already saved', async () => {
    store['sidequest.library.v1'] = JSON.stringify({
      '3': {
        addedAt: 1,
        status: 'wishlist',
        game: { id: 3, name: 'Game 3', playtime: 10 },
      },
    });
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(screen.getAllByText('Game 1').length).toBeGreaterThan(0)
    );
    // Saved last week; the storefront has moved on.
    expect(screen.queryByText('Game 3')).toBeNull();
  });

  it('builds a shelf out of the last thing you saved', async () => {
    store['sidequest.library.v1'] = JSON.stringify({
      '99': {
        addedAt: 5,
        status: 'wishlist',
        game: {
          id: 99,
          name: 'Tunic',
          playtime: 12,
          genres: [{ id: 1, name: 'Puzzle', slug: 'puzzle' }],
        },
      },
    });
    await renderApp(<HomeScreen />);
    await waitFor(() =>
      expect(
        screen.getAllByText(/More puzzle, like Tunic/).length
      ).toBeGreaterThan(0)
    );
  });
});
