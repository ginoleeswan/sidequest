import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { CommunityStats } from '../CommunityStats';
import { GameCard } from '../GameCard';
import { GameInfoCard } from '../GameInfoCard';
import type { AddedByStatus, Game } from '@/api/types';
import { renderApp } from '@/test-utils';

const game = {
  id: 7,
  name: 'Celeste',
  rating: 4.53,
  released: '2018-01-25',
  metacritic: 91,
  background_image: null,
  genres: [{ id: 1, name: 'Platformer', slug: 'platformer' }],
  parent_platforms: [],
} as unknown as Game;

beforeEach(() => jest.mocked(router.push).mockClear());

/** The three ways a game is shown outside its own page. */
describe('the game cards', () => {
  it('opens the game from a row card', async () => {
    await renderApp(<GameInfoCard game={game} />);
    await fireEvent.press(screen.getByText('Celeste'));
    expect(router.push).toHaveBeenCalledWith('/game/7');
  });

  it('reads the facts off a row card in one line', async () => {
    await renderApp(<GameInfoCard game={game} />);
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('· 2018')).toBeTruthy();
    expect(screen.getByText('· Platformer')).toBeTruthy();
    expect(screen.getByText('91')).toBeTruthy();
  });

  it('leaves out what it does not know', async () => {
    const sparse = {
      ...game,
      rating: 0,
      released: undefined,
      genres: [],
      metacritic: null,
    };
    await renderApp(<GameInfoCard game={sparse as unknown as Game} />);
    expect(screen.queryByText('91')).toBeNull();
    expect(screen.queryByText(/2018/)).toBeNull();
  });

  it('opens the game from a cover card', async () => {
    await renderApp(<GameCard game={game} />);
    await fireEvent.press(screen.getByText('Celeste'));
    expect(router.push).toHaveBeenCalledWith('/game/7');
  });
});

/** What everyone else is doing with a game. */
describe('the community stats', () => {
  it('says nothing when nobody has done anything', async () => {
    await renderApp(
      <CommunityStats status={{ playing: 0, beaten: 0 } as AddedByStatus} />
    );
    expect(screen.queryByText('Playing now')).toBeNull();
    expect(screen.queryByText('Beaten')).toBeNull();
  });

  it('shows only the counts that exist, abbreviated', async () => {
    await renderApp(
      <CommunityStats
        status={{ playing: 1200, beaten: 12926, toplay: 0 } as AddedByStatus}
      />
    );
    expect(screen.getByText('1.2k')).toBeTruthy();
    expect(screen.getByText('12.9k')).toBeTruthy();
    expect(screen.queryByText('Want to play')).toBeNull();
  });
});
