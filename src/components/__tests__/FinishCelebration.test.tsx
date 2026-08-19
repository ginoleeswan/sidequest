import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { FinishCelebration } from '../FinishCelebration';
import type { Game } from '@/api/types';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.clearAllMocks();
});

// Released, with a plausible length: the case where the number is
// worth quoting. An unreleased game is treated as rough by design.
const GAME = {
  id: 1,
  name: 'Outer Wilds',
  playtime: 20,
  released: '2019-05-28',
} as Game;

function seedLibrary() {
  store['sidequest.library.v1'] = JSON.stringify({
    1: { game: GAME, status: 'finished', addedAt: 1, finishedAt: 2 },
    2: {
      game: { id: 2, name: 'Celeste', playtime: 12 },
      status: 'wishlist',
      addedAt: 3,
    },
    3: {
      game: { id: 3, name: 'Hades', playtime: 30 },
      status: 'playing',
      addedAt: 4,
    },
  });
}

/**
 * Finishing is the thing this app is for, so it gets a moment rather
 * than a toast. What it must never do is congratulate someone with a
 * number it invented.
 */
describe('FinishCelebration', () => {
  it('stays out of the way until a game is finished', async () => {
    await renderApp(<FinishCelebration game={null} onClose={jest.fn()} />);
    expect(screen.queryByText('CREDITS ROLLED')).toBeNull();
  });

  it('marks the moment by name', async () => {
    seedLibrary();
    await renderApp(<FinishCelebration game={GAME} onClose={jest.fn()} />);
    expect(screen.getByText('CREDITS ROLLED')).toBeTruthy();
    expect(screen.getByText(/Outer Wilds/)).toBeTruthy();
  });

  it('quotes the length when the number is trustworthy', async () => {
    seedLibrary();
    await renderApp(<FinishCelebration game={GAME} onClose={jest.fn()} />);
    expect(screen.getByText(/of your backlog, done/)).toBeTruthy();
  });

  /** A shaky estimate is not worth celebrating with. */
  it('says nothing about length when the estimate is rough', async () => {
    seedLibrary();
    // No length at all: nothing honest to say about it.
    const rough = { id: 1, name: 'Outer Wilds', playtime: 0 } as Game;
    await renderApp(<FinishCelebration game={rough} onClose={jest.fn()} />);
    expect(screen.queryByText(/of your backlog, done/)).toBeNull();
  });

  it('shows what is finished and what is still waiting', async () => {
    seedLibrary();
    await renderApp(<FinishCelebration game={GAME} onClose={jest.fn()} />);
    expect(screen.getByText('finished')).toBeTruthy();
    expect(screen.getByText('still waiting')).toBeTruthy();
    // One finished, two not.
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('points at what to play next', async () => {
    seedLibrary();
    const onClose = jest.fn();
    await renderApp(<FinishCelebration game={GAME} onClose={onClose} />);
    await act(async () => fireEvent.press(screen.getByText('What’s next')));
    expect(router.push).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
