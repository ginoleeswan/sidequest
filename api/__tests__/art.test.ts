import handler, { pickGame, pickGrid, pickHero, pickLogo } from '../art';
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

const asset = (over: Partial<Record<string, unknown>> = {}) => ({
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
const hero = (over = {}) =>
  asset({
    style: 'alternate',
    width: 1920,
    height: 620,
    url: 'h.png',
    thumb: 'h.jpg',
    ...over,
  });
const grid = (over = {}) =>
  asset({
    style: 'alternate',
    width: 600,
    height: 900,
    url: 'g.png',
    thumb: 'g.jpg',
    ...over,
  });
const icon = (over = {}) =>
  asset({
    width: 0,
    height: 0,
    mime: 'image/vnd.microsoft.icon',
    url: 'i.ico',
    thumb: 'i/256.png',
    ...over,
  });

/** Answers every SteamGridDB category for one game. */
const catalogue = (url: string) => {
  if (url.includes('/logos/')) return sgdb([asset()]);
  if (url.includes('/heroes/')) return sgdb([hero()]);
  if (url.includes('/grids/')) return sgdb([grid()]);
  if (url.includes('/icons/')) return sgdb([icon()]);
  return ok({});
};

beforeEach(() => {
  process.env.STEAMGRIDDB_API_KEY = 'sgdb-key';
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});
afterAll(() => {
  delete process.env.STEAMGRIDDB_API_KEY;
  global.fetch = realFetch;
});

describe('api/art', () => {
  it('is GET only', async () => {
    const sent = await call({ method: 'POST', query: { name: 'Hades' } });
    expect(sent.code).toBe(405);
  });

  it('requires a name', async () => {
    const sent = await call({ query: {} });
    expect(sent.code).toBe(400);
  });

  it('asks all four categories by Steam id at once, with the key only there', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/steam/1145360?') ? catalogue(url) : ok({})
    );
    const sent = await call({
      query: { name: 'Hades', year: '2020', steam: '1145360' },
    });
    expect(sent.code).toBe(200);
    expect(sent.body).toEqual({
      logo: expect.objectContaining({ source: 'sgdb', width: 2400 }),
      hero: expect.objectContaining({ width: 1920, height: 620 }),
      grid: expect.objectContaining({ width: 600, height: 900 }),
      // The .ico is the file; the 256px PNG is the picture.
      icon: expect.objectContaining({ url: 'i/256.png', width: 256 }),
    });
    const paths = fetchMock.mock.calls.map(([url]) => String(url));
    expect(paths.filter((p) => p.includes('/steam/1145360?'))).toHaveLength(4);
    for (const [, init] of fetchMock.mock.calls)
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
      if (url.includes('/game/1?')) return catalogue(url);
      return sgdb([]);
    });
    const sent = await call({ query: { name: 'Hades', year: '2020' } });
    expect(sent.body).toEqual(
      expect.objectContaining({
        logo: expect.objectContaining({ source: 'sgdb' }),
      })
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/game/2?'))
    ).toBe(false);
  });

  it('would rather answer nothing than another game', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('/search/autocomplete/')
        ? sgdb([{ id: 2, name: "Hades' Star", verified: true }])
        : sgdb([])
    );
    const sent = await call({ query: { name: 'Hades' } });
    expect(sent.body).toEqual({
      logo: null,
      hero: null,
      grid: null,
      icon: null,
    });
    expect(sent.headers['Cache-Control']).toContain('s-maxage=86400');
  });

  it("fills what SteamGridDB lacks from Steam's own files, per asset", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('steamgriddb'))
        return url.includes('/logos/') ? sgdb([asset()]) : sgdb([]);
      if (url.includes('steamstatic.com') && init?.method === 'HEAD')
        return Promise.resolve({ ok: !url.endsWith('library_600x900.jpg') });
      return ok({});
    });
    const sent = await call({ query: { name: 'Hades', steam: '1145360' } });
    expect(sent.body).toEqual({
      // Kept from SteamGridDB, not replaced.
      logo: expect.objectContaining({ source: 'sgdb' }),
      hero: expect.objectContaining({
        source: 'steam',
        url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_hero.jpg',
        width: 3840,
      }),
      // Valve had no box art for it either.
      grid: null,
      icon: null,
    });
  });

  it('works from Steam alone when no key is configured', async () => {
    delete process.env.STEAMGRIDDB_API_KEY;
    fetchMock.mockImplementation(() => Promise.resolve({ ok: true }));
    const sent = await call({ query: { name: 'Hades', steam: '1145360' } });
    expect(sent.body).toEqual(
      expect.objectContaining({
        logo: expect.objectContaining({ source: 'steam' }),
        grid: expect.objectContaining({ source: 'steam', width: 600 }),
      })
    );
    expect(
      fetchMock.mock.calls.every(
        ([url]) => !String(url).includes('steamgriddb')
      )
    ).toBe(true);
  });

  it('is RAWG art, not an error, when upstream is down', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('down')));
    const sent = await call({ query: { name: 'Hades', steam: '1' } });
    expect(sent.code).toBe(200);
    expect(sent.body).toEqual({
      logo: null,
      hero: null,
      grid: null,
      icon: null,
    });
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

describe('choosing the assets', () => {
  it('logo: official, then white, then black, by vote, and never a badge', () => {
    const best = pickLogo([
      asset({ id: 1, style: 'black' }),
      asset({ id: 2, style: 'white' }),
      asset({ id: 3, style: 'official', width: 300, height: 400 }),
      asset({ id: 4, style: 'official', upvotes: 3 }),
      asset({ id: 5, style: 'official', upvotes: 9 }),
    ]);
    expect(best?.id).toBe(5);
  });

  it('hero: the artwork at banner proportions, never blurred or square', () => {
    const best = pickHero([
      hero({ id: 1, style: 'blurred' }),
      hero({ id: 2, width: 1920, height: 1080 }),
      hero({ id: 3, width: 1600, height: 650 }),
      hero({ id: 4, style: 'alternate', upvotes: 2 }),
    ]);
    expect(best?.id).toBe(4);
  });

  it('grid: only the 600×900 box, and nothing flagged', () => {
    expect(
      pickGrid([grid({ width: 920, height: 430 }), grid({ humor: true })])
    ).toBeNull();
    expect(pickGrid([grid({ id: 9 })])?.id).toBe(9);
  });
});
