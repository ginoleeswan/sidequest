import { screen } from '@testing-library/react-native';

import { FitStrip } from '../FitStrip';
import { renderApp } from '@/test-utils';

// A Monday: weeknights hold 1.5h, Friday and Saturday 3h, Sunday 2h.
const MONDAY = new Date('2026-09-07T20:00:00').getTime();

/**
 * The one number on the page that is about the reader's life rather
 * than about the game.
 */
describe('how a game fits your evenings', () => {
  it('counts the evenings and names the night the credits roll', async () => {
    await renderApp(<FitStrip hours={6} now={MONDAY} />);
    expect(screen.getByText('Four evenings')).toBeTruthy();
    expect(
      screen.getByText('Start tonight, see the credits Thursday.')
    ).toBeTruthy();
  });

  /**
   * A fortnight with four evenings spent and ten free is the good news,
   * and news the app says out loud rather than leaving to be inferred
   * from blank space.
   */
  it('says how much of the fortnight you keep', async () => {
    await renderApp(<FitStrip hours={6} now={MONDAY} />);
    expect(screen.getByText(/4 evenings on this/)).toBeTruthy();
    expect(
      screen.getByText(/10 of the next fortnight still yours/)
    ).toBeTruthy();
  });

  it('draws nothing for a game of unknown length', async () => {
    await renderApp(<FitStrip hours={0} now={MONDAY} />);
    expect(screen.queryByText(/evening/)).toBeNull();
  });

  it('admits when a game is longer than it can draw', async () => {
    await renderApp(<FitStrip hours={400} now={MONDAY} />);
    expect(screen.getByText('A long one')).toBeTruthy();
  });
});
