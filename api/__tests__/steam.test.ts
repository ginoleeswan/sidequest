import handler from '../steam';
import { fakeReq, fakeRes } from './harness';

type Req = Parameters<typeof handler>[0];
type Res = Parameters<typeof handler>[1];

const KEY = 'steam-key-abc123';

const call = async (over: Record<string, unknown>) => {
  const { res, sent } = fakeRes();
  await handler(fakeReq(over) as unknown as Req, res as unknown as Res);
  return sent;
};

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeEach(() => {
  process.env.STEAM_API_KEY = KEY;
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});
afterAll(() => {
  delete process.env.STEAM_API_KEY;
  global.fetch = realFetch;
});

const json = (body: unknown) =>
  Promise.resolve({ json: () => Promise.resolve(body) });

describe('api/steam', () => {
  it('is a soft 503 without a key, and never a crash', async () => {
    delete process.env.STEAM_API_KEY;
    const sent = await call({ query: { op: 'resolve', vanity: 'gabe' } });
    expect(sent.code).toBe(503);
  });

  it('rejects a vanity name that is not a vanity name', async () => {
    const sent = await call({
      query: { op: 'resolve', vanity: 'not/a?name&key=steal' },
    });
    expect(sent.code).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves a vanity to a steamid', async () => {
    fetchMock.mockReturnValueOnce(
      json({ response: { success: 1, steamid: '76561197960287930' } })
    );
    const sent = await call({ query: { op: 'resolve', vanity: 'gabe' } });
    expect(sent.code).toBe(200);
    expect(sent.body).toEqual({ steamid: '76561197960287930' });
  });

  it('rejects a steamid that is not a SteamID64', async () => {
    const sent = await call({ query: { op: 'owned', steamid: '123' } });
    expect(sent.code).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a library and keeps the response private', async () => {
    fetchMock
      .mockReturnValueOnce(
        json({
          response: {
            game_count: 1,
            games: [
              { appid: 620, name: 'Portal 2', playtime_forever: 754 },
            ],
          },
        })
      )
      .mockReturnValueOnce(
        json({ response: { players: [{ personaname: 'Gino' }] } })
      );
    const sent = await call({
      query: { op: 'owned', steamid: '7656119796028793'.padEnd(17, '0') },
    });
    expect(sent.code).toBe(200);
    expect(sent.headers['Cache-Control']).toContain('private');
    expect(sent.body).toMatchObject({
      player: { name: 'Gino' },
      games: [{ appid: 620, minutesForever: 754 }],
    });
  });

  it('explains a private library instead of pretending it is empty', async () => {
    fetchMock
      .mockReturnValueOnce(json({ response: {} }))
      .mockReturnValueOnce(json({ response: {} }));
    const sent = await call({
      query: { op: 'owned', steamid: '7656119796028793'.padEnd(17, '0') },
    });
    expect(sent.code).toBe(403);
    expect(String((sent.body as { error: string }).error)).toContain('privacy');
  });

  it('never lets the key into any response body', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error(`upstream exploded with key=${KEY} in the message`);
    });
    const sent = await call({ query: { op: 'resolve', vanity: 'gabe' } });
    expect(sent.code).toBe(502);
    expect(JSON.stringify(sent.body)).not.toContain(KEY);
  });
});
