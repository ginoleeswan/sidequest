import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GameTile } from '../GameTile';
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

const GAME = {
  id: 42,
  name: 'Hades II',
  released: '2024-05-06',
  rating: 4.6,
  metacritic: 92,
  genres: [{ id: 1, name: 'Roguelike', slug: 'roguelike' }],
  background_image: 'https://media.rawg.io/media/games/a/b.jpg',
} as Game;

const KEY = 'sidequest.library.v1';
const saved = () => JSON.parse(store[KEY] ?? '{}');

describe('GameTile', () => {
  it('shows the game and what is worth knowing at a glance', async () => {
    await renderApp(<GameTile game={GAME} />);
    expect(screen.getByText('Hades II')).toBeTruthy();
    expect(screen.getByText('Roguelike · 2024 · ★ 4.6')).toBeTruthy();
  });

  /**
   * The page is built out of these. If the tile does not say how long a
   * game takes, neither does 95% of the app that exists to answer it.
   */
  it('leads with how long it takes, in place of a five-point rating', async () => {
    await renderApp(<GameTile game={{ ...GAME, playtime: 12 } as Game} />);
    expect(screen.getByText(/12h/)).toBeTruthy();
    expect(screen.queryByText(/★/)).toBeNull();
  });

  it('falls back to the rating when no length is known', async () => {
    await renderApp(<GameTile game={GAME} />);
    expect(screen.getByText('Roguelike · 2024 · ★ 4.6')).toBeTruthy();
  });

  it('draws its place in a top ten', async () => {
    await renderApp(<GameTile game={GAME} rank={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('opens the game when tapped', async () => {
    await renderApp(<GameTile game={GAME} />);
    await act(async () => fireEvent.press(screen.getByText('Hades II')));
    expect(router.push).toHaveBeenCalledWith('/game/42');
  });

  it('saves to the library without leaving the row', async () => {
    await renderApp(<GameTile game={GAME} />);
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Save to library'))
    );
    expect(saved()['42'].status).toBe('wishlist');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('removes a saved game when the control is pressed again', async () => {
    await renderApp(<GameTile game={GAME} />);
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Save to library'))
    );
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Remove from library'))
    );
    expect(saved()['42']).toBeUndefined();
  });

  it('confirms the save rather than changing silently', async () => {
    await renderApp(<GameTile game={GAME} />);
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Save to library'))
    );
    expect(screen.getByText('Saved — Want to play')).toBeTruthy();
  });

  it('prefers a badge over the score when given one', async () => {
    await renderApp(<GameTile game={GAME} badge="MAY 6" />);
    expect(screen.getByText('MAY 6')).toBeTruthy();
    expect(screen.queryByText('92')).toBeNull();
  });

  it('shows the score when there is no badge', async () => {
    await renderApp(<GameTile game={GAME} />);
    expect(screen.getByText('92')).toBeTruthy();
  });

  it('leaves out meta it does not have', async () => {
    const sparse = { id: 7, name: 'Unknown', rating: 0 } as Game;
    await renderApp(<GameTile game={sparse} />);
    expect(screen.getByText('Unknown')).toBeTruthy();
    expect(screen.queryByText(/★/)).toBeNull();
  });

  /**
   * Hovering a tile cycles the game's own screenshots — a living preview
   * rather than a still. It has to stop when the pointer leaves, or every
   * tile the pointer ever crossed keeps a timer running.
   */
  it('cycles screenshots while hovered, and stops when the pointer leaves', async () => {
    jest.useFakeTimers();
    try {
      const withShots = {
        ...GAME,
        short_screenshots: [
          { id: 1, image: 'https://media.rawg.io/media/games/a/shot-1.jpg' },
          { id: 2, image: 'https://media.rawg.io/media/games/a/shot-2.jpg' },
        ],
      } as Game;
      const clear = jest.spyOn(globalThis, 'clearInterval');
      await renderApp(<GameTile game={withShots} />);
      // The hover surface itself: the name now lives on the quest
      // card when a game has no box art, and pointer events fired on a
      // nested text are not what the interaction is - the pointer
      // crosses the tile.
      const tile = screen.getByTestId('game-tile-42');
      await fireEvent(tile, 'pointerEnter');
      await act(async () => {
        jest.advanceTimersByTime(1200);
      });
      await fireEvent(tile, 'pointerLeave');
      expect(clear).toHaveBeenCalled();
      clear.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });
});
