import handler from '../twitch';
import { fakeReq, fakeRes } from './harness';

type Req = Parameters<typeof handler>[0];
type Res = Parameters<typeof handler>[1];

const SECRET = 'twitch-secret-xyz';

const call = async (over: Record<string, unknown>) => {
  const { res, sent } = fakeRes();
  await handler(fakeReq(over) as unknown as Req, res as unknown as Res);
  return sent;
};

const fetchMock = jest.fn();
const realFetch = global.fetch;
const ok = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

beforeEach(() => {
  process.env.TWITCH_CLIENT_ID = 'client-id';
  process.env.TWITCH_CLIENT_SECRET = SECRET;
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  // The module keeps its app token warm between invocations; feed every
  // test a fresh one so the cache never decides what a test sees.
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('oauth2/token'))
      return ok({ access_token: `tok-${Math.random()}`, expires_in: 0 });
    return ok({ data: [] });
  });
});
afterAll(() => {
  delete process.env.TWITCH_CLIENT_ID;
  delete process.env.TWITCH_CLIENT_SECRET;
  global.fetch = realFetch;
});

describe('api/twitch', () => {
  it('is GET only', async () => {
    const sent = await call({ method: 'POST', query: { game: 'Hades' } });
    expect(sent.code).toBe(405);
  });

  it('degrades to a soft 503 without credentials', async () => {
    delete process.env.TWITCH_CLIENT_SECRET;
    const sent = await call({ query: { game: 'Hades' } });
    expect(sent.code).toBe(503);
  });

  it('requires a game name', async () => {
    const sent = await call({ query: {} });
    expect(sent.code).toBe(400);
  });

  it('a game Twitch has never heard of is an empty list, not an error', async () => {
    const sent = await call({ query: { game: 'Obscure Indie' } });
    expect(sent.code).toBe(200);
    expect(sent.body).toEqual({ streams: [] });
  });

  it('maps live streams and fills in the thumbnail size', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('oauth2/token'))
        return ok({ access_token: 'tok', expires_in: 0 });
      if (url.includes('games?'))
        return ok({ data: [{ id: '10', name: 'Hades' }] });
      return ok({
        data: [
          {
            id: 's1',
            user_name: 'Speedrunner',
            user_login: 'speedrunner',
            title: 'any% attempts',
            viewer_count: 412,
            thumbnail_url:
              'https://static-cdn.jtvnw.net/x-{width}x{height}.jpg',
            language: 'en',
          },
        ],
      });
    });
    const sent = await call({ query: { game: 'Hades' } });
    expect(sent.code).toBe(200);
    const body = sent.body as { streams: { thumbnail: string }[] };
    expect(body.streams[0].thumbnail).toBe(
      'https://static-cdn.jtvnw.net/x-440x248.jpg'
    );
  });

  it('an upstream failure is a 502 with no secret in the body', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error(`token exchange failed, secret=${SECRET}`);
    });
    const sent = await call({ query: { game: 'Hades' } });
    expect(sent.code).toBe(502);
    expect(JSON.stringify(sent.body)).not.toContain(SECRET);
  });
});
