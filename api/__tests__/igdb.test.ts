import handler from '../igdb';
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

/** IGDB's queries arrive as the POST body; capture them for assertions. */
const bodies: string[] = [];

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'client-id';
  process.env.TWITCH_CLIENT_SECRET = 'client-secret';
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  bodies.length = 0;
  fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
    if (url.includes('oauth2/token'))
      return ok({ access_token: `tok-${Math.random()}`, expires_in: 0 });
    if (init?.body) bodies.push(init.body);
    return ok([]);
  });
});
afterAll(() => {
  delete process.env.TWITCH_CLIENT_ID;
  delete process.env.TWITCH_CLIENT_SECRET;
  global.fetch = realFetch;
});

describe('api/igdb', () => {
  it('drops slugs that could carry query syntax, keeping the clean ones', async () => {
    await call({
      query: { slugs: 'hades,"; fields *;--,celeste' },
    });
    const gamesQuery = bodies[0] ?? '';
    expect(gamesQuery).toContain('"hades"');
    expect(gamesQuery).toContain('"celeste"');
    expect(gamesQuery).not.toContain('fields *');
  });

  it('nothing valid to ask about is a 400, not an empty upstream call', async () => {
    const sent = await call({ query: { slugs: '"; fields *;' } });
    expect(sent.code).toBe(400);
    expect(bodies).toHaveLength(0);
  });

  it('maps seconds to hours per slug, skipping games with no timings', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 0 });
      if (init?.body?.includes('fields id,slug'))
        return ok([
          { id: 1, slug: 'hades' },
          { id: 2, slug: 'celeste' },
        ]);
      return ok([{ game_id: 1, normally: 72_000, hastily: 36_000, count: 40 }]);
    });
    const sent = await call({ query: { slugs: 'hades,celeste' } });
    expect(sent.code).toBe(200);
    const { durations } = sent.body as {
      durations: Record<string, { normally: number | null }>;
    };
    expect(durations.hades.normally).toBe(20);
    expect(durations.celeste).toBeUndefined();
  });

  it('degrades to a soft 503 without credentials', async () => {
    delete process.env.TWITCH_CLIENT_ID;
    const sent = await call({ query: { slugs: 'hades' } });
    expect(sent.code).toBe(503);
  });

  it('an upstream failure is a 502 with a fixed message', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error('internal: secret leaked here');
    });
    const sent = await call({ query: { slugs: 'hades' } });
    expect(sent.code).toBe(502);
    expect(JSON.stringify(sent.body)).not.toContain('internal');
  });

  /**
   * The enrichment half of the payload: what the page draws that the
   * durations do not carry. The shape is a contract with two clients
   * (src/api/igdb and the page), so it is pinned here where a drift
   * fails a test instead of quietly blanking a shelf.
   */
  it('carries cover, critic, storyline and the similar graph per slug', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 0 });
      if (init?.body?.includes('game_time_to_beats')) return ok([]);
      if (init?.body) {
        bodies.push(init.body);
        return ok([
          {
            id: 1,
            slug: 'hades',
            cover: { image_id: 'co123' },
            aggregated_rating: 92.4,
            aggregated_rating_count: 31,
            storyline: 'Escape the underworld.',
            similar_games: [
              { slug: 'celeste', name: 'Celeste', cover: { image_id: 'co9' } },
              { slug: 'no-cover', name: 'No Cover' },
              { name: 'No Slug', cover: { image_id: 'co8' } },
            ],
          },
        ]);
      }
      return ok([]);
    });
    const sent = await call({ query: { slugs: 'hades' } });
    const extras = (
      sent.body as {
        extras: Record<
          string,
          {
            cover: string;
            critic: number;
            criticCount: number;
            storyline: string;
            similar: { slug: string; name: string; cover: string }[];
          }
        >;
      }
    ).extras.hades;
    expect(extras.cover).toBe('co123');
    // Rounded: a critic aggregate with decimals promises a precision
    // thirty-one reviews do not have.
    expect(extras.critic).toBe(92);
    expect(extras.criticCount).toBe(31);
    expect(extras.storyline).toBe('Escape the underworld.');
    // Only entries with both a destination and a picture survive: a
    // card missing either is not a recommendation.
    expect(extras.similar).toEqual([
      { slug: 'celeste', name: 'Celeste', cover: 'co9' },
    ]);
  });
});

/**
 * The rescue pass: what exact matching misses, IGDB's own search finds.
 *
 * Pinned to the case that exposed it - RAWG's "Slay the Spire 2" is
 * IGDB's "Slay the Spire II", unreachable by slug or exact name - and
 * to the guard that keeps fuzzy results honest: a hit is adopted only
 * when the release year agrees.
 */
describe('the search rescue', () => {
  const YEAR_2026 = Math.floor(Date.UTC(2026, 5, 1) / 1000);

  it('rescues a numeral-style mismatch through search, keyed to the asked slug', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 3600 });
      const body = init?.body ?? '';
      bodies.push(body);
      if (body.includes('search "Slay the Spire 2"'))
        return ok([
          {
            id: 296831,
            slug: 'slay-the-spire-ii',
            name: 'Slay the Spire II',
            first_release_date: YEAR_2026,
            cover: { image_id: 'co-sts2' },
          },
        ]);
      return ok([]);
    });

    const sent = await call({
      query: {
        slugs: 'slay-the-spire-2',
        names: 'Slay the Spire 2',
        years: '2026',
      },
    });
    expect(sent.code).toBe(200);
    const extras = (
      sent.body as { extras: Record<string, { cover: string | null }> }
    ).extras;
    // Keyed to the slug the client asked with, not IGDB's own.
    expect(extras['slay-the-spire-2'].cover).toBe('co-sts2');
  });

  it('refuses a search hit whose year disagrees', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 3600 });
      const body = init?.body ?? '';
      bodies.push(body);
      if (body.includes('search'))
        return ok([
          {
            id: 1,
            slug: 'marathon',
            name: 'Marathon',
            first_release_date: Math.floor(Date.UTC(1994, 5, 1) / 1000),
            cover: { image_id: 'co-1994' },
          },
        ]);
      return ok([]);
    });

    const sent = await call({
      query: { slugs: 'marathon-x', names: 'Marathon', years: '2026' },
    });
    expect(sent.code).toBe(200);
    // A wrong cover is worse than no cover.
    expect(
      (sent.body as { extras: Record<string, unknown> }).extras['marathon-x']
    ).toBeUndefined();
  });
});

