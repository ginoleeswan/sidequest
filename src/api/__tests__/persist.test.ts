const KEY = 'sidequest.query-cache.v1';

/**
 * The cache shares this device's storage with the library, which is the
 * only copy of the user's own data. A cache that grew without limit
 * could push a save into a quota error, so it is bounded — and it loses.
 */
describe('the query cache persister', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    // Installed fresh, after the reset, and directly on the storage
    // module rather than through test-utils: the fake backend must
    // land in the same registry the re-required persister will import
    // from, and test-utils drags the render harness (and its jest
    // hooks) in with it, which cannot load inside a test.
    const storage =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/lib/storage') as typeof import('@/lib/storage');
    store = {};
    storage._setBackendForTests({
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => {
        store[k] = v;
      },
      removeItem: (k) => {
        delete store[k];
      },
    });
  });
  afterEach(() => jest.useRealTimers());

  /** Writes are throttled by 2s, so a test has to let that elapse. */
  const settle = async () => {
    jest.advanceTimersByTime(2100);
    await Promise.resolve();
  };

  // require, not import(): the module captures the storage adapter at
  // module scope, so it has to load after the fake backend is installed.
  const load = () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../persist') as typeof import('../persist')).persister;

  const client = (queries: unknown[]) =>
    ({
      timestamp: 0,
      buster: '',
      clientState: { mutations: [], queries },
    }) as never;

  it('writes a modest cache under its own key', async () => {
    const persister = load();
    await persister.persistClient(client([{ queryKey: ['shelf'], state: {} }]));
    await settle();
    expect(store[KEY]).toContain('shelf');
  });

  it('drops an over-large cache rather than throwing at the write', async () => {
    const persister = load();
    const huge = [
      { queryKey: ['big'], state: { data: 'x'.repeat(1_100_000) } },
    ];
    expect(() => persister.persistClient(client(huge))).not.toThrow();
    await settle();
    expect(store[KEY] ?? '').toBe('');
  });

  it('restores nothing from an empty slot instead of failing', async () => {
    const persister = load();
    store[KEY] = '';
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it('gives up after a day — revalidating from scratch is the honest thing', async () => {
    const { MAX_AGE } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../persist') as typeof import('../persist');
    expect(MAX_AGE).toBe(24 * 60 * 60 * 1000);
  });
});
