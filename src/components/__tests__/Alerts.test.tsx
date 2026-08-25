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

  it('says nothing about a game an evening from done', async () => {
    // That nudge is Tonight's story now — this section is only for
    // what actually needs a person.
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
    expect(screen.queryByText('Pentiment')).toBeNull();
  });

  it('says nothing about a date that is going to be met', async () => {
    // "That fits" is the route's story. A section named "what doesn't
    // fit" holding a row about something that does would be the soup
    // this replaced.
    await renderApp(<Alerts alerts={[alert({ kind: 'due-soon' })]} />);
    expect(screen.queryByText('Pentiment')).toBeNull();
  });

  it('holds the window overflow too, in the same calm voice', async () => {
    await renderApp(
      <Alerts
        alerts={[]}
        overflow={[{ id: 9, name: 'Enormous', hours: 300 }]}
      />
    );
    expect(screen.getByText('Enormous')).toBeTruthy();
    expect(screen.getByText(/more than the window has/)).toBeTruthy();
    // Overflow has no date to drop, but letting go is always on offer.
    expect(screen.queryByText('Drop the date')).toBeNull();
    expect(screen.getByText('Let it go')).toBeTruthy();
  });

  it('gives a game one row, even when it fails both ways', async () => {
    // The old page's defining bug: a game that missed its date AND
    // overflowed the window appeared twice, in two sections, with two
    // framings of the same fact.
    await renderApp(
      <Alerts
        alerts={[alert()]}
        overflow={[{ id: 1, name: 'Pentiment', hours: 40 }]}
      />
    );
    expect(screen.getAllByText('Pentiment')).toHaveLength(1);
  });

  it('opens the game it is talking about', async () => {
    await renderApp(<Alerts alerts={[alert()]} />);
    await fireEvent.press(screen.getByText('Open'));
    expect(router.push).toHaveBeenCalledWith('/game/1');
  });
});

describe('letting a game go from the alert', () => {
  const DROPS = 'sidequest.drops.v1';

  it('offers it, because the sentence promises it', async () => {
    // PRODUCT.md §6.4 calls "you can't finish this, drop it?" the
    // honest notification. This card is where the app says it.
    await renderApp(<Alerts alerts={[alert()]} />);
    expect(screen.getByText('Let it go')).toBeTruthy();
  });

  it('asks why before it does anything', async () => {
    // The reason is the only thing the shelves ever learn from a drop,
    // and a one-tap delete would throw it away.
    await renderApp(<Alerts alerts={[alert()]} />);
    await fireEvent.press(screen.getByText('Let it go'));
    expect(screen.getByText('Why this one? Optional.')).toBeTruthy();
    // And nothing has gone yet.
    expect(saved()).toBeTruthy();
  });

  it('lets it go, and learns from the answer', async () => {
    await renderApp(<Alerts alerts={[alert()]} />);
    await fireEvent.press(screen.getByText('Let it go'));
    await fireEvent.press(screen.getByText('Too long for me'));
    await waitFor(() => expect(saved()).toBeUndefined());
    expect(JSON.parse(store[DROPS] ?? '{}')['too-long']).toBe(1);
  });

  it('takes “rather not say” for an answer', async () => {
    // Nothing here may trap somebody who has already decided.
    await renderApp(<Alerts alerts={[alert()]} />);
    await fireEvent.press(screen.getByText('Let it go'));
    await fireEvent.press(screen.getByText('Rather not say'));
    await waitFor(() => expect(saved()).toBeUndefined());
    expect(store[DROPS]).toBeUndefined();
  });

  it('offers it only where it makes sense', async () => {
    // A game an evening from its credits is not one to let go of.
    await renderApp(<Alerts alerts={[alert({ kind: 'nearly-done' })]} />);
    expect(screen.queryByText('Let it go')).toBeNull();
  });
});
