import handler, { pickGame, pickLogo } from '../logo';
import { fakeReq, fakeRes } from '../test-utils';

type Req = Parameters<typeof handler>[0];
type Res = Parameters<typeof handler>[1];

const call = async (over: Record<string, unknown>) => {
  const { res, sent } = fakeRes();
  await handler(fakeReq(over) as unknown as Req, res as unknown as Res);
  return sent;
};

const fetchMock = jest.fn();
const realFetch = global.fetch;
const ok = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const sgdb = (data: unknown) => ok({ success: true, data });

const logo = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  score: 0,
  style: 'official',
  width: 2400,
  height: 1200,
  nsfw: false,
  humor: false,
  epilepsy: false,
  mime: 'image/png',
  language: 'en',
  url: 'https://cdn2.steamgriddb.com/logo/a.png',
  thumb: 'https://cdn2.steamgriddb.com/logo_thumb/a.png',
  upvotes: 0,
  downvotes: 0,
  ...over,
});

beforeEach(() => {
  process.env.STEAMGRIDDB_API_KEY = 'sgdb-key';
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});
afterAll(() => {
  delete process.env.STEAMGRIDDB_API_KEY;
  global.fetch = realFetch;
});

describe('api/logo', () => {
  it('is GET only', async () => {
    const sent = await call({ method: 'POST', query: { name: 'Hades' } });
    expect(sent.code).toBe(405);
  });

  it('requires a name', async () => {
    const sent = await call({ query: {} });
    expect(sent.code).toBe(400);
  });

  it('asks SteamGridDB by Steam id first, and sends the key only there', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/logos/steam/1145360') ? sgdb([logo()]) : ok({})
    );
    const sent = await call({
      query: { name: 'Hades', year: '2020', steam: '1145360' },
    });
    expect(sent.code).toBe(200);
    expect(sent.body).toEqual({
      logo: expect.objectContaining({ source: 'sgdb', width: 2400 }),
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/logos/steam/1145360');
    expect(init.headers.Authorization).toBe('Bearer sgdb-key');
    expect(sent.headers['Cache-Control']).toContain('s-maxage=604800');
  });

  it('searches by name when there is no Steam id, and lands on the exact title', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/search/autocomplete/'))
        return sgdb([
          {
            id: 2,
            name: "Hades' Star",
            verified: true,
            release_date: 1551282908,
          },
          { id: 1, name: 'Hades', verified: true, release_date: 1575997566 },
        ]);
      if (url.includes('/logos/game/1')) return sgdb([logo({ id: 7 })]);
      return ok({});
    });
    const sent = await call({ query: { name: 'Hades', year: '2020' } });
    expect(sent.body).toEqual({
      logo: expect.objectContaining({ source: 'sgdb' }),
    });
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/logos/game/1?')
      )
    ).toBe(true);
  });

  it('would rather answer nothing than another game', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/search/autocomplete/')
        ? sgdb([{ id: 2, name: "Hades' Star", verified: true }])
        : ok({})
    );
    const sent = await call({ query: { name: 'Hades' } });
    expect(sent.body).toEqual({ logo: null });
    expect(sent.headers['Cache-Control']).toContain('s-maxage=86400');
  });

  it("falls back to Steam's own logo when SteamGridDB has none", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('steamgriddb')) return sgdb([]);
      if (
        url.includes('cdn.cloudflare.steamstatic.com') &&
        init?.method === 'HEAD'
      )
        return Promise.resolve({ ok: true });
      return ok({});
    });
    const sent = await call({
      query: { name: 'Hades', steam: '1145360' },
    });
    expect(sent.body).toEqual({
      logo: expect.objectContaining({
        source: 'steam',
        url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/logo.png',
      }),
    });
  });

  it('works from Steam alone when no key is configured', async () => {
    delete process.env.STEAMGRIDDB_API_KEY;
    fetchMock.mockImplementation(() => Promise.resolve({ ok: true }));
    const sent = await call({ query: { name: 'Hades', steam: '1145360' } });
    expect(sent.body).toEqual({
      logo: expect.objectContaining({ source: 'steam' }),
    });
    expect(
      fetchMock.mock.calls.every(
        ([url]) => !String(url).includes('steamgriddb')
      )
    ).toBe(true);
  });

  it('is a typed title, not an error, when upstream is down', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('down')));
    const sent = await call({ query: { name: 'Hades', steam: '1' } });
    expect(sent.code).toBe(200);
    expect(sent.body).toEqual({ logo: null });
  });
});

describe('choosing the game', () => {
  const games = [
    { id: 1, name: 'Prey', verified: true, release_date: 1494000000 }, // 2017
    { id: 2, name: 'Prey', verified: true, release_date: 1152000000 }, // 2006
    { id: 3, name: 'Prey Day', verified: true, release_date: 1494000000 },
  ];

  it('separates two games that share a title by year', () => {
    expect(pickGame(games, 'Prey', 2006)?.id).toBe(2);
    expect(pickGame(games, 'Prey', 2017)?.id).toBe(1);
  });

  it('ignores punctuation and case but not words', () => {
    expect(pickGame(games, 'PREY', 2017)?.id).toBe(1);
    expect(pickGame(games, 'Prey: Day', 2017)?.id).toBe(3);
    expect(pickGame(games, 'Pray', 2017)).toBeNull();
  });
});

describe('choosing the logo', () => {
  it('prefers official, then white, then black, and never a badge', () => {
    const best = pickLogo([
      logo({ id: 1, style: 'black' }),
      logo({ id: 2, style: 'white' }),
      logo({ id: 3, style: 'official', width: 300, height: 400 }),
      logo({ id: 4, style: 'official', upvotes: 3 }),
      logo({ id: 5, style: 'official', upvotes: 9 }),
    ]);
    expect(best?.id).toBe(5);
  });

  it('refuses anything flagged or not a still PNG', () => {
    expect(
      pickLogo([
        logo({ nsfw: true }),
        logo({ humor: true }),
        logo({ mime: 'image/webp' }),
      ])
    ).toBeNull();
  });
});
