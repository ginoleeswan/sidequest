import { screen } from '@testing-library/react-native';

import { HorizonStrip } from '../HorizonStrip';
import type { ScheduledItem } from '@/lib/scheduler';
import { renderApp } from '@/test-utils';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 7, 17, 18).getTime();

const lands = (id: number, name: string, finishAt: number): ScheduledItem =>
  ({ id, name, hours: 10, endHours: 10, finishAt }) as ScheduledItem;

/**
 * The month is a timeline, never a grid.
 *
 * Its only facts are when each game's credits land and whether every
 * date can be met, so that is all it draws: today at one end, a flag
 * on each landing, and a doomed deadline as coral weather. Thirty
 * boxes, twenty-six of them empty, would bury both facts under
 * obligation — which is the one register this app refuses.
 */
describe('the horizon', () => {
  it('plants each landing on its date, with its name', async () => {
    await renderApp(
      <HorizonStrip
        scheduled={[
          lands(1, 'Hades', NOW + 5 * DAY),
          lands(2, 'Tunic', NOW + 19 * DAY),
        ]}
        now={NOW}
      />
    );
    expect(screen.getByText('Aug 22')).toBeTruthy();
    expect(screen.getByText('Sep 5')).toBeTruthy();
    expect(screen.getByText('Hades')).toBeTruthy();
    expect(screen.getByText('Tunic')).toBeTruthy();
  });

  it('anchors the strip at today', async () => {
    await renderApp(
      <HorizonStrip scheduled={[lands(1, 'Hades', NOW + 5 * DAY)]} now={NOW} />
    );
    expect(screen.getByText('TODAY')).toBeTruthy();
  });

  it('draws a date that cannot be met as weather, on its day', async () => {
    await renderApp(
      <HorizonStrip
        scheduled={[lands(1, 'Hades', NOW + 5 * DAY)]}
        now={NOW}
        troubled={[{ id: 2, name: 'Elden Ring', deadline: NOW + 3 * DAY }]}
      />
    );
    // The date itself, in coral, above the spine. The sentence and the
    // ways out belong to "What doesn't fit", not here.
    expect(screen.getByText('Aug 20')).toBeTruthy();
  });

  it('reads its whole story aloud', async () => {
    await renderApp(
      <HorizonStrip
        scheduled={[lands(1, 'Hades', NOW + 5 * DAY)]}
        now={NOW}
        troubled={[{ id: 2, name: 'Elden Ring', deadline: NOW + 3 * DAY }]}
      />
    );
    expect(
      screen.getByLabelText(/Credits land: Hades Aug 22.*can’t be met/)
    ).toBeTruthy();
  });

  /**
   * Twenty flags in three hundred points of width says nothing at all.
   * The near ones are drawn; the rest are counted in a sentence,
   * because a horizon that pretends there is nothing past it is a lie.
   */
  it('draws the near landings and counts the rest', async () => {
    await renderApp(
      <HorizonStrip
        scheduled={Array.from({ length: 7 }, (_, i) =>
          lands(i + 1, `Game ${i + 1}`, NOW + (i + 1) * 10 * DAY)
        )}
        now={NOW}
      />
    );
    expect(screen.getByText('Game 4')).toBeTruthy();
    expect(screen.queryByText('Game 5')).toBeNull();
    expect(screen.getByText(/3 more after that/)).toBeTruthy();
    // And the last one's date is named, so the sentence is a fact.
    expect(screen.getByText(/Oct 26/)).toBeTruthy();
  });

  it('says nothing about a beyond that isn’t there', async () => {
    await renderApp(
      <HorizonStrip scheduled={[lands(1, 'Hades', NOW + 5 * DAY)]} now={NOW} />
    );
    expect(screen.queryByText(/more after that/)).toBeNull();
  });

  /**
   * A timeline with only a future on it is a schedule, and a schedule
   * is a thing you owe. With the last few credits still on it, it is a
   * life — which is the register this app actually wants (§2.1).
   */
  describe('what already landed', () => {
    it('stamps a recent finish behind today', async () => {
      await renderApp(
        <HorizonStrip
          scheduled={[lands(1, 'Tunic', NOW + 14 * DAY)]}
          now={NOW}
          landed={[{ id: 9, name: 'Hades', finishedAt: NOW - 10 * DAY }]}
        />
      );
      expect(screen.getByText('Hades')).toBeTruthy();
      expect(screen.getByText('Aug 7')).toBeTruthy();
      expect(
        screen.getByLabelText(/Already finished: Hades Aug 7.*Credits land/)
      ).toBeTruthy();
    });

    it('forgets what is older than the horizon', async () => {
      await renderApp(
        <HorizonStrip
          scheduled={[lands(1, 'Tunic', NOW + 14 * DAY)]}
          now={NOW}
          landed={[{ id: 9, name: 'Ancient', finishedAt: NOW - 90 * DAY }]}
        />
      );
      expect(screen.queryByText('Ancient')).toBeNull();
      expect(screen.queryByLabelText(/Already finished/)).toBeNull();
    });

    it('keeps the two most recent, not the first two it was handed', async () => {
      await renderApp(
        <HorizonStrip
          scheduled={[lands(1, 'Tunic', NOW + 14 * DAY)]}
          now={NOW}
          landed={[
            { id: 7, name: 'Oldest', finishedAt: NOW - 20 * DAY },
            { id: 8, name: 'Middle', finishedAt: NOW - 12 * DAY },
            { id: 9, name: 'Newest', finishedAt: NOW - 2 * DAY },
          ]}
        />
      );
      expect(screen.queryByText('Oldest')).toBeNull();
      expect(screen.getByText('Middle')).toBeTruthy();
      expect(screen.getByText('Newest')).toBeTruthy();
    });

    /** A date in the future is not something that already happened. */
    it('ignores a finish stamped ahead of now', async () => {
      await renderApp(
        <HorizonStrip
          scheduled={[lands(1, 'Tunic', NOW + 14 * DAY)]}
          now={NOW}
          landed={[{ id: 9, name: 'Impossible', finishedAt: NOW + 3 * DAY }]}
        />
      );
      expect(screen.queryByText('Impossible')).toBeNull();
    });

    it('says today is today, and not the left edge', async () => {
      // With stamps behind it the left edge is three weeks ago, so
      // TODAY has to stand on its own tick rather than float at 0.
      await renderApp(
        <HorizonStrip
          scheduled={[lands(1, 'Tunic', NOW + 14 * DAY)]}
          now={NOW}
          landed={[{ id: 9, name: 'Hades', finishedAt: NOW - 10 * DAY }]}
        />
      );
      expect(screen.getByText('TODAY')).toBeTruthy();
    });
  });

  it('renders nothing without a schedule', async () => {
    await renderApp(<HorizonStrip scheduled={[]} now={NOW} />);
    expect(screen.queryByText('TODAY')).toBeNull();
  });
});
