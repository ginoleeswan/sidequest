import { fetchTimesToBeat, SLUG_BATCH } from '../igdb';

const answer = (durations: Record<string, unknown>) =>
  new Response(JSON.stringify({ durations }));

let calls: string[];

beforeEach(() => {
  calls = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return answer({
      hades: {
        hastily: 18,
        normally: 21.5,
        completely: 96,
        submissions: 412,
      },
    });
  }) as unknown as typeof fetch;
});

/**
 * The lengths the plan is built on. Everything here degrades: a missing
 * answer, a failed request and an unconfigured server all have to leave
 * the app working on RAWG's estimate rather than breaking a screen.
 */
describe('asking what a game takes', () => {
  it('asks for nothing when there is nothing to ask about', async () => {
    expect(await fetchTimesToBeat([])).toEqual({});
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('asks once for a slug repeated across a library', async () => {
    await fetchTimesToBeat(['hades', 'hades', 'hades']);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('slugs=hades');
  });

  it('splits a long library into batches rather than one enormous URL', async () => {
    const slugs = Array.from({ length: SLUG_BATCH * 2 + 1 }, (_, i) => `g${i}`);
    await fetchTimesToBeat(slugs);
    expect(calls).toHaveLength(3);
  });

  it('returns what the server knew', async () => {
    const times = await fetchTimesToBeat(['hades']);
    expect(times.hades.normally).toBe(21.5);
    expect(times.hades.submissions).toBe(412);
  });

  it('says nothing rather than throwing when the server is not configured', async () => {
    globalThis.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ error: 'not configured' }), {
          status: 503,
        })
    ) as unknown as typeof fetch;
    expect(await fetchTimesToBeat(['hades'])).toEqual({});
  });

  it('survives a network failure the same way', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchTimesToBeat(['hades'])).toEqual({});
  });

  it('keeps the batches that worked when one fails', async () => {
    let call = 0;
    globalThis.fetch = jest.fn(async () => {
      call += 1;
      if (call === 1) throw new Error('offline');
      return answer({ celeste: { normally: 8, submissions: 90 } });
    }) as unknown as typeof fetch;
    const slugs = Array.from({ length: SLUG_BATCH + 1 }, (_, i) => `g${i}`);
    const times = await fetchTimesToBeat(slugs);
    expect(times.celeste.normally).toBe(8);
  });
});
