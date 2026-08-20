import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { PromptBand } from '../PromptBand';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.clearAllMocks();
});

const save = (games: { id: number; playtime: number }[]) => {
  store['sidequest.library.v1'] = JSON.stringify(
    Object.fromEntries(
      games.map((g) => [
        String(g.id),
        {
          addedAt: 1,
          status: 'wishlist',
          game: { id: g.id, name: `Game ${g.id}`, playtime: g.playtime },
        },
      ])
    )
  );
};

/** The one place on the home page where the app speaks for itself. */
describe('the prompt band', () => {
  it('invites when the library is empty', async () => {
    await renderApp(<PromptBand />);
    expect(screen.getByText(/Save a few/)).toBeTruthy();
  });

  it('states the total once the library is big enough to have one', async () => {
    save([
      { id: 1, playtime: 12 },
      { id: 2, playtime: 8 },
      { id: 3, playtime: 5 },
    ]);
    await renderApp(<PromptBand />);
    expect(screen.getByText('3 games. About 25 hours.')).toBeTruthy();
  });

  it('takes you to the plan', async () => {
    save([
      { id: 1, playtime: 12 },
      { id: 2, playtime: 8 },
      { id: 3, playtime: 5 },
    ]);
    await renderApp(<PromptBand />);
    await act(async () => fireEvent.press(screen.getByText('Make a plan')));
    expect(router.push).toHaveBeenCalledWith('/plan');
  });
});
