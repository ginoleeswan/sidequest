import { act, fireEvent, screen } from '@testing-library/react-native';

import { DurationSheet } from '../DurationSheet';
import type { Game } from '@/api/types';
import type { Duration } from '@/lib/duration';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const GAME = { id: 42, name: 'Hades II', playtime: 30 } as Game;
const KEY = 'sidequest.durations.v1';
const stored = () => JSON.parse(store[KEY] ?? '{}');

const estimate: Duration = { hours: 30, source: 'estimate', rough: false };
const mine: Duration = { hours: 25, source: 'yours', rough: false };

const open = (duration: Duration | null = estimate, onClose = jest.fn()) =>
  renderApp(
    <DurationSheet game={GAME} duration={duration} onClose={onClose} />
  ).then(() => onClose);

describe('DurationSheet', () => {
  it('shows nothing until a game is being edited', async () => {
    await renderApp(
      <DurationSheet game={null} duration={null} onClose={jest.fn()} />
    );
    expect(screen.queryByText('HOW LONG DOES IT TAKE?')).toBeNull();
  });

  it('names the game and where its current number came from', async () => {
    await open();
    expect(screen.getByText('Hades II')).toBeTruthy();
    expect(screen.getByText(/Estimated at/)).toBeTruthy();
  });

  it('says when the number is the player’s own', async () => {
    await open(mine);
    expect(screen.getByText(/Your answer/)).toBeTruthy();
  });

  /** A source with no estimate cannot be planned around; say so plainly. */
  it('admits when no estimate exists', async () => {
    await open({ hours: 0, source: 'unknown', rough: true });
    expect(screen.getByText(/No estimate exists/)).toBeTruthy();
  });

  it('flags an estimate that looks shaky', async () => {
    await open({ hours: 200, source: 'estimate', rough: true });
    expect(screen.getByText(/looks shaky/)).toBeTruthy();
  });

  it('saves a preset in one tap and closes', async () => {
    const onClose = await open();
    await act(async () => fireEvent.press(screen.getByText('20h')));
    expect(stored()['42']).toBe(20);
    expect(onClose).toHaveBeenCalled();
  });

  it('accepts a typed number', async () => {
    const onClose = await open();
    await act(async () =>
      fireEvent.changeText(screen.getByLabelText('Hours to finish'), '14')
    );
    await act(async () => fireEvent.press(screen.getByText('Save')));
    expect(stored()['42']).toBe(14);
    expect(onClose).toHaveBeenCalled();
  });

  it('understands the shapes people actually type', async () => {
    for (const [typed, hours] of [
      ['2.5', 2.5],
      ['90m', 1.5],
      ['12h', 12],
    ] as const) {
      for (const k of Object.keys(store)) delete store[k];
      await open();
      await act(async () =>
        fireEvent.changeText(screen.getByLabelText('Hours to finish'), typed)
      );
      await act(async () => fireEvent.press(screen.getByText('Save')));
      expect(stored()['42']).toBe(hours);
    }
  });

  /** Nonsense must not reach the planner. */
  it('refuses to save something it cannot read as a length', async () => {
    const onClose = await open();
    await act(async () =>
      fireEvent.changeText(screen.getByLabelText('Hours to finish'), 'soon')
    );
    await act(async () => fireEvent.press(screen.getByText('Save')));
    expect(stored()['42']).toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the backdrop is pressed', async () => {
    const onClose = await open();
    await act(async () => fireEvent.press(screen.getByText('Hades II')));
    expect(onClose).not.toHaveBeenCalled();
  });
});
