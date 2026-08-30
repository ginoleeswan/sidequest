import {
  COVER_BUDGET,
  collectCovers,
  encodeCover,
  forgetCovers,
  resizedCover,
  withinBudget,
} from '../widgetCovers';

const RAWG = 'https://media.rawg.io/media/games/abc/hades.jpg';

beforeEach(() => {
  forgetCovers();
  jest.restoreAllMocks();
});

describe('resizedCover', () => {
  it('asks RAWG for a width a plist can carry', () => {
    expect(resizedCover(RAWG)).toBe(
      'https://media.rawg.io/media/resize/420/-/games/abc/hades.jpg'
    );
  });

  /**
   * The guard that stops `/resize/420/-/resize/420/-/`. RAWG hands back
   * already-resized URLs in some payloads, and rewriting a rewrite
   * produces a path their CDN does not answer — a silently artless
   * widget rather than a loud failure.
   */
  it.each([
    'https://media.rawg.io/media/resize/420/-/games/abc/hades.jpg',
    'https://media.rawg.io/media/crop/600/400/games/abc/hades.jpg',
  ])('leaves %s alone', (url) => {
    expect(resizedCover(url)).toBe(url);
  });

  /**
   * Any other host is handed back untouched. Rewriting a URL we do not
   * own the shape of invents a 404 where a working image used to be.
   */
  it('does not rewrite a host it does not know', () => {
    const other = 'https://example.com/media/games/abc/hades.jpg';
    expect(resizedCover(other)).toBe(other);
  });
});

describe('withinBudget', () => {
  it('spends from the front, so tonight is never what got dropped', () => {
    const packed = withinBudget(
      [
        { id: 1, data: 'a'.repeat(60) },
        { id: 2, data: 'b'.repeat(60) },
        { id: 3, data: 'c'.repeat(60) },
      ],
      130
    );
    expect(Object.keys(packed)).toEqual(['1', '2']);
  });

  /**
   * One enormous cover must not swallow the whole allowance and starve
   * the ones behind it — a single press asset that escaped resizing
   * would otherwise cost the rest of the week its artwork.
   */
  it('skips an oversized cover and keeps going', () => {
    const packed = withinBudget(
      [
        { id: 1, data: 'a'.repeat(500) },
        { id: 2, data: 'b'.repeat(20) },
      ],
      100
    );
    expect(Object.keys(packed)).toEqual(['2']);
  });

  it('has a budget small enough to be a budget', () => {
    expect(COVER_BUDGET).toBeLessThanOrEqual(250_000);
  });
});

describe('encodeCover', () => {
  const asDataUrl = (payload: string) => {
    class FakeReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = `data:image/jpeg;base64,${payload}`;
        this.onload?.();
      }
    }
    (global as unknown as { FileReader: unknown }).FileReader = FakeReader;
  };

  it('returns the payload without the data-URL prefix', async () => {
    asDataUrl('SGVsbG8=');
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, blob: async () => ({}) } as Response);
    await expect(encodeCover(RAWG)).resolves.toBe('SGVsbG8=');
  });

  /**
   * Every failure is silent and empty. This module runs off the back of
   * an effect on the plan screen; an exception escaping it would break
   * the app because a CDN had a bad afternoon.
   */
  it('is empty rather than loud when the fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(encodeCover(RAWG)).resolves.toBeNull();
  });

  /**
   * The resized path is a convention RAWG happens to serve, not a
   * contract. If they stop, every game loses its artwork at once and
   * nothing anywhere reports it — so a refusal falls back to the
   * original rather than to nothing.
   */
  it('falls back to the full-size original when the resized one 404s', async () => {
    asDataUrl('T0s=');
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: true, blob: async () => ({}) } as Response);

    await expect(encodeCover(RAWG)).resolves.toBe('T0s=');
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://media.rawg.io/media/resize/420/-/games/abc/hades.jpg'
    );
    expect(fetcher).toHaveBeenNthCalledWith(2, RAWG);
  });

  it('is empty when the host answers with something that is not an image', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, blob: async () => ({}) } as Response);
    await expect(encodeCover(RAWG)).resolves.toBeNull();
  });
});

describe('collectCovers', () => {
  beforeEach(() => {
    asDataUrlOnce('QUJD');
  });

  function asDataUrlOnce(payload: string) {
    class FakeReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = `data:image/jpeg;base64,${payload}`;
        this.onload?.();
      }
    }
    (global as unknown as { FileReader: unknown }).FileReader = FakeReader;
  }

  it('downloads each artwork once, however often the plan is republished', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, blob: async () => ({}) } as Response);
    const artOf = () => RAWG;

    await collectCovers([1], artOf);
    await collectCovers([1], artOf);

    // A corrected length or a changed pace republishes the plan without
    // changing its games; re-downloading there would mean the app doing
    // more work the more carefully somebody tends their shelf.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('skips a game with no artwork rather than inventing one', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, blob: async () => ({}) } as Response);
    const covers = await collectCovers([1, 2], (id) =>
      id === 1 ? RAWG : null
    );
    expect(Object.keys(covers)).toEqual(['1']);
  });
});
