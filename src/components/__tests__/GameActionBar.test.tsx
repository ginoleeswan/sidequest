import { fireEvent, screen } from '@testing-library/react-native';

import { GameActionBar } from '../GameActionBar';
import type { Game } from '@/api/types';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
});

const game = {
  id: 7,
  slug: 'celeste',
  name: 'Celeste',
  playtime: 12,
  released: '2018-01-25',
} as Game;

/**
 * The pinned foot of a long game page: the hours, and one step forward
 * from wherever the game stands.
 */
describe('the action bar', () => {
  it('carries the hours and offers to save a game that is not yours', async () => {
    await renderApp(<GameActionBar game={game} visible />);
    expect(screen.getByText('to finish')).toBeTruthy();
    expect(screen.getByLabelText('Want to play')).toBeTruthy();
  });

  it('moves the game one step on, and then the next', async () => {
    await renderApp(<GameActionBar game={game} visible />);
    await fireEvent.press(screen.getByLabelText('Want to play'));
    expect(screen.getByLabelText('Playing it now')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Playing it now'));
    expect(screen.getByLabelText('Finished it')).toBeTruthy();
  });

  it('has nothing to press once the credits have rolled', async () => {
    store['sidequest.library.v1'] = JSON.stringify({
      '7': { addedAt: 1, status: 'finished', game },
    });
    await renderApp(<GameActionBar game={game} visible />);
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  /** Hidden, it must not be reachable by touch or by VoiceOver. */
  it('keeps out of reach while hidden', async () => {
    await renderApp(<GameActionBar game={game} visible={false} />);
    expect(screen.queryByLabelText('Want to play')).toBeNull();
  });
});
