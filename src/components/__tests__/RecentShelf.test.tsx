import { act, fireEvent, screen } from '@testing-library/react-native';

import { RecentShelf } from '../RecentShelf';
import { readRecent } from '@/lib/recent';
import { renderApp, useFakeStorage } from '@/test-utils';

const KEY = 'sidequest.recent.v1';

const seen = [
  { id: 1, name: 'Hades', background_image: null, seenAt: 300 },
  { id: 2, name: 'Tunic', background_image: null, seenAt: 200 },
  { id: 3, name: 'Celeste', background_image: null, seenAt: 100 },
];

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  store[KEY] = JSON.stringify(seen);
});

/** Where you left off — and a clear that can be taken back. */
describe('the recent shelf', () => {
  it('shows the games you just looked at', async () => {
    await renderApp(<RecentShelf />);
    expect(screen.getByText('Hades')).toBeTruthy();
    expect(screen.getByText('Tunic')).toBeTruthy();
  });

  it('clears, and puts every game back in order on Undo', async () => {
    await renderApp(<RecentShelf />);
    await act(async () =>
      fireEvent.press(screen.getByLabelText('Clear where you left off'))
    );
    expect(screen.queryByText('Hades')).toBeNull();
    expect(readRecent()).toEqual([]);

    await act(async () => fireEvent.press(screen.getByLabelText('Undo')));
    expect(readRecent().map((game) => game.id)).toEqual([1, 2, 3]);
    expect(screen.getByText('Hades')).toBeTruthy();
  });
});
