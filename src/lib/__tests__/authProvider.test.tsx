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

jest.mock('../supabase', () => ({
  authConfigured: true,
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (fn: Listener) => {
        mockListener = fn;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signOut: () => mockSignOut(),
    },
  },
}));

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
  mockGetSession = jest.fn(async () => ({ data: { session: SESSION } }));
});

describe('AuthProvider', () => {
  it('restores the stored session and stops loading', async () => {
    const { result } = await setup();
    await act(async () => {});
    expect(result.current.session).toEqual(SESSION);
    expect(result.current.loading).toBe(false);
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
