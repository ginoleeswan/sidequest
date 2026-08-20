import { screen } from '@testing-library/react-native';

import { WeekView } from '../WeekView';
import type { ScheduledItem } from '@/lib/scheduler';
import { renderApp } from '@/test-utils';

const item = (id: number, name: string, hours: number): ScheduledItem =>
  ({ id, name, hours, endHours: hours, finishAt: 0 }) as ScheduledItem;

/** A Monday evening, so the week runs through a weekend. */
const MONDAY = new Date(2026, 7, 17, 18).getTime();

describe('the week', () => {
  it('names a game once for the run of evenings it covers', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Grand Theft Auto V', 74)]} now={MONDAY} />
    );
    expect(screen.getAllByText('Grand Theft Auto V')).toHaveLength(1);
    expect(screen.getByText(/across 7 evenings/)).toBeTruthy();
  });

  it('labels a run with the span it covers', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Long One', 74)]} now={MONDAY} />
    );
    expect(screen.getByText(/^TONIGHT – /)).toBeTruthy();
  });

  it('gives a single evening a single label and no span', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByText('TONIGHT')).toBeTruthy();
    expect(screen.queryByText(/across/)).toBeNull();
  });

  /** An empty evening is information — seeing it is half the point. */
  it('draws the evenings with nothing in them', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByText(/evenings free/)).toBeTruthy();
  });

  it('marks where the credits roll', async () => {
    await renderApp(
      <WeekView scheduled={[item(1, 'Short One', 1.5)]} now={MONDAY} />
    );
    expect(screen.getByText('CREDITS')).toBeTruthy();
  });

  it('shows nothing rather than an empty frame', async () => {
    await renderApp(<WeekView scheduled={[]} now={MONDAY} />);
    expect(screen.queryByText('CREDITS')).toBeNull();
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
    expect(screen.getByText('GTA V')).toBeTruthy();
  });
});
