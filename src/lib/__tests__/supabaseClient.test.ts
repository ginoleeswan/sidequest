/**
 * The module that decides whether supabase-js is downloaded at all.
 *
 * Two things worth pinning. That a visitor with no session and no
 * redirect in the URL is answered without the library — the whole
 * reason it became a dynamic import. And that somebody who WAS signed
 * in before the storage key became ours is not quietly signed out by
 * the change, which would be a real regression traded for bytes.
 */

/**
 * The preset runs the iOS code paths, where `isAuthCallback` is
 * always false and correctly so — native signs in with an ID token and
 * never sees a redirect. The web branch is the one worth testing, so
 * the platform is a knob here rather than a constant.
 */
let mockOS = 'web';
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

const mockStore = new Map<string, string>();
jest.mock('../storage', () => ({
  kv: {
    getItem: (k: string) => mockStore.get(k) ?? null,
    setItem: (k: string, v: string) => void mockStore.set(k, v),
    removeItem: (k: string) => void mockStore.delete(k),
  },
}));

const REF = 'kcefulsgjqiqrupxllsn';

/**
 * Imported fresh each time, because the legacy migration runs once at
 * module load — deliberately, so no component has to migrate storage
 * while it renders. Anything the store should already hold has to be
 * put there before this is called.
 */
async function load() {
  process.env.EXPO_PUBLIC_SUPABASE_URL = `https://${REF}.supabase.co`;
  process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
  let mod!: typeof import('../supabase');
  await jest.isolateModulesAsync(async () => {
    mod = await import('../supabase');
  });
  return mod;
}

beforeEach(() => {
  mockStore.clear();
  mockOS = 'web';
  jest.resetModules();
});

describe('isAuthCallback', () => {
  // The one case where nothing is stored and the client is still
  // needed at once. Getting this wrong makes signing in with Google
  // silently do nothing — a redirect that lands, reads as a fresh
  // visit, and drops the tokens on the floor.
  const at = (href: string) => {
    const url = new URL(href);
    Object.defineProperty(window, 'location', {
      value: { hash: url.hash, search: url.search, origin: url.origin },
      writable: true,
    });
  };

  it.each([
    [
      'an implicit-flow redirect',
      'https://x.test/#access_token=abc&type=magiclink',
    ],
    ['a PKCE redirect', 'https://x.test/?code=abc'],
    ['a provider refusing', 'https://x.test/#error_description=denied'],
  ])('is true for %s', async (_name, href) => {
    at(href);
    const { isAuthCallback } = await load();
    expect(isAuthCallback()).toBe(true);
  });

  it('is false on native, which never sees a redirect', async () => {
    mockOS = 'ios';
    at('https://x.test/#access_token=abc');
    const { isAuthCallback } = await load();
    expect(isAuthCallback()).toBe(false);
  });

  it.each([
    ['an ordinary visit', 'https://x.test/'],
    ['a deep link into a game', 'https://x.test/game/3498?from=search'],
    ['an anchor that is not a token', 'https://x.test/about#the-plan'],
  ])('is false for %s', async (_name, href) => {
    at(href);
    const { isAuthCallback } = await load();
    expect(isAuthCallback()).toBe(false);
  });
});

describe('hasStoredSession', () => {
  it('is false with nothing stored, without loading the library', async () => {
    const { hasStoredSession } = await load();
    expect(hasStoredSession()).toBe(false);
  });

  it('is true once a session is under our own key', async () => {
    mockStore.set('sidequest.auth.v1', '{"access_token":"x"}');
    const { hasStoredSession } = await load();
    expect(hasStoredSession()).toBe(true);
  });

  it('adopts a session left under supabase-js’s own key', async () => {
    // Anybody signed in before the key became ours. Renaming without
    // this would sign every one of them out.
    mockStore.set(`sb-${REF}-auth-token`, '{"access_token":"kept"}');
    const { hasStoredSession, AUTH_STORAGE_KEY } = await load();
    expect(hasStoredSession()).toBe(true);
    expect(mockStore.get(AUTH_STORAGE_KEY)).toBe('{"access_token":"kept"}');
    // And the old copy does not linger as a second source of truth.
    expect(mockStore.has(`sb-${REF}-auth-token`)).toBe(false);
  });

  it('never lets a stale legacy copy overwrite the current one', async () => {
    mockStore.set('sidequest.auth.v1', '{"access_token":"current"}');
    mockStore.set(`sb-${REF}-auth-token`, '{"access_token":"stale"}');
    const { hasStoredSession, AUTH_STORAGE_KEY } = await load();
    hasStoredSession();
    expect(mockStore.get(AUTH_STORAGE_KEY)).toBe('{"access_token":"current"}');
  });
});
