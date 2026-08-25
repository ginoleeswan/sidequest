import { act, renderHook } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '../auth';

/**
 * The provider's lifecycle, with a fake Supabase underneath.
 *
 * Until the audit, none of this had ever executed: authConfigured is
 * false under jest, so all 100 suites ran the "no account in this
 * build" branch and the session plumbing — populate, update,
 * unsubscribe, the sign-out cache clear — had zero executed lines.
 */

type Listener = (event: string, session: unknown) => void;
const mockUnsubscribe = jest.fn();
const mockSignOut = jest.fn(async () => ({ error: null }));
let mockListener: Listener | null = null;
let mockGetSession: jest.Mock;

let mockStored = true;

jest.mock('../supabase', () => ({
  authConfigured: true,
  hasStoredSession: () => mockStored,
  isAuthCallback: () => false,
  somethingToRestore: () => mockStored,
  getSupabase: async () => ({
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (fn: Listener) => {
        mockListener = fn;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signOut: () => mockSignOut(),
      signInWithIdToken: (args: unknown) => mockSignInWithIdToken(args),
      signInWithOtp: (args: unknown) => mockSignInWithOtp(args),
      signInWithOAuth: (args: unknown) => mockSignInWithOAuth(args),
    },
  }),
}));

const mockAppleSignIn = jest.fn();
jest.mock('expo-apple-authentication', () => ({
  signInAsync: (args: unknown) => mockAppleSignIn(args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

const mockGoogleSignIn = jest.fn();
const mockGoogleConfigure = jest.fn();
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (args: unknown) => mockGoogleConfigure(args),
    hasPlayServices: jest.fn(async () => true),
    signIn: () => mockGoogleSignIn(),
  },
}));

const mockSignInWithIdToken = jest.fn(
  async (_args: unknown) => ({ error: null }) as { error: Error | null }
);
const mockSignInWithOtp = jest.fn(
  async (_args: unknown) => ({ error: null }) as { error: Error | null }
);
const mockSignInWithOAuth = jest.fn(
  async (_args: unknown) => ({ error: null }) as { error: Error | null }
);
const mockRemoveItem = jest.fn();
jest.mock('../storage', () => ({
  kv: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: (key: string) => mockRemoveItem(key),
  },
}));

const SESSION = { user: { id: 'u1' } };

function setup() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListener = null;
  mockStored = true;
  mockGetSession = jest.fn(async () => ({ data: { session: SESSION } }));
});

describe('AuthProvider', () => {
  it('restores the stored session and stops loading', async () => {
    const { result } = await setup();
    await act(async () => {});
    expect(result.current.session).toEqual(SESSION);
    expect(result.current.loading).toBe(false);
  });

  it('a signed-out visitor never loads supabase at all', async () => {
    // The whole point of the lazy import: the hero promises no account
    // is needed, and until now every visitor downloaded the entire auth
    // stack to be told so. Nothing stored and no redirect in the URL is
    // an answer that costs nothing.
    mockStored = false;
    const { result } = await setup();
    await act(async () => {});
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockListener).toBeNull();
  });

  it('a failed restore means signed out, not a crash', async () => {
    mockGetSession = jest.fn(async () => {
      throw new Error('corrupt persisted session');
    });
    const { result } = await setup();
    await act(async () => {});
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('follows auth state changes', async () => {
    const { result } = await setup();
    await act(async () => {});
    await act(async () => {
      mockListener?.('SIGNED_OUT', null);
    });
    expect(result.current.session).toBeNull();
  });

  it('unsubscribes on unmount — a leaked listener outlives the screen', async () => {
    const { unmount } = await setup();
    await act(async () => {});
    await act(async () => unmount());
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('Apple: the system credential goes straight to Supabase', async () => {
    mockAppleSignIn.mockResolvedValue({ identityToken: 'apple-jwt' });
    const { result } = await setup();
    await act(async () => result.current.signInWithApple());
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: 'apple-jwt',
    });
  });

  it('Apple: a credential with no token is an error, not a silent no-op', async () => {
    mockAppleSignIn.mockResolvedValue({ identityToken: null });
    const { result } = await setup();
    await act(async () => {
      await expect(result.current.signInWithApple()).rejects.toThrow(
        /identity token/
      );
    });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it('Google on native: token from the sheet, then Supabase', async () => {
    mockGoogleSignIn.mockResolvedValue({ data: { idToken: 'google-jwt' } });
    const { result } = await setup();
    await act(async () => result.current.signInWithGoogle());
    expect(mockGoogleConfigure).toHaveBeenCalled();
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-jwt',
    });
  });

  it('Google: a cancelled sheet (no token) throws rather than half-signing-in', async () => {
    mockGoogleSignIn.mockResolvedValue({ data: undefined });
    const { result } = await setup();
    await act(async () => {
      await expect(result.current.signInWithGoogle()).rejects.toThrow(
        /identity token/
      );
    });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it('email: sends the magic link and surfaces a Supabase refusal', async () => {
    const { result } = await setup();
    await act(async () => result.current.signInWithEmail('g@example.com'));
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'g@example.com' })
    );
    mockSignInWithOtp.mockResolvedValueOnce({
      error: new Error('rate limited'),
    } as never);
    await act(async () => {
      await expect(
        result.current.signInWithEmail('g@example.com')
      ).rejects.toThrow('rate limited');
    });
  });

  it('sign-out drops the persisted query cache with the session', async () => {
    const { result } = await setup();
    await act(async () => {});
    await act(async () => result.current.signOut());
    expect(mockSignOut).toHaveBeenCalled();
    // On a shared browser the next person must not open on the previous
    // person's synced shelves.
    expect(mockRemoveItem).toHaveBeenCalledWith('sidequest.query-cache.v1');
  });
});
