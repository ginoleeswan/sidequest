import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SessionTimer } from '../SessionTimer';
import type { Game } from '@/api/types';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
const LIB = 'sidequest.library.v1';
const RUNNING = 'sidequest.session.running.v1';

const game = { id: 1, name: 'Celeste', playtime: 12 } as Game;

beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const saved = () => JSON.parse(store[LIB] ?? '{}')['1'];

/**
 * The point of the timer: progress that does not depend on being on
 * Steam. What it must never do is invent time or lose it.
 */
describe('a play session', () => {
  it('offers to start', async () => {
    await renderApp(<SessionTimer game={game} />);
    expect(screen.getByLabelText('Start a session on Celeste')).toBeTruthy();
  });

  it('keeps counting across a reload, because the clock is in storage', async () => {
    store[RUNNING] = JSON.stringify({
      gameId: 1,
      name: 'Celeste',
      startedAt: Date.now() - 80 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    expect(screen.getByText(/Playing · 1h 20m/)).toBeTruthy();
  });

  it('records the time against the game and asks the only question that matters', async () => {
    store[RUNNING] = JSON.stringify({
      gameId: 1,
      name: 'Celeste',
      startedAt: Date.now() - 90 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    await fireEvent.press(
      screen.getByLabelText('Stop playing and record the time')
    );
    await waitFor(() => expect(saved().hoursPlayed).toBe(1.5));
    expect(screen.getByText(/Did you see the credits\?/)).toBeTruthy();
  });

  it('saves a game you played but had not saved', async () => {
    store[RUNNING] = JSON.stringify({
      gameId: 1,
      name: 'Celeste',
      startedAt: Date.now() - 30 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    await fireEvent.press(
      screen.getByLabelText('Stop playing and record the time')
    );
    await waitFor(() => expect(saved().status).toBe('playing'));
  });

  it('marks it finished when the credits rolled', async () => {
    store[RUNNING] = JSON.stringify({
      gameId: 1,
      name: 'Celeste',
      startedAt: Date.now() - 60 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    await fireEvent.press(
      screen.getByLabelText('Stop playing and record the time')
    );
    await fireEvent.press(screen.getByText('Yes — finished it'));
    await waitFor(() => expect(saved().status).toBe('finished'));
  });

  it('adds nothing when the session is thrown away', async () => {
    store[RUNNING] = JSON.stringify({
      gameId: 1,
      name: 'Celeste',
      startedAt: Date.now() - 60 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    await fireEvent.press(screen.getByLabelText('Throw this session away'));
    await waitFor(() =>
      expect(screen.getByLabelText('Start a session on Celeste')).toBeTruthy()
    );
    expect(store[LIB]).toBeUndefined();
  });

  it('says which game a running session belongs to', async () => {
    store[RUNNING] = JSON.stringify({
      gameId: 99,
      name: 'Hades',
      startedAt: Date.now() - 10 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    expect(screen.getByText(/stops Hades/)).toBeTruthy();
  });

  it('adds to the hours already there rather than replacing them', async () => {
    store[LIB] = JSON.stringify({
      '1': { addedAt: 1, status: 'playing', hoursPlayed: 4, game },
    });
    store[RUNNING] = JSON.stringify({
      gameId: 1,
      name: 'Celeste',
      startedAt: Date.now() - 60 * 60_000,
    });
    await renderApp(<SessionTimer game={game} />);
    await act(async () => {
      await fireEvent.press(
        screen.getByLabelText('Stop playing and record the time')
      );
    });
    await waitFor(() => expect(saved().hoursPlayed).toBe(5));
  });
});
