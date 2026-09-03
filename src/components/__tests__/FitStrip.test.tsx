import { screen } from '@testing-library/react-native';

import { FitStrip } from '../FitStrip';
import { fitFrom } from '@/lib/fit';
import { renderApp } from '@/test-utils';

// A Monday: weeknights hold 1.5h, Friday and Saturday 3h, Sunday 2h.
const MONDAY = new Date('2026-09-07T20:00:00').getTime();

/**
 * The one number on the page that is about the reader's life rather
 * than about the game.
 */
describe('how a game fits your evenings', () => {
  it('counts the evenings and names the night the credits roll', async () => {
    await renderApp(<FitStrip fit={fitFrom(6, MONDAY)!} now={MONDAY} />);
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
    await renderApp(<FitStrip fit={fitFrom(6, MONDAY)!} now={MONDAY} />);
    expect(screen.getByText(/4 evenings on this/)).toBeTruthy();
    expect(
      screen.getByText(/10 of the next fortnight still yours/)
    ).toBeTruthy();
  });

  /**
   * Whether there is a fit at all is the caller's question — see
   * `fitFrom`, which answers null for a game of unknown length, and
   * lib/__tests__/fit for the cases. A component that decided this for
   * itself left the page holding an empty slot.
   */

  it('admits when a game is longer than it can draw', async () => {
    await renderApp(<FitStrip fit={fitFrom(400, MONDAY)!} now={MONDAY} />);
    expect(screen.getByText('A long one')).toBeTruthy();
  });
});
