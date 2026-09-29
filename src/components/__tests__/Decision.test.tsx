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
    await fireEvent.press(screen.getByLabelText('Want to play'));
    expect(screen.getByLabelText('Remove from Want to play')).toBeTruthy();
    expect(screen.getByText('Start a session')).toBeTruthy();
  });

  /**
   * Voice Control acts on the words a reader can see, so the button
   * must be named by them; the longer sentence is the hint.
   */
  it('names its primary by the words on it', async () => {
    await renderApp(<Decision game={game} />);
    expect(screen.getByLabelText('Want to play')).toBeTruthy();
    expect(screen.getByLabelText('Playing it now')).toBeTruthy();
    expect(screen.getByLabelText('Already finished')).toBeTruthy();
  });

  /**
   * Finishing a game that was never saved turns the fresh decision into
   * a saved one in the same render. The moment has to survive that.
   */
  it('celebrates a game marked finished straight from fresh', async () => {
    await renderApp(<Decision game={game} />);
    await fireEvent.press(screen.getByLabelText('Already finished'));
    expect(screen.getByText('CREDITS ROLLED')).toBeTruthy();
    // Before the count-up's frames outlive the test.
    screen.unmount();
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
