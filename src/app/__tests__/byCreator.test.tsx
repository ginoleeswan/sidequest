import { screen, waitFor } from '@testing-library/react-native';

import ByCreatorScreen from '../by/[kind]';
import { renderApp, useFakeStorage } from '@/test-utils';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
let respond: () => Response;

beforeAll(() => {
  useFakeStorage();
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(async () => respond()) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
  delete (globalThis as { routeParams?: unknown }).routeParams;
});
beforeEach(() => {
  (globalThis as { routeParams?: unknown }).routeParams = {
    kind: 'developer',
    id: '9',
    name: 'Supergiant Games',
  };
  respond = () =>
    new Response(
      JSON.stringify({
        count: 2,
        next: null,
        results: [
          { id: 1, name: 'Hades', playtime: 21, rating: 4.7 },
          { id: 2, name: 'Bastion', playtime: 9, rating: 4.3 },
        ],
      })
    );
});

/**
 * "What else did the people who made this make?" had no answer before
 * this screen existed.
 */
describe('a studio’s catalogue', () => {
  it('names whose catalogue it is', async () => {
    await renderApp(<ByCreatorScreen />);
    await waitFor(() =>
      expect(screen.getByText('Supergiant Games')).toBeTruthy()
    );
    expect(screen.getByText('DEVELOPER')).toBeTruthy();
    expect(screen.getByText('2 games, newest first')).toBeTruthy();
  });

  it('lists the games', async () => {
    await renderApp(<ByCreatorScreen />);
    await waitFor(() => expect(screen.getByText('Hades')).toBeTruthy());
    expect(screen.getByText('Bastion')).toBeTruthy();
  });

  it('knows a publisher from a developer', async () => {
    (globalThis as { routeParams?: unknown }).routeParams = {
      kind: 'publisher',
      id: '4',
      name: 'Annapurna Interactive',
    };
    await renderApp(<ByCreatorScreen />);
    await waitFor(() => expect(screen.getByText('PUBLISHER')).toBeTruthy());
  });

  it('says so when the catalogue cannot be loaded', async () => {
    respond = () => new Response('nope', { status: 503 });
    await renderApp(<ByCreatorScreen />);
    await waitFor(() =>
      expect(screen.getByText('Couldn’t load that catalogue')).toBeTruthy()
    );
  });

  it('handles a studio RAWG has nothing filed under', async () => {
    respond = () =>
      new Response(JSON.stringify({ count: 0, next: null, results: [] }));
    await renderApp(<ByCreatorScreen />);
    await waitFor(() => expect(screen.getByText('Nothing here')).toBeTruthy());
  });
});
