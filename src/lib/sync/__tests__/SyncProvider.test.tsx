import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SyncProvider, useSync } from '../SyncProvider';
import type { SyncBackend } from '../engine';
import { useAuth } from '../../auth';
import { DurationsProvider } from '../../durations';
import { LibraryProvider, useLibrary } from '../../library';
import { useFakeStorage } from '@/test-utils';
import type { Game } from '@/api/types';

/**
 * When a round runs, and — the one that would be expensive to get
 * wrong — that adopting a pull does not immediately push it back.
 */

jest.mock('../../auth', () => ({ useAuth: jest.fn() }));
const mockedAuth = useAuth as jest.Mock;

const signedIn = { user: { id: 'user-1' } };

function backendSpy(over: Partial<SyncBackend> = {}) {
  const pushed: { library: number; durations: number } = {
    library: 0,
    durations: 0,
  };
  let rounds = 0;
  const backend: SyncBackend = {
    pullLibrary: async () => {
      rounds += 1;
      return [];
    },
    pullDurations: async () => [],
    pullPreferences: async () => null,
    pushGames: async () => {},
    pushLibrary: async (rows) => {
      pushed.library += rows.length;
    },
    pushDurations: async (rows) => {
      pushed.durations += rows.length;
    },
    pushPreferences: async () => {},
    ...over,
  };
  return { backend, pushed, rounds: () => rounds };
}

function Probe() {
  const { status, active } = useSync();
  const library = useLibrary();
  return (
    <Text>{`${status.state}|${active ? 'on' : 'off'}|${library.count}`}</Text>
  );
}

const game = (id: number): Game =>
  ({ id, name: `Game ${id}`, slug: `game-${id}` }) as unknown as Game;

const mount = (backend: SyncBackend) =>
  render(
    <LibraryProvider>
      <DurationsProvider>
        <SyncProvider makeBackend={() => backend}>
          <Probe />
        </SyncProvider>
      </DurationsProvider>
    </LibraryProvider>
  );

beforeEach(() => {
  useFakeStorage();
  jest.useFakeTimers();
  mockedAuth.mockReturnValue({ session: signedIn });
});
afterEach(() => jest.useRealTimers());

describe('SyncProvider', () => {
  it('does nothing at all signed out', async () => {
    mockedAuth.mockReturnValue({ session: null });
    const { backend, rounds } = backendSpy();
    await mount(backend);
    await act(async () => {});
    expect(rounds()).toBe(0);
    expect(screen.getByText(/^idle\|off/)).toBeTruthy();
  });

  it('catches up as soon as somebody signs in', async () => {
    const { backend, rounds } = backendSpy();
    await mount(backend);
    await act(async () => {});
    expect(rounds()).toBe(1);
    expect(screen.getByText(/^synced\|on/)).toBeTruthy();
  });

  it('a round that cannot finish says so instead of throwing', async () => {
    const { backend } = backendSpy({
      pullLibrary: async () => {
        throw new Error('offline');
      },
    });
    await mount(backend);
    await act(async () => {});
    expect(screen.getByText(/^failed\|on/)).toBeTruthy();
  });

  it('an offline round leaves the library exactly where it was', async () => {
    const { backend } = backendSpy({
      pullLibrary: async () => {
        throw new Error('offline');
      },
    });
    const view = await mount(backend);
    await act(async () => {});
    // The app is fully usable; the count is still the device's own.
    expect(view.getByText(/\|0$/)).toBeTruthy();
  });

  it('adopting a pull does not push it straight back', async () => {
    // The loop this guards: adopted rows restamped as local news, sent
    // up, pulled down, restamped… growing by a round trip each time.
    const pulled = {
      game_id: 7,
      status: 'wishlist' as const,
      added_at: new Date(1_700_000_000_000).toISOString(),
      finished_at: null,
      hours_played: null,
      steam_app_id: null,
      deadline: null,
      want: null,
      note: null,
      rating: null,
      tags: null,
      client_updated_at: new Date(1_800_000_000_000).toISOString(),
      deleted_at: null,
      updated_at: '2026-02-01T00:00:00.000Z',
    };
    let served = false;
    const { backend, pushed } = backendSpy({
      pullLibrary: async () => {
        if (served) return [];
        served = true;
        return [pulled];
      },
    });
    await mount(backend);
    await act(async () => {});
    // The pull landed…
    expect(screen.getByText(/\|1$/)).toBeTruthy();
    // …and the settle window passes with nothing sent back up.
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(pushed.library).toBe(0);
  });

  it('waits for a local change to stop before sending it', async () => {
    const { backend, rounds } = backendSpy();
    let library: ReturnType<typeof useLibrary> | null = null;
    function Grab() {
      library = useLibrary();
      return null;
    }
    await render(
      <LibraryProvider>
        <DurationsProvider>
          <SyncProvider makeBackend={() => backend}>
            <Grab />
          </SyncProvider>
        </DurationsProvider>
      </LibraryProvider>
    );
    await act(async () => {});
    const afterSignIn = rounds();

    await act(async () => {
      library?.setStatus(game(1), 'wishlist');
    });
    // Still quiet: the change has not settled.
    expect(rounds()).toBe(afterSignIn);

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    expect(rounds()).toBeGreaterThan(afterSignIn);
  });
});
