import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PersonalNote } from '../PersonalNote';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
const KEY = 'sidequest.library.v1';

beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const seed = (extra: Record<string, unknown> = {}) => {
  store[KEY] = JSON.stringify({
    '1': {
      addedAt: 1,
      status: 'playing',
      game: { id: 1, name: 'Celeste', playtime: 12 },
      ...extra,
    },
  });
};

const saved = () => JSON.parse(store[KEY] ?? '{}')['1'];

/**
 * Every other score on the screen belongs to somebody else. This is the
 * only place the app asks what you made of it.
 */
describe('your own take on a game', () => {
  it('asks nothing about a game you have not saved', async () => {
    await renderApp(<PersonalNote gameId={1} />);
    expect(screen.queryByText('YOUR TAKE')).toBeNull();
  });

  it('keeps a note you write', async () => {
    seed();
    await renderApp(<PersonalNote gameId={1} />);
    const box = screen.getByLabelText('Your note on this game');
    await fireEvent.changeText(box, 'Stuck on the hotel level');
    await fireEvent.press(screen.getByText('Save note'));
    await waitFor(() => expect(saved().note).toBe('Stuck on the hotel level'));
  });

  it('saves when the box loses focus, which is what people expect', async () => {
    seed();
    await renderApp(<PersonalNote gameId={1} />);
    const box = screen.getByLabelText('Your note on this game');
    await fireEvent.changeText(box, 'Lend to Sam');
    await fireEvent(box, 'blur');
    await waitFor(() => expect(saved().note).toBe('Lend to Sam'));
  });

  it('treats an emptied note as no note', async () => {
    seed({ note: 'old thought' });
    await renderApp(<PersonalNote gameId={1} />);
    const box = screen.getByLabelText('Your note on this game');
    await fireEvent.changeText(box, '   ');
    await fireEvent(box, 'blur');
    await waitFor(() => expect(saved().note).toBeUndefined());
  });

  it('shows a note that was already there', async () => {
    seed({ note: 'Bounced off the combat' });
    await renderApp(<PersonalNote gameId={1} />);
    expect(screen.getByDisplayValue('Bounced off the combat')).toBeTruthy();
  });

  it('rates, and un-rates on the same star', async () => {
    seed();
    await renderApp(<PersonalNote gameId={1} />);
    await fireEvent.press(screen.getByLabelText('Rate 4 out of 5'));
    await waitFor(() => expect(saved().rating).toBe(4));
    await fireEvent.press(
      screen.getByLabelText('Clear your rating of 4 out of 5')
    );
    await waitFor(() => expect(saved().rating).toBeUndefined());
  });
});
