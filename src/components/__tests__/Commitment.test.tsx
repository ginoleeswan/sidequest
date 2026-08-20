import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { Commitment } from '../Commitment';
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
      status: 'wishlist',
      game: { id: 1, name: 'Celeste', playtime: 12 },
      ...extra,
    },
  });
};

const saved = () => JSON.parse(store[KEY] ?? '{}')['1'];

/**
 * The two things a person knows that the arithmetic cannot: that this
 * one has to be finished, and that there is a date it stops mattering.
 */
describe('committing to a game', () => {
  it('offers nothing for a game that is not saved', async () => {
    await renderApp(<Commitment gameId={1} />);
    expect(screen.queryByText('Must play')).toBeNull();
  });

  it('insists, and stops insisting', async () => {
    seed();
    await renderApp(<Commitment gameId={1} />);
    await fireEvent.press(screen.getByLabelText('Insist on playing this game'));
    await waitFor(() => expect(saved().want).toBe(3));
    await fireEvent.press(screen.getByLabelText('Stop insisting on this game'));
    await waitFor(() => expect(saved().want).toBe(2));
  });

  it('steps through the dates rather than opening a form', async () => {
    seed();
    await renderApp(<Commitment gameId={1} />);
    // Not "Finish by no date": the absence of a deadline is its own
    // state, not a date you can finish by.
    expect(screen.getByText('No deadline')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/No deadline/));
    await waitFor(() => expect(saved().deadline).toBeGreaterThan(Date.now()));
    expect(screen.getByText('Finish this month')).toBeTruthy();
  });

  it('comes back round to no date, which is a real answer', async () => {
    seed();
    await renderApp(<Commitment gameId={1} />);
    for (const phrase of [
      'No deadline',
      'Finish this month',
      'Finish within 3 months',
      'Finish this year',
    ]) {
      await fireEvent.press(screen.getByLabelText(`${phrase}. Tap to change.`));
    }
    await waitFor(() => expect(saved().deadline).toBeUndefined());
  });

  it('reads a stored deadline back as the window it falls in', async () => {
    seed({ deadline: Date.now() + 20 * 24 * 60 * 60 * 1000 });
    await renderApp(<Commitment gameId={1} />);
    expect(screen.getByText('Finish this month')).toBeTruthy();
  });
});
