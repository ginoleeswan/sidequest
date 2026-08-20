import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { FeaturedHero } from '../FeaturedHero';
import type { Game } from '@/api/types';
import { renderApp } from '@/test-utils';

const games = [1, 2, 3].map(
  (id) =>
    ({
      id,
      name: `Game ${id}`,
      rating: 4,
      metacritic: 80 + id,
      background_image: null,
      released: '2024-01-01',
    }) as unknown as Game
);

/** The desktop grid's focal point. */
describe('the featured hero', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('shows nothing when there is nothing to feature', async () => {
    await renderApp(<FeaturedHero games={[]} />);
    expect(screen.queryByText('FEATURED')).toBeNull();
  });

  it('leads with the first game and lists the rest behind it', async () => {
    await renderApp(<FeaturedHero games={games} />);
    expect(screen.getByText('FEATURED')).toBeTruthy();
    expect(screen.getByText('Game 1')).toBeTruthy();
    expect(screen.getByText('Game 2')).toBeTruthy();
  });

  it('opens the lead game', async () => {
    await renderApp(<FeaturedHero games={games} />);
    await fireEvent.press(screen.getByText('Game 1'));
    expect(router.push).toHaveBeenCalledWith('/game/1');
  });
});
