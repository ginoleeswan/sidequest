/**
 * The native storage backend's two personalities: SQLite when the
 * module loads and answers, memory when it does not. The fallback is
 * what every test in the repo silently runs on, so it had better
 * actually store things.
 */
describe('the native kv backend', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-sqlite/kv-store');
  });

  it('rides SQLite when the probe answers', () => {
    const setItemSync = jest.fn();
    jest.doMock('expo-sqlite/kv-store', () => ({
      default: {
        getItemSync: jest.fn(() => null),
        setItemSync,
        removeItemSync: jest.fn(),
      },
    }));
    const { platformBackend } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- after doMock, on purpose
      require('../kvBackend.native') as typeof import('../kvBackend.native');
    const backend = platformBackend();
    backend.setItem('k', 'v');
    expect(setItemSync).toHaveBeenCalledWith('k', 'v');
  });

  it('falls back to a working memory store when the probe throws', () => {
    jest.doMock('expo-sqlite/kv-store', () => ({
      default: {
        getItemSync: () => {
          throw new Error('binding missing');
        },
      },
    }));
    const { platformBackend } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- after doMock, on purpose
      require('../kvBackend.native') as typeof import('../kvBackend.native');
    const backend = platformBackend();
    // The session still works: writes read back, removes remove.
    backend.setItem('k', 'v');
    expect(backend.getItem('k')).toBe('v');
    backend.removeItem?.('k');
    expect(backend.getItem('k')).toBeNull();
  });
});
