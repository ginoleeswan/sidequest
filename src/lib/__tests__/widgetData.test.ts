import type { Memcard } from '../memcard';
import type { PlannedEvening } from '../week';
import { tonightShape, weekShape, yearShape } from '../widgetData';

const night = (
  weekday: number,
  games: { name: string; hours: number; finishes?: boolean }[] = []
): PlannedEvening => ({
  date: 0,
  weekday,
  hours: games.reduce((sum, g) => sum + g.hours, 0),
  games: games.map((g, i) => ({
    id: i,
    name: g.name,
    hours: g.hours,
    finishes: g.finishes ?? false,
  })),
});

describe('tonightShape', () => {
  it('names the lead game and the evening it belongs to', () => {
    expect(tonightShape([night(2, [{ name: 'Hades', hours: 2 }])])).toEqual({
      title: 'Hades',
      hours: 2,
      finishes: false,
    });
  });

  /**
   * The regression this function exists to avoid. Taking week[0] blindly
   * puts "No plan yet" on the Lock Screen while four evenings sit booked
   * later in the week — wrong, and in the most visible place to be wrong.
   */
  it('skips free evenings to find the next one with a game', () => {
    const week = [
      night(1),
      night(2),
      night(3, [{ name: 'Pragmata', hours: 4 }]),
    ];
    expect(tonightShape(week)?.title).toBe('Pragmata');
  });

  it('counts the whole evening, not just the lead game', () => {
    const week = [
      night(2, [
        { name: 'Hades', hours: 2 },
        { name: 'Tunic', hours: 1 },
      ]),
    ];
    expect(tonightShape(week)?.hours).toBe(3);
  });

  it('reports credits when anything that evening finishes', () => {
    const week = [
      night(2, [
        { name: 'Hades', hours: 2 },
        { name: 'Tunic', hours: 1, finishes: true },
      ]),
    ];
    expect(tonightShape(week)?.finishes).toBe(true);
  });

  it('is null for a week with nothing in it', () => {
    expect(tonightShape([night(1), night(2)])).toBeNull();
    expect(tonightShape([])).toBeNull();
  });
});

describe('weekShape', () => {
  it('keeps free evenings, marked as free', () => {
    const shaped = weekShape([
      night(0),
      night(1, [{ name: 'Hades', hours: 2 }]),
    ]);
    expect(shaped).toEqual([
      { day: 'SUN', title: '', hours: 0, finishes: false },
      { day: 'MON', title: 'Hades', hours: 2, finishes: false },
    ]);
  });

  it('labels every weekday, Sunday first', () => {
    const days = weekShape([0, 1, 2, 3, 4, 5, 6].map((d) => night(d))).map(
      (n) => n.day
    );
    expect(days).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
  });

  // Swift reads this cold; a weekday outside 0-6 must not become
  // "undefined" on somebody's home screen.
  it('does not print undefined for a weekday it does not know', () => {
    expect(weekShape([night(9)])[0].day).toBe('');
  });
});

describe('yearShape', () => {
  const card = (blocks: { month: number }[]): Memcard => ({
    year: 2026,
    count: blocks.length,
    hours: 208.4,
    blocks: blocks.map((b, i) => ({
      id: i,
      name: `Game ${i}`,
      hours: 10,
      month: b.month,
    })),
    longest: null,
    headline: '',
    subhead: '',
  });

  it('counts finishes into twelve months, January first', () => {
    const { months } = yearShape(
      card([{ month: 0 }, { month: 0 }, { month: 11 }])
    );
    expect(months.length).toBe(12);
    expect(months[0]).toBe(2);
    expect(months[11]).toBe(1);
    expect(months[5]).toBe(0);
  });

  it('rounds the hours, because the widget has no room for a decimal', () => {
    expect(yearShape(card([])).hours).toBe(208);
  });

  // Reading cold means a month index from bad data must not write past
  // the end of the array and hand Swift eleven slots, or thirteen.
  it('ignores a month outside the year', () => {
    const { months } = yearShape(card([{ month: 12 }, { month: -1 }]));
    expect(months.length).toBe(12);
    expect(months.every((m) => m === 0)).toBe(true);
  });

  it('describes an empty year without inventing one', () => {
    const shaped = yearShape(card([]));
    expect(shaped.count).toBe(0);
    expect(shaped.months).toEqual(Array(12).fill(0));
  });
});
