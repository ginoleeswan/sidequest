import { fetchIgdbExtras, igdbCoverUri } from '../igdb';

/**
 * The client half of the extras contract. Every failure mode resolves
 * to null rather than throwing: this runs off the back of a page
 * query, and a missing enrichment must leave the page as it was.
 */
describe('fetchIgdbExtras', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns the slug’s extras with its times attached', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        durations: {
          hades: { hastily: 10, normally: 21, completely: 40, submissions: 9 },
        },
        extras: {
          hades: {
            cover: 'co1',
            critic: 92,
            criticCount: 5,
            storyline: 's',
            similar: [],
          },
        },
      }),
    }) as unknown as typeof fetch;
    const got = await fetchIgdbExtras('hades');
    expect(got?.cover).toBe('co1');
    expect(got?.times?.normally).toBe(21);
  });

  it('is null when the server has no extras for the slug', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ durations: {}, extras: {} }),
    }) as unknown as typeof fetch;
    await expect(fetchIgdbExtras('nobody')).resolves.toBeNull();
  });

  it('is null rather than loud when the endpoint fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    await expect(fetchIgdbExtras('hades')).resolves.toBeNull();
  });
});

describe('igdbCoverUri', () => {
  it('builds the CDN path at the asked rung', () => {
    expect(igdbCoverUri('co1')).toBe(
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg'
    );
    expect(igdbCoverUri('co1', '720p')).toContain('t_720p');
  });
});
