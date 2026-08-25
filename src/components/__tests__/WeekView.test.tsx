import { screen } from '@testing-library/react-native';

import { WeekView } from '../WeekView';
import type { ScheduledItem } from '@/lib/scheduler';
import { renderApp } from '@/test-utils';

const item = (id: number, name: string, hours: number): ScheduledItem =>
  ({ id, name, hours, endHours: hours, finishAt: 0 }) as ScheduledItem;

/** A Monday evening, so the week runs through a weekend. */
const MONDAY = new Date(2026, 7, 17, 18).getTime();

/**
 * The week is an agenda, because the question is "what am I doing
 * Thursday?".
 *
 * It has been a grid of named boxes, a column of collapsed runs, and a
 * strip of seven vertical bars with a legend — every one of which asked
 * the reader to decode a picture. A row that says "MON 17 · Short One ·
 * 1.5h" is the answer said outright. These pin the agenda's promises:
 * real dates, each game's own hours, free evenings drawn as free, and
 * a run of one game named once rather than seven times.
 */
describe('the week', () => {
  it('names a game once, however many evenings it covers', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Grand Theft Auto V', 74)]} now={MONDAY} />
    );
    // Tonight's block carries the name; the other six evenings carry
    // its colour and their own hours. Seven rows all reading "Grand
    // Theft Aut…" is a worse way to say "this week is one game".
    expect(screen.getAllByText(/Grand Theft Auto V/)).toHaveLength(1);
  });

  it('gives each block that game’s own hours', async () => {
    await renderApp(
      <WeekView
        scheduled={[item(1, 'Short One', 1.5), item(2, 'The Next One', 40)]}
        now={MONDAY}
      />
    );
    // Monday is an hour and a half and Short One takes all of it. The
    // old run view reported the evening's whole capacity against
    // whichever game led it.
    expect(screen.getByText('Short One · 1.5h')).toBeTruthy();
  });

  it('is a calendar: it names dates, not just days', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByText('MON')).toBeTruthy();
    expect(screen.getByText('17')).toBeTruthy();
  });

  it('says which evening the credits roll on', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByLabelText(/^Tonight, .*the credits roll/)).toBeTruthy();
  });

  /**
   * Seven evenings, always — and a free one is DRAWN as free, because
   * a night the plan gives back has to look given back, not missed.
   */
  it('draws every evening whether or not it is spoken for', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByLabelText(/^Tonight, 1\.5h on Short One/)).toBeTruthy();
    expect(screen.getByLabelText('Tomorrow, free')).toBeTruthy();
    expect(screen.getAllByText('free evening').length).toBeGreaterThan(0);
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
