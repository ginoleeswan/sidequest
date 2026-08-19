import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SurpriseButton } from '../SurpriseButton';
import type { Game } from '@/api/types';

const games = [1, 2, 3].map((id) => ({ id, name: `Game ${id}` }) as Game);

/** The escape hatch for "too many options, no decision". */
describe('the surprise button', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('does not offer to pick from nothing', async () => {
    await render(<SurpriseButton games={[]} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('opens one of the games it was given', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    await render(<SurpriseButton games={games} />);
    await fireEvent.press(screen.getByLabelText('Open a random game'));
    expect(router.push).toHaveBeenCalledWith('/game/2');
    random.mockRestore();
  });

  it('can reach the last game — the pick is never off the end', async () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.999);
    await render(<SurpriseButton games={games} />);
    await fireEvent.press(screen.getByLabelText('Open a random game'));
    expect(router.push).toHaveBeenCalledWith('/game/3');
    random.mockRestore();
  });
});
