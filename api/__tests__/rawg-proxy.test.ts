import handler from '../rawg-proxy';
import { fakeReq, fakeRes, fromIp } from '../test-utils';

type Req = Parameters<typeof handler>[0];
type Res = Parameters<typeof handler>[1];

const KEY = 'rawg-key-a5dc51';

const call = async (over: Record<string, unknown>) => {
  const { res, sent } = fakeRes();
  await handler(fakeReq(over) as unknown as Req, res as unknown as Res);
  return sent;
};

const fetchMock = jest.fn();
const realFetch = global.fetch;
const ok = (text: string, status = 200) =>
  Promise.resolve({
    status,
    headers: { get: () => 'application/json' },
    text: () => Promise.resolve(text),
  });

beforeEach(() => {
  process.env.RAWG_API_KEY = KEY;
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  fetchMock.mockReturnValue(ok('{"results":[]}'));
});
afterAll(() => {
  delete process.env.RAWG_API_KEY;
  global.fetch = realFetch;
});

describe('api/rawg-proxy', () => {
  it('rejects any path that is not a plain RAWG resource', async () => {
    for (const path of ['..%2Fetc', 'games?x=1', 'a.b', 'x@evil.com/games']) {
      const sent = await call({ query: { path } });
      expect(sent.code).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards params but never a caller-supplied key', async () => {
    await call({
      query: { path: 'games', search: 'hades', key: 'attacker-key' },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('search=hades');
    expect(url).toContain(`key=${KEY}`);
    expect(url).not.toContain('attacker-key');
  });

  it('scrubs the real key out of the response body', async () => {
    fetchMock.mockReturnValue(
      ok(`{"next":"https://api.rawg.io/api/games?key=${KEY}&page=2"}`)
    );
    const sent = await call({ query: { path: 'games' } });
    expect(sent.code).toBe(200);
    expect(String(sent.body)).not.toContain(KEY);
  });

  it('is a soft 503 without a key', async () => {
    delete process.env.RAWG_API_KEY;
    const sent = await call({ query: { path: 'games' } });
    expect(sent.code).toBe(503);
  });

  it('rate limits per caller with a Retry-After', async () => {
    let last = 0;
    let headers: Record<string, string> = {};
    for (let i = 0; i < 121; i++) {
      const { res, sent } = fakeRes();
      await handler(
        fromIp('8.8.8.8', { query: { path: 'games' } }) as unknown as Req,
        res as unknown as Res
      );
      last = sent.code ?? 0;
      headers = sent.headers;
    }
    expect(last).toBe(429);
    expect(headers['Retry-After']).toBe('60');
  });

  it('an upstream failure is a fixed 502', async () => {
    fetchMock.mockImplementation(() => {
      throw new Error('ECONNRESET with internals');
    });
    const sent = await call({ query: { path: 'games' } });
    expect(sent.code).toBe(502);
    expect(JSON.stringify(sent.body)).not.toContain('ECONNRESET');
  });
});
