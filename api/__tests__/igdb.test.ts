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