/**
 * An announced game has no release date on IGDB yet, so no year can
 * ever agree with it; an exact name is enough for those. A dated entry
 * whose year disagrees is still refused.
 */
describe('the search rescue for misspelt names', () => {
  const YEAR_2026 = Math.floor(Date.UTC(2026, 6, 9) / 1000);
  const loose = `search "assassin's creed resynced"`;

  it('finds the game from its distinctive words when the full name misses', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 3600 });
      const body = init?.body ?? '';
      bodies.push(body);
      if (body.includes(loose))
        return ok([
          {
            id: 337738,
            slug: 'assassins-creed-black-flag-resynced',
            name: "Assassin's Creed Black Flag Resynced",
            first_release_date: YEAR_2026,
            cover: { image_id: 'co-acbf' },
          },
          {
            id: 1,
            slug: 'assassins-creed-shadows',
            name: "Assassin's Creed Shadows",
            first_release_date: YEAR_2026,
            cover: { image_id: 'co-wrong' },
          },
        ]);
      return ok([]);
    });

    const sent = await call({
      query: {
        slugs: 'assassins-creed-back-flag-resynced',
        names: "Assassin's Creed Back Flag Resynced",
        years: '2026',
      },
    });
    expect(sent.code).toBe(200);
    const extras = (
      sent.body as { extras: Record<string, { cover: string | null }> }
    ).extras;
    expect(extras['assassins-creed-back-flag-resynced'].cover).toBe('co-acbf');
    // The full name was tried first; the loose query only after it missed.
    expect(
      bodies.some((b) =>
        b.includes(`search "Assassin's Creed Back Flag Resynced"`)
      )
    ).toBe(true);
  });

  it('refuses a same-year hit that lacks one of the distinctive words', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 3600 });
      const body = init?.body ?? '';
      if (body.includes(loose))
        return ok([
          {
            id: 1,
            slug: 'assassins-creed-shadows',
            name: "Assassin's Creed Shadows",
            first_release_date: YEAR_2026,
            cover: { image_id: 'co-wrong' },
          },
        ]);
      return ok([]);
    });

    const sent = await call({
      query: {
        slugs: 'assassins-creed-back-flag-resynced',
        names: "Assassin's Creed Back Flag Resynced",
        years: '2026',
      },
    });
    const extras = (
      sent.body as { extras: Record<string, { cover: string | null }> }
    ).extras;
    expect(extras['assassins-creed-back-flag-resynced']).toBeUndefined();
  });
});

describe('the search rescue for undated games', () => {
  it('adopts an exact-name match that has no release date yet', async () => {
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 3600 });
      const body = init?.body ?? '';
      bodies.push(body);
      if (body.includes('search "Phantom Blade Zero"'))
        return ok([
          {
            id: 77,
            slug: 'phantom-blade-zero',
            name: 'Phantom Blade Zero',
            cover: { image_id: 'co-pbz' },
          },
        ]);
      return ok([]);
    });
    const sent = await call({
      query: {
        slugs: 'phantom-blade-zero-1',
        names: 'Phantom Blade Zero',
        years: '2026',
      },
    });
    expect(sent.code).toBe(200);
    expect(
      (sent.body as { extras: Record<string, { cover: string | null }> })
        .extras['phantom-blade-zero-1'].cover
    ).toBe('co-pbz');
  });
  it('an unusable slug keeps every later name on its own game', async () => {
    const zero = {
      id: 1,
      slug: 'star-wars-zero-company',
      name: 'Star Wars Zero Company',
      first_release_date: Date.UTC(2026, 3, 1) / 1000,
      cover: { image_id: 'coc7a0' },
    };
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 0 });
      if (init?.body) bodies.push(init.body);
      if (init?.body?.includes('search')) return ok([]);
      return ok([zero]);
    });
    const sent = await call({
      query: {
        slugs: '"; bad,star-wars-zero-company,city-33',
        names: 'Bad|Star Wars Zero Company|City 33',
        years: '2026|2026|2026',
      },
    });
    const extras = (sent.body as { extras: Record<string, { cover?: string }> })
      .extras;
    expect(extras['star-wars-zero-company']?.cover).toBe('coc7a0');
    expect(extras['city-33']).toBeUndefined();
  });

  it('search does not rescue a same-year stranger', async () => {
    const stranger = {
      id: 2,
      slug: 'somewhere-else-2026',
      name: 'Somewhere Else',
      first_release_date: Date.UTC(2026, 3, 1) / 1000,
      cover: { image_id: 'cox' },
    };
    fetchMock.mockImplementation((url: string, init?: { body?: string }) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 0 });
      if (init?.body) bodies.push(init.body);
      if (init?.body?.includes('search')) return ok([stranger]);
      return ok([]);
    });
    const sent = await call({
      query: { slugs: 'city-33', names: 'City 33', years: '2026' },
    });
    const extras = (sent.body as { extras: Record<string, { cover?: string }> })
      .extras;
    expect(extras['city-33']).toBeUndefined();
  });
});
