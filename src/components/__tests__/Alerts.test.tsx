import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { Alerts } from '../Alerts';
import type { Alert } from '@/lib/alerts';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
const KEY = 'sidequest.library.v1';

beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  store[KEY] = JSON.stringify({
    '1': {
      addedAt: 1,
      status: 'playing',
      deadline: Date.now() + 86400000,
      game: { id: 1, name: 'Pentiment', playtime: 9 },
    },
  });
  jest.mocked(router.push).mockClear();
});

const saved = () => JSON.parse(store[KEY] ?? '{}')['1'];

const alert = (over: Partial<Alert> = {}): Alert => ({
  kind: 'at-risk',
  gameId: 1,
  name: 'Pentiment',
  message: 'Pentiment needs 9h and there is only room for about 3h.',
  hoursLeft: 9,
  ...over,
});

/**
 * The only things the app says unprompted. Each has to carry a way out
 * with it — an alert that only says "you are behind" is the opposite of
 * what this product is for.
 */
describe('alerts', () => {
  it('takes up no room when there is nothing to say', async () => {
    await renderApp(<Alerts alerts={[]} />);
    expect(screen.queryByText('Open')).toBeNull();
  });

  it('offers to drop the date it is warning about', async () => {
    await renderApp(<Alerts alerts={[alert()]} />);
    await fireEvent.press(screen.getByLabelText('Clear the date on Pentiment'));
    await waitFor(() => expect(saved().deadline).toBeUndefined());
    expect(screen.getByText('Date cleared. Nothing owed.')).toBeTruthy();
  });

  it('offers the other truth about a game an evening from done', async () => {
    await renderApp(
      <Alerts
        alerts={[
          alert({
            kind: 'nearly-done',
            message: 'Pentiment is about 2h from the credits.',
          }),
        ]}
      />
    );
    await fireEvent.press(screen.getByLabelText('Mark Pentiment finished'));
    await waitFor(() => expect(saved().status).toBe('finished'));
  });

  it('does not offer to drop a date that is going to be met', async () => {
    await renderApp(<Alerts alerts={[alert({ kind: 'due-soon' })]} />);
    expect(screen.queryByText('Drop the date')).toBeNull();
    expect(screen.getByText('Open')).toBeTruthy();
  });

  it('opens the game it is talking about', async () => {
    await renderApp(<Alerts alerts={[alert()]} />);
    await fireEvent.press(screen.getByText('Open'));
    expect(router.push).toHaveBeenCalledWith('/game/1');
  });
});
