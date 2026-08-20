import type { ScheduledItem } from '../scheduler';
import { eveningHours, eveningLabel, planWeek } from '../week';

/** A Monday at 8pm. */
const MONDAY = new Date(2026, 7, 17, 20).getTime();
const DAY = 24 * 60 * 60 * 1000;

const item = (id: number, name: string, hours: number): ScheduledItem => ({
  id,
  name,
  hours,
  endHours: hours,
  finishAt: MONDAY + hours * DAY,
});

/**
 * "Done by 4 Sep" is an ordering. "Tuesday 2h, Thursday 2h, Saturday you
 * finish it" is a plan. Same data, and the difference is whether anyone
 * can act on it tonight.
 */
describe('the week', () => {
  it('gives a weeknight ninety minutes and a Saturday three hours', () => {
    expect(eveningHours(2)).toBe(1.5);
    expect(eveningHours(6)).toBe(3);
    expect(eveningHours(0)).toBe(2);
  });

  it('lays a game across the evenings it actually takes', () => {
    const week = planWeek([item(1, 'Celeste', 4.5)], MONDAY, 7);
    // 1.5 + 1.5 + 1.5 across Monday, Tuesday, Wednesday.
    expect(week.slice(0, 3).map((e) => e.games[0]?.hours)).toEqual([
      1.5, 1.5, 1.5,
    ]);
    expect(week[2].games[0].finishes).toBe(true);
    expect(week[3].games).toEqual([]);
  });

  it('starts the next game in the evening the last one ends', () => {
    const week = planWeek(
      [item(1, 'Short', 0.5), item(2, 'Next', 4)],
      MONDAY,
      3
    );
    expect(week[0].games.map((g) => g.name)).toEqual(['Short', 'Next']);
    expect(week[0].games[0].finishes).toBe(true);
    expect(week[0].games[1].hours).toBe(1);
  });

  it('leaves an evening empty rather than inventing something to play', () => {
    const week = planWeek([], MONDAY, 7);
    expect(week).toHaveLength(7);
    expect(week.every((e) => e.games.length === 0)).toBe(true);
  });

  it('never promises more in an evening than the evening holds', () => {
    const week = planWeek([item(1, 'Epic', 100)], MONDAY, 7);
    for (const evening of week) {
      const spent = evening.games.reduce((sum, g) => sum + g.hours, 0);
      expect(spent).toBeLessThanOrEqual(evening.hours + 0.001);
    }
  });

  it('spends the weekend, which is where a backlog is actually cleared', () => {
    const week = planWeek([item(1, 'Epic', 100)], MONDAY, 7);
    const saturday = week.find((e) => e.weekday === 6);
    expect(saturday?.games[0].hours).toBe(3);
  });

  it('calls today tonight and tomorrow tomorrow', () => {
    const week = planWeek([item(1, 'Celeste', 10)], MONDAY, 3);
    expect(eveningLabel(week[0], MONDAY)).toBe('Tonight');
    expect(eveningLabel(week[1], MONDAY)).toBe('Tomorrow');
    expect(eveningLabel(week[2], MONDAY)).toBe('Wednesday');
  });
});
