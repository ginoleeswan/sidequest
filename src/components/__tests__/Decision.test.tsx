import { fireEvent, screen } from '@testing-library/react-native';

import { Decision } from '../Decision';
import type { Game } from '@/api/types';
import { renderApp, useFakeStorage } from '@/test-utils';

const game = {
  id: 7,
  slug: 'celeste',
  name: 'Celeste',
  rating: 4.5,
  released: '2018-01-25',
  background_image: null,
  playtime: 8,
} as unknown as Game;

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
});

/**
 * One question, asked two ways: a game that is not yours gets one
 * button; a game on the shelf gets the state control.
 */
describe('the decision', () => {
  it('offers one primary action for a game that is not yours', async () => {
    await renderApp(<Decision game={game} />);
    expect(screen.getByText('Want to play')).toBeTruthy();
    expect(screen.getByText('Already finished')).toBeTruthy();
    expect(screen.queryByLabelText('Mark as Playing')).toBeNull();
  });

  it('becomes the state control once the game is saved', async () => {
    await renderApp(<Decision game={game} />);
    await fireEvent.press(screen.getByLabelText('Add Celeste to your backlog'));
    expect(screen.getByLabelText('Remove from Want to play')).toBeTruthy();
    expect(screen.getByText('Start a session')).toBeTruthy();
  });

  it('opens on the state control for a game already on the shelf', async () => {
    store['sidequest.library.v1'] = JSON.stringify({
      '7': { addedAt: 1, status: 'playing', game },
    });
    await renderApp(<Decision game={game} />);
    expect(screen.getByLabelText('Remove from Playing')).toBeTruthy();
    expect(screen.queryByText('Already finished')).toBeNull();
  });
});
