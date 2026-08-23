import { screen } from '@testing-library/react-native';

import { WeekView } from '../WeekView';
import type { ScheduledItem } from '@/lib/scheduler';
import { renderApp } from '@/test-utils';

const item = (id: number, name: string, hours: number): ScheduledItem =>
  ({ id, name, hours, endHours: hours, finishAt: 0 }) as ScheduledItem;

/** A Monday evening, so the week runs through a weekend. */
const MONDAY = new Date(2026, 7, 17, 18).getTime();

/**
 * The week is drawn, not narrated.
 *
 * It has been a grid of named boxes and a column of collapsed runs;
 * both described a shape in words, and the run version added up every
 * game in the evenings a run spanned — so a game that ended halfway
 * through Tuesday claimed the hour the next one took, and the same game
 * carried two different lengths on one screen. What the strip shows is
 * seven columns; what it SAYS is one line per game, with that game's
 * own hours.
 */
describe('the week', () => {
  it('names a game once, however many evenings it covers', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Grand Theft Auto V', 74)]} now={MONDAY} />
    );
    expect(screen.getAllByText('Grand Theft Auto V')).toHaveLength(1);
  });

  it('counts only the hours that game actually gets', async () => {
    await renderApp(
      <WeekView
        scheduled={[item(1, 'Short One', 1.5), item(2, 'The Next One', 40)]}
        now={MONDAY}
      />
    );
    // Monday is an hour and a half and Short One takes all of it. The
    // run view reported this evening's whole capacity against whichever
    // game led it.
    expect(screen.getByText(/1\.5h this week/)).toBeTruthy();
  });

  it('says which evening the credits roll on', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByText(/credits Tonight/)).toBeTruthy();
  });

  /** Seven evenings, always — an empty one is information. */
  it('draws every evening whether or not it is spoken for', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByLabelText(/^Tonight, 1\.5h on Short One/)).toBeTruthy();
    expect(screen.getByLabelText('Tomorrow, free')).toBeTruthy();
  });

  it('shows nothing rather than an empty frame', async () => {
    await renderApp(<WeekView scheduled={[]} now={MONDAY} />);
    expect(screen.queryByText(/this week/)).toBeNull();
  });

  /** The card above names tonight's game; this must not disagree. */
  it('starts on the game it was told leads', async () => {
    await renderApp(
      <WeekView
        scheduled={[item(1, 'Tomb Raider', 10), item(2, 'GTA V', 20)]}
        now={MONDAY}
        leadId={2}
      />
    );
    expect(screen.getByLabelText(/^Tonight, .* on GTA V/)).toBeTruthy();
  });
});
