import { RawgError, friendlyError, getGame } from '../rawg';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

function respondWith(init: {
  ok: boolean;
  status: number;
  headers?: Record<string, string>;
}) {
  const spy = jest.fn().mockResolvedValue({
    ok: init.ok,
    status: init.status,
    headers: {
      get: (name: string) => init.headers?.[name.toLowerCase()] ?? null,
    },
    json: async () => ({}),
  });
  global.fetch = spy as unknown as typeof fetch;
  return spy;
}

describe('RAWG failures', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
  });

  it('passes an abort signal so a request cannot hang for ever', async () => {
    const spy = respondWith({ ok: true, status: 200 });
    await getGame(1);
    expect(spy.mock.calls[0][1]).toEqual(
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('reports a network failure as retryable with status 0', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    await expect(getGame(1)).rejects.toMatchObject({
      name: 'RawgError',
      status: 0,
      retryable: true,
    });
  });

  it('treats a 404 as an answer, not a blip', async () => {
    respondWith({ ok: false, status: 404 });
    await expect(getGame(1)).rejects.toMatchObject({
      status: 404,
      retryable: false,
    });
  });

  it('treats a missing key as unrecoverable', async () => {
    respondWith({ ok: false, status: 401 });
    await expect(getGame(1)).rejects.toMatchObject({
      status: 401,
      retryable: false,
    });
  });

  it('treats a 500 as worth retrying', async () => {
    respondWith({ ok: false, status: 503 });
    await expect(getGame(1)).rejects.toMatchObject({
      status: 503,
      retryable: true,
    });
  });

  it('carries Retry-After from a rate limiter', async () => {
    respondWith({ ok: false, status: 429, headers: { 'retry-after': '30' } });
    await expect(getGame(1)).rejects.toMatchObject({
      status: 429,
      retryable: true,
      retryAfter: 30,
    });
  });

  it('never shows a person a raw status line', async () => {
    respondWith({ ok: false, status: 500 });
    const error = await getGame(1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RawgError);
    const shown = friendlyError(error);
    expect(shown).not.toMatch(/500|RAWG/);
    expect(shown.length).toBeGreaterThan(10);
  });

  it('has a sentence for errors it has never seen', () => {
    expect(friendlyError(new Error('boom'))).toMatch(/went wrong/i);
    expect(friendlyError(undefined)).toMatch(/went wrong/i);
  });
});
