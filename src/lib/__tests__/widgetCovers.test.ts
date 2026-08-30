import {
  COVER_BUDGET,
  collectCovers,
  encodeCover,
  forgetCovers,
  withinBudget,
} from '../widgetCovers';

const RAWG = 'https://media.rawg.io/media/games/abc/hades.jpg';

/** A FileReader that hands back a data URL without touching a file. */
function asDataUrl(payload: string) {
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

beforeEach(() => {
  forgetCovers();
  jest.restoreAllMocks();
});

describe('the URL it asks for', () => {
  /**
   * The rewrite is `api/rawg`'s to make, not this module's — it owns
   * the width ladder, the retina doubling and the rule about not
   * rewriting a derivative twice. This checks the slot chosen here
   * lands on the rung the widget was designed against, so a change to
   * either side shows up as a failure rather than as a soft picture.
   */
  it('asks for the 420px rung the widget was designed against', async () => {
    asDataUrl('QQ==');
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, blob: async () => ({}) } as Response);
    await encodeCover(RAWG);
    expect(fetcher).toHaveBeenCalledWith(
      'https://media.rawg.io/media/resize/420/-/games/abc/hades.jpg'
    );
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
  beforeEach(() => asDataUrl('QUJD'));

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

  /**
   * The publisher runs on every platform. `publishCovers` already
   * declines to write where there is no app group, but declining after
   * the download means a browser spending a megabyte of somebody's
   * connection on pictures it is about to throw away.
   */
  it('downloads nothing where there is nowhere to put it', async () => {
    jest.resetModules();
    jest.doMock('../widgetStore', () => ({ widgetStore: () => null }));
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, blob: async () => ({}) } as Response);

    // A fresh require rather than the import at the top: the guard
    // reads the store at call time, but the module under test binds it
    // at import time, so the mock has to be in place first.
    const {
      collectCovers: guarded,
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- re-import under a mock
    } = require('../widgetCovers') as typeof import('../widgetCovers');

    await expect(guarded([1], () => RAWG)).resolves.toEqual({});
    expect(fetcher).not.toHaveBeenCalled();

    jest.dontMock('../widgetStore');
    jest.resetModules();
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
