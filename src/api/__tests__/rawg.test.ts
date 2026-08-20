import {
  getGame,
  getMustPlayGames,
  searchCreators,
  searchGames,
} from '../rawg';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

function mockFetch(payload: unknown, ok = true, status = 200) {
  const spy = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Server Error',
    json: async () => payload,
  });
  global.fetch = spy as unknown as typeof fetch;
  return spy;
}

const urlOf = (spy: jest.Mock) => new URL(spy.mock.calls[0][0] as string);

describe('rawg client', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
  });

  it('attaches the API key to every request', async () => {
    const spy = mockFetch({ id: 1 });
    await getGame(3498);
    expect(urlOf(spy).searchParams.get('key')).toBe('test-key');
  });

  it('lowercases and encodes search queries', async () => {
    const spy = mockFetch({ count: 0, results: [] });
    await searchGames('Half-Life 2');
    const params = urlOf(spy).searchParams;
    expect(params.get('search')).toBe('half-life 2');
    expect(params.get('search_precise')).toBe('true');
  });

  it('unwraps the collection feed into plain games', async () => {
    mockFetch({
      count: 2,
      results: [{ game: { id: 1, name: 'A' } }, { game: { id: 2, name: 'B' } }],
    });
    const result = await getMustPlayGames();
    expect(result.results).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);
  });

  it('throws with the status code on a failed response', async () => {
    mockFetch({}, false, 503);
    await expect(getGame(1)).rejects.toThrow('503');
  });

  it('fails loudly when the API key is missing', async () => {
    delete process.env.EXPO_PUBLIC_RAWG_API_KEY;
    mockFetch({});
    await expect(getGame(1)).rejects.toThrow(/EXPO_PUBLIC_RAWG_API_KEY/);
  });
});

describe('api key hygiene', () => {
  it('strips whitespace pasted into the env var', async () => {
    process.env.EXPO_PUBLIC_RAWG_API_KEY = '  abc123\n\n';
    const spy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    });
    global.fetch = spy as unknown as typeof fetch;
    await getGame(1);
    const url = new URL(
      (spy.mock.calls[0][0] as string).replace(/^\/rawg/, 'https://x/rawg')
    );
    expect(url.searchParams.get('key')).toBe('abc123');
  });
});

describe('finding the people who make the games', () => {
  it('asks nothing for a word too short to be a name', async () => {
    const before = (globalThis.fetch as jest.Mock).mock.calls.length;
    expect(await searchCreators('su')).toEqual([]);
    expect((globalThis.fetch as jest.Mock).mock.calls).toHaveLength(before);
  });

  it('asks both endpoints and ranks by catalogue size', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/developers'))
          return new Response(
            JSON.stringify({
              results: [
                { id: 1, name: 'Small Studio', slug: 's', games_count: 3 },
              ],
            })
          );
        return new Response(
          JSON.stringify({
            results: [
              { id: 2, name: 'Big Label', slug: 'b', games_count: 300 },
            ],
          })
        );
      }
    );
    const found = await searchCreators('supergiant');
    expect(found.map((c) => c.name)).toEqual(['Big Label', 'Small Studio']);
    expect(found[0].kind).toBe('publisher');
  });

  it('keeps one entry when a studio publishes itself', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: String(input).includes('/developers') ? 1 : 2,
                name: 'Supergiant Games',
                slug: 'supergiant',
                games_count: String(input).includes('/developers') ? 8 : 12,
              },
            ],
          })
        )
    );
    const found = await searchCreators('supergiant');
    expect(found).toHaveLength(1);
    expect(found[0].gamesCount).toBe(12);
  });

  it('drops anyone with nothing to show', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            results: [{ id: 1, name: 'Empty', slug: 'e', games_count: 0 }],
          })
        )
    );
    expect(await searchCreators('empty')).toEqual([]);
  });

  it('survives one endpoint failing', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        if (String(input).includes('/developers'))
          return new Response('nope', { status: 500 });
        return new Response(
          JSON.stringify({
            results: [{ id: 2, name: 'Label', slug: 'l', games_count: 20 }],
          })
        );
      }
    );
    const found = await searchCreators('label');
    expect(found.map((c) => c.name)).toEqual(['Label']);
  });
});
