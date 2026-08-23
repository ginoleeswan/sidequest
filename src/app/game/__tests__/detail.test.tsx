import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import GameInfoScreen from '../[id]';
import type { GameDetail } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { renderApp, useFakeStorage } from '@/test-utils';

jest.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: jest.fn(() => ({
    width: 390,
    isCompact: true,
    isExpanded: false,
    columns: 2,
  })),
}));

const detail = {
  id: 1,
  slug: 'celeste',
  name: 'Celeste',
  description: '<p>A mountain, &amp; a girl who climbs it.</p>',
  playtime: 12,
  released: '2018-01-25',
  rating: 4.5,
  metacritic: 91,
  background_image: null,
  parent_platforms: [],
  genres: [{ id: 1, name: 'Platformer', slug: 'platformer' }],
} as unknown as GameDetail;

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
let store: Record<string, string>;
let failing = false;

const empty = { count: 0, next: null, results: [] };

beforeAll(() => {
  store = useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    if (failing) return new Response('nope', { status: 500 });
    const url = String(input);
    if (/\/(screenshots|movies|game-series|stores)\?/.test(url)) {
      return new Response(JSON.stringify(empty));
    }
    return new Response(JSON.stringify(detail));
  }) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
  delete (globalThis as { routeParams?: unknown }).routeParams;
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  failing = false;
  (globalThis as { routeParams?: unknown }).routeParams = { id: '1' };
});

/**
 * The detail screen is where a game becomes a decision: how long it is,
 * whether it is already yours, and what it actually is underneath RAWG's
 * HTML.
 */
describe('the game screen', () => {
  it('names the game once its four endpoints have answered', async () => {
    await renderApp(<GameInfoScreen />);
    await waitFor(() => expect(screen.getByText('Celeste')).toBeTruthy());
  });

  it('strips the markup RAWG sends, and decodes its entities', async () => {
    await renderApp(<GameInfoScreen />);
    await waitFor(() =>
      expect(
        screen.getByText('A mountain, & a girl who climbs it.')
      ).toBeTruthy()
    );
  });

  /**
   * The length is the masthead's figure now rather than one of five
   * equal columns, so the label reads as the sentence it finishes —
   * "5h to finish" — and the whole line is the target.
   */
  it('shows the length, and offers to correct it', async () => {
    await renderApp(<GameInfoScreen />);
    await waitFor(() => expect(screen.getByText(/to finish/)).toBeTruthy());
    await fireEvent.press(
      screen.getByLabelText('Change how long Celeste takes')
    );
    expect(screen.getByText('HOW LONG DOES IT TAKE?')).toBeTruthy();
  });

  it('calls the length yours once you have set one', async () => {
    store['sidequest.durations.v1'] = JSON.stringify({ '1': 9 });
    await renderApp(<GameInfoScreen />);
    await waitFor(() => expect(screen.getByText(/your length/)).toBeTruthy());
  });

  it('says so when the game cannot be loaded', async () => {
    failing = true;
    await renderApp(<GameInfoScreen />);
    await waitFor(() =>
      expect(screen.getByText("Couldn't load this game")).toBeTruthy()
    );
  });

  it('lays out wide when there is room for it', async () => {
    jest.mocked(useBreakpoint).mockReturnValue({
      width: 1280,
      isCompact: false,
      isExpanded: true,
      columns: 4,
    });
    await renderApp(<GameInfoScreen />);
    await waitFor(() => expect(screen.getByText('Celeste')).toBeTruthy());
  });
});
