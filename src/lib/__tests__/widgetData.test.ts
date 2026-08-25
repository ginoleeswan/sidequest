import type { Alert } from '../alerts';
import type { Memcard } from '../memcard';
import type { PlannedEvening } from '../week';
import {
  midnightOf,
  planTimeline,
  pressureOf,
  tonightShape,
  weekShape,
  yearShape,
} from '../widgetData';

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

describe('pressureOf', () => {
  const alert = (over: Partial<Alert> = {}): Alert => ({
    kind: 'due-soon',
    gameId: 1,
    name: 'Hades',
    message: 'in-app sentence',
    days: 3,
    hoursLeft: 4,
    ...over,
  });
  const summary = { games: 3, lastFinishAt: null };

  it('paints red for a deadline there is no room for', () => {
    // The one state where doing nothing is the wrong answer, so it
    // outranks everything else the widget could say.
    const { urgency, note } = pressureOf(
      [
        alert({ kind: 'due-soon' }),
        alert({ kind: 'at-risk', name: 'Elden Ring' }),
      ],
      summary,
      0
    );
    expect(urgency).toBe('red');
    expect(note).toBe("Elden Ring won't fit");
  });

  it('says plainly when the date has already gone', () => {
    const { note } = pressureOf(
      [alert({ kind: 'at-risk', days: -2 })],
      summary,
      0
    );
    expect(note).toBe('Hades is past its date');
  });

  it('paints amber for a deadline that still fits', () => {
    const { urgency, note } = pressureOf([alert({ days: 3 })], summary, 0);
    expect(urgency).toBe('amber');
    expect(note).toBe('Hades due in 3d');
  });

  it('does not say “in 0d”', () => {
    expect(pressureOf([alert({ days: 0 })], summary, 0).note).toBe(
      'Hades due today'
    );
  });

  it('is the plan itself when nothing is pressing', () => {
    // The line §6.1 calls the marketing asset: a home screen that says
    // what the app is for without a word of explanation.
    const twelveDays = 12 * 86_400_000;
    const { urgency, note } = pressureOf(
      [],
      { games: 3, lastFinishAt: twelveDays },
      0
    );
    expect(urgency).toBe('calm');
    expect(note).toBe('3 games · 12 days');
  });

  it('counts one game as one game', () => {
    expect(pressureOf([], { games: 1, lastFinishAt: 86_400_000 }, 0).note).toBe(
      '1 game · 1 day'
    );
  });

  it('says nothing at all with nothing planned', () => {
    expect(pressureOf([], { games: 0, lastFinishAt: null }, 0)).toEqual({
      urgency: 'calm',
      note: '',
      days: null,
    });
  });

  it('carries the days to the date, for the ring to draw', () => {
    // §6.1 asks the small and Lock Screen families for a
    // days-remaining ring, and a ring needs a quantity rather than a
    // sentence.
    expect(pressureOf([alert({ days: 9 })], summary, 0).days).toBe(9);
    expect(
      pressureOf([alert({ kind: 'at-risk', days: 3 })], summary, 0).days
    ).toBe(3);
  });

  it('keeps a date that has gone as a negative, not as zero', () => {
    // Past-its-date is a real state, and rounding it up would hide it.
    expect(
      pressureOf([alert({ kind: 'at-risk', days: -4 })], summary, 0).days
    ).toBe(-4);
  });

  it('has no days to count when nothing is pressing', () => {
    expect(pressureOf([], { games: 2, lastFinishAt: 0 }, 0).days).toBeNull();
  });

  it('ignores nearly-done, which is a nudge and not a pressure', () => {
    const { urgency } = pressureOf(
      [alert({ kind: 'nearly-done', days: undefined })],
      { games: 2, lastFinishAt: null },
      0
    );
    expect(urgency).toBe('calm');
  });
});

describe('planTimeline', () => {
  const DAY = 86_400_000;
  const calm = { urgency: 'calm' as const, note: '', days: null };
  const daysApart = (from: number, to: number) =>
    Math.round((new Date(to).setHours(12) - new Date(from).setHours(12)) / DAY);
  // A Wednesday, mid-morning, so "today" is unambiguous.
  const now = new Date('2026-03-04T10:00:00').getTime();

  it('decides every morning of the week in advance', () => {
    // The whole point: seven future-dated entries mean the widget is
    // right all week without the app ever being opened.
    const days = planTimeline(
      () => [],
      () => calm,
      now
    );
    expect(days).toHaveLength(7);
    expect(days[0].at).toBe(midnightOf(now));
    // Consecutive calendar mornings, asserted as dates rather than as
    // multiples of 24 hours — two days a year are not. The clock-change
    // cases live in widgetTimeline.tz.test.ts, which needs a timezone
    // this runner does not have.
    for (const [index, day] of days.entries()) {
      expect(new Date(day.at).getHours()).toBe(0);
      if (index > 0) expect(daysApart(days[index - 1].at, day.at)).toBe(1);
    }
  });

  it('asks the engine what the plan looks like on each of those days', () => {
    // Not one snapshot re-rendered seven times — which is what the
    // first build did, and why Monday's game sat on the Lock Screen
    // through Wednesday.
    const asked: number[] = [];
    const days = planTimeline(
      (at) => {
        asked.push(at);
        return [
          night(new Date(at).getDay(), [
            { name: `Game ${asked.length}`, hours: 2 },
          ]),
        ];
      },
      () => calm,
      now
    );
    expect(asked).toHaveLength(7);
    expect(new Set(asked).size).toBe(7);
    expect(days.map((d) => d.tonight?.title)).toEqual([
      'Game 1',
      'Game 2',
      'Game 3',
      'Game 4',
      'Game 5',
      'Game 6',
      'Game 7',
    ]);
  });

  it('lets the plan run out instead of repeating the last game', () => {
    // A widget that is confidently wrong is worse than one that admits
    // it knows nothing.
    const days = planTimeline(
      (at) =>
        at < midnightOf(now) + 2 * DAY
          ? [night(0, [{ name: 'Hades', hours: 2 }])]
          : [],
      () => calm,
      now
    );
    expect(days[0].tonight?.title).toBe('Hades');
    expect(days[1].tonight?.title).toBe('Hades');
    expect(days[2].tonight).toBeNull();
    expect(days[6].tonight).toBeNull();
  });

  it('lets the pressure change as the dates approach', () => {
    const days = planTimeline(
      () => [night(0, [{ name: 'Hades', hours: 2 }])],
      (at) =>
        at >= midnightOf(now) + 3 * DAY
          ? { urgency: 'red', note: "Hades won't fit", days: 2 }
          : calm,
      now
    );
    expect(days.map((d) => d.pressure.urgency)).toEqual([
      'calm',
      'calm',
      'calm',
      'red',
      'red',
      'red',
      'red',
    ]);
  });
});
