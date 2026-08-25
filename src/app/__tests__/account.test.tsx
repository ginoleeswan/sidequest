import { fireEvent, screen } from '@testing-library/react-native';

import AccountScreen from '../account';
import { useAuth } from '@/lib/auth';
import { useSync } from '@/lib/sync/SyncProvider';
import { renderApp, useFakeStorage } from '@/test-utils';

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  useAuth: jest.fn(),
}));
jest.mock('@/lib/sync/SyncProvider', () => ({
  ...jest.requireActual('@/lib/sync/SyncProvider'),
  useSync: jest.fn(),
}));

const mockedAuth = useAuth as jest.Mock;
const mockedSync = useSync as jest.Mock;

const unconfigured = { session: null, available: false };
const signedIn = {
  session: { user: { id: 'user-1', email: 'you@example.com' } },
  available: true,
};

beforeAll(() => {
  useFakeStorage();
});

beforeEach(() => {
  mockedAuth.mockReturnValue(unconfigured);
  mockedSync.mockReturnValue({
    status: { state: 'idle' },
    active: false,
    syncNow: jest.fn(),
  });
});

/**
 * Signing in lives on a route rather than inside a disclosure on You:
 * it needs a URL to link to and to return to, and room for the states
 * that come after a magic link.
 *
 * Tests run without Supabase configuration — the same state a build
 * made without those keys is in — so what this can hold is the promise
 * that such a build says so plainly instead of drawing buttons that
 * cannot do anything.
 */
describe('the account screen', () => {
  it('says so when the build has no auth in it', async () => {
    await renderApp(<AccountScreen />);
    expect(screen.getByText('No account in this build')).toBeTruthy();
    expect(screen.queryByLabelText('Continue with Google')).toBeNull();
  });

  describe('signed in', () => {
    beforeEach(() => mockedAuth.mockReturnValue(signedIn));

    it('names what does not travel, not only what does', async () => {
      // The screen used to claim SYNCED unconditionally while nothing
      // synced at all. The fix is not a nicer word — it is saying which
      // things stay on the device, where somebody can read it before
      // they rely on it.
      mockedSync.mockReturnValue({
        status: { state: 'synced', at: 1_800_000_000_000 },
        active: true,
        syncNow: jest.fn(),
      });
      await renderApp(<AccountScreen />);
      expect(screen.getByText('STAYS ON THIS DEVICE')).toBeTruthy();
      expect(
        screen.getByText('Play sessions, and the time they logged')
      ).toBeTruthy();
      expect(screen.getByText('SYNCED')).toBeTruthy();
    });

    it('does not say synced when it is not', async () => {
      mockedSync.mockReturnValue({
        status: { state: 'failed', reason: 'offline', at: 1 },
        active: true,
        syncNow: jest.fn(),
      });
      await renderApp(<AccountScreen />);
      expect(screen.getByText('NOT SYNCED')).toBeTruthy();
      expect(screen.queryByText('SYNCED')).toBeNull();
      // And says why, plus that nothing was lost.
      expect(screen.getByText(/offline/)).toBeTruthy();
    });

    it('offers a retry that actually runs a round', async () => {
      const syncNow = jest.fn();
      mockedSync.mockReturnValue({
        status: { state: 'failed', reason: 'offline', at: 1 },
        active: true,
        syncNow,
      });
      await renderApp(<AccountScreen />);
      fireEvent.press(screen.getByText('Sync now'));
      expect(syncNow).toHaveBeenCalled();
    });
  });
});
