import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StatusActions } from '../StatusActions';
import { ToastProvider } from '../Toast';
import type { Game } from '@/api/types';
import { DurationsProvider } from '@/lib/durations';
import { LibraryProvider } from '@/lib/library';
import { _setBackendForTests } from '@/lib/storage';

let store: Record<string, string> = {};

beforeAll(() => {
  _setBackendForTests({
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => delete store[k],
  });
});

beforeEach(() => {
  store = {};
});

const GAME = { id: 42, name: 'Hades II', playtime: 30 } as Game;
const KEY = 'sidequest.library.v1';

const mount = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <LibraryProvider>
        <DurationsProvider>
          <ToastProvider>
            <StatusActions game={GAME} />
          </ToastProvider>
        </DurationsProvider>
      </LibraryProvider>
    </SafeAreaProvider>
  );

const entries = () => JSON.parse(store[KEY] ?? '{}');

describe('StatusActions', () => {
  it('offers the three states the backlog is made of', async () => {
    await mount();
    for (const label of ['Want to play', 'Playing', 'Finished']) {
      expect(screen.getByLabelText(`Mark as ${label}`)).toBeTruthy();
    }
  });

  it('saves a game to the library', async () => {
    await mount();
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Mark as Playing'))
    );
    expect(entries()['42'].status).toBe('playing');
  });

  it('keeps only one status at a time', async () => {
    await mount();
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Mark as Playing'))
    );
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Mark as Want to play'))
    );
    expect(entries()['42'].status).toBe('wishlist');
    expect(Object.keys(entries())).toHaveLength(1);
  });

  /** Pressing the active state again is how a game leaves the library. */
  it('removes the game when its current status is pressed again', async () => {
    await mount();
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Mark as Playing'))
    );
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Remove from Playing'))
    );
    expect(entries()['42']).toBeUndefined();
  });

  it('tells a screen reader which state is selected', async () => {
    await mount();
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Mark as Playing'))
    );
    const active = screen.getByLabelText('Remove from Playing');
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    const inactive = screen.getByLabelText('Mark as Finished');
    expect(inactive.props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('confirms the save rather than changing silently', async () => {
    await mount();
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Mark as Want to play'))
    );
    expect(screen.getByText('Saved — Want to play')).toBeTruthy();
  });

  it('reads an existing library rather than starting empty', async () => {
    store[KEY] = JSON.stringify({
      42: { game: GAME, status: 'finished', addedAt: 1 },
    });
    await mount();
    expect(screen.getByLabelText('Remove from Finished')).toBeTruthy();
  });
});
