import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import TidyScreen from '../tidy';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
const KEY = 'sidequest.library.v1';
const YEAR = 365 * 24 * 60 * 60 * 1000;

beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

function seed(
  rows: {
    id: number;
    name: string;
    hours?: number;
    status?: string;
    addedAt?: number;
  }[]
) {
  store[KEY] = JSON.stringify(
    Object.fromEntries(
      rows.map((row) => [
        String(row.id),
        {
          addedAt: row.addedAt ?? Date.now(),
          status: row.status ?? 'wishlist',
          game: { id: row.id, name: row.name, playtime: row.hours ?? 10 },
        },
      ])
    )
  );
}

const library = () => JSON.parse(store[KEY] ?? '{}');

/**
 * The app's stance is that you were never going to get to eleven of
 * these and that is fine. This screen is that sentence, made operable —
 * and it must never scold.
 */
describe('backlog amnesty', () => {
  it('has nothing to say to an honest library', async () => {
    await renderApp(<TidyScreen />);
    expect(screen.getByText('Nothing to let go of')).toBeTruthy();
  });

  it('leaves finished games out of it — those are not a burden', async () => {
    seed([
      { id: 1, name: 'Done', status: 'finished' },
      { id: 2, name: 'Waiting' },
    ]);
    await renderApp(<TidyScreen />);
    expect(screen.getByText('Waiting')).toBeTruthy();
    expect(screen.queryByText('Done')).toBeNull();
  });

  it('finds what has been sitting there a year', async () => {
    seed([
      { id: 1, name: 'Ancient', addedAt: Date.now() - YEAR * 2 },
      { id: 2, name: 'Recent' },
    ]);
    await renderApp(<TidyScreen />);
    await fireEvent.press(screen.getByText('Saved a year ago'));
    expect(screen.getByText('Ancient')).toBeTruthy();
    expect(screen.queryByText('Recent')).toBeNull();
  });

  it('says what letting go gives back', async () => {
    seed([{ id: 1, name: 'Epic', hours: 40 }]);
    await renderApp(<TidyScreen />);
    await fireEvent.press(screen.getByLabelText('Epic'));
    expect(screen.getByText(/40h back/)).toBeTruthy();
  });

  it('lets several go at once, without a lecture', async () => {
    seed([
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' },
      { id: 3, name: 'Three' },
    ]);
    await renderApp(<TidyScreen />);
    await fireEvent.press(screen.getByLabelText('One'));
    await fireEvent.press(screen.getByLabelText('Two'));
    await fireEvent.press(screen.getByText('Let these go'));
    // Why is asked, and answering is optional.
    await fireEvent.press(screen.getByText('Rather not say'));
    await waitFor(() => expect(Object.keys(library())).toEqual(['3']));
    expect(screen.getByText('2 let go. Nothing owed.')).toBeTruthy();
  });

  it('learns from the answer when there is one', async () => {
    seed([
      { id: 1, name: 'Enormous' },
      { id: 2, name: 'Also enormous' },
    ]);
    await renderApp(<TidyScreen />);
    await fireEvent.press(screen.getByLabelText('Enormous'));
    await fireEvent.press(screen.getByLabelText('Also enormous'));
    await fireEvent.press(screen.getByText('Let these go'));
    await fireEvent.press(screen.getByText('Too long for me'));
    await waitFor(() =>
      expect(JSON.parse(store['sidequest.drops.v1'] ?? '{}')['too-long']).toBe(
        2
      )
    );
  });

  it('asks in the app’s own voice, not a form’s', async () => {
    seed([{ id: 1, name: 'One' }]);
    await renderApp(<TidyScreen />);
    await fireEvent.press(screen.getByLabelText('One'));
    await fireEvent.press(screen.getByText('Let these go'));
    expect(screen.getByText('Why this one? Optional.')).toBeTruthy();
  });

  it('offers the other honest answer: you already finished it', async () => {
    seed([{ id: 1, name: 'Actually Done' }]);
    await renderApp(<TidyScreen />);
    await fireEvent.press(screen.getByLabelText('Actually Done'));
    await fireEvent.press(screen.getByText('Actually finished'));
    await waitFor(() => expect(library()['1'].status).toBe('finished'));
    expect(library()['1'].finishedAt).toBeGreaterThan(0);
  });

  it('offers no actions until something is chosen', async () => {
    seed([{ id: 1, name: 'One' }]);
    await renderApp(<TidyScreen />);
    expect(screen.queryByText('Let these go')).toBeNull();
  });
});
