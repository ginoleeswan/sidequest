import { screen, waitFor } from '@testing-library/react-native';

import { TodayLine } from '../TodayLine';
import { renderApp } from '@/test-utils';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
let count: number;

beforeAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(
    async () => new Response(JSON.stringify({ count, next: null, results: [] }))
  ) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  count = 4;
});

const today = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

/**
 * The cheapest way to make a page feel alive is for it to know what day
 * it is — and the easiest way to break hydration is to bake that date
 * into HTML built weeks ago.
 */
describe('the date line', () => {
  it('says what day it is', async () => {
    await renderApp(<TodayLine />);
    await waitFor(() => expect(screen.getByText(today())).toBeTruthy());
  });

  it('says how many games came out today', async () => {
    await renderApp(<TodayLine />);
    await waitFor(() =>
      expect(screen.getByText('4 games out today')).toBeTruthy()
    );
  });

  it('counts one game as one game', async () => {
    count = 1;
    await renderApp(<TodayLine />);
    await waitFor(() =>
      expect(screen.getByText('1 game out today')).toBeTruthy()
    );
  });

  it('says nothing at all on a quiet day', async () => {
    count = 0;
    await renderApp(<TodayLine />);
    await waitFor(() => expect(screen.getByText(today())).toBeTruthy());
    expect(screen.queryByText(/out today/)).toBeNull();
  });

  it('keeps the date when RAWG will not answer', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await renderApp(<TodayLine />);
    await waitFor(() => expect(screen.getByText(today())).toBeTruthy());
    expect(screen.queryByText(/out today/)).toBeNull();
  });
});
