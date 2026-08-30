import type { Alert } from '../alerts';
import type { Memcard } from '../memcard';
import type { PlannedEvening } from '../week';
import {
  horizonShape,
  midnightOf,
  planTimeline,
  pressureOf,
  tonightShape,
  weekShape,
  yearShape,
} from '../widgetData';

const DAY_ONE = new Date(2026, 7, 17).getTime();

const night = (
  weekday: number,
  games: { name: string; hours: number; finishes?: boolean }[] = [],
  date: number = DAY_ONE
): PlannedEvening => ({
  date,
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
      id: 0,
      title: 'Hades',
      hours: 2,
      finishes: false,
    });
  });

  /**
   * The id is the widget's tap target: it opens the game rather than
   * the plan. It has to be the LEAD game's, not the evening's first by
   * some other ordering, or a widget naming one game opens another.
   */
  it('carries the lead game id, so the widget can open that game', () => {
    const week = [
      night(2, [
        { name: 'Hades', hours: 2 },
        { name: 'Celeste', hours: 1 },
      ]),
    ];
    const tonight = tonightShape(week);
    expect(tonight?.id).toBe(week[0].games[0].id);
    expect(tonight?.title).toBe('Hades');
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
      {
        day: 'SUN',
        date: 17,
        title: '',
        hours: 0,
        finishes: false,
        colour: -1,
        named: false,
      },
      {
        day: 'MON',
        date: 17,
        title: 'Hades',
        hours: 2,
        finishes: false,
        colour: 0,
        named: true,
      },
    ]);
  });

  /**
   * "THU" is a repeating label; "THU 28" is a calendar. The widget does
   * no date formatting of its own, so the day of the month is decided
   * here — the same discipline as every other field on this shape.
   */
  it('names the date, not only the weekday', () => {
    const shaped = weekShape([
      night(1, [{ name: 'Hades', hours: 2 }], new Date(2026, 7, 24).getTime()),
    ]);
    expect(shaped[0].date).toBe(24);
  });

  /**
   * Colour comes from the route, so the block on a Lock Screen and the
   * block in the app are the same colour for the same game. Sent, not
   * derived: two copies of a palette is how they drift.
   */
  it('paints each game its place in the route', () => {
    const shaped = weekShape(
      [
        night(1, [{ name: 'First', hours: 2 }]),
        night(2, [{ name: 'Third', hours: 2 }]),
      ].map((n, i) => ({
        ...n,
        games: n.games.map((g) => ({ ...g, id: i === 0 ? 10 : 30 })),
      })),
      [{ id: 10 }, { id: 20 }, { id: 30 }]
    );
    expect(shaped.map((n) => n.colour)).toEqual([0, 2]);
  });

  /**
   * A game across five nights is one fact, not five. The app names a
   * run once and lets the rest carry the colour; so does the widget,
   * off the same decision rather than its own copy of the rule.
   */
  it('names a run once', () => {
    // Real ids: the run is decided by identity, not by the name
    // happening to match, so the fixture has to carry them.
    const on = (id: number, name: string, weekday: number) => ({
      ...night(weekday, [{ name, hours: 2 }]),
      games: [{ id, name, hours: 2, finishes: false }],
    });
    const shaped = weekShape([
      on(1, 'Hades', 1),
      on(1, 'Hades', 2),
      on(2, 'Tunic', 3),
    ]);
    expect(shaped.map((n) => n.named)).toEqual([true, false, true]);
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

/**
 * The month, for a screen nobody opened.
 *
 * Same picture as `components/HorizonStrip`, cropped to what reads at
 * widget width — and cropped HERE, so the two cannot disagree about
 * how much past a month carries or how far ahead it looks. Swift is
 * given an axis and some dates; every decision is already made.
 */
describe('horizonShape', () => {
  const DAY = 86_400_000;
  const NOW = new Date(2026, 7, 17, 9).getTime();
  const land = (id: number, name: string, days: number) => ({
    id,
    name,
    finishAt: NOW + days * DAY,
  });

  it('is nothing at all without a plan', () => {
    expect(horizonShape([], [], null, NOW)).toBeNull();
  });

  it('marks the landings ahead, in route order and route colours', () => {
    const shape = horizonShape(
      [land(1, 'Hades', 5), land(2, 'Tunic', 20)],
      [],
      null,
      NOW
    );
    expect(shape?.marks.map((m) => [m.name, m.colour, m.done])).toEqual([
      ['Hades', 0, false],
      ['Tunic', 1, false],
    ]);
  });

  /**
   * Swift formats no dates, the same as it shortens no day names: two
   * formatters is two answers, and only one of them is on the screen
   * the person also opened.
   */
  it('writes the date out, so the widget never formats one', () => {
    const shape = horizonShape([land(1, 'Hades', 5)], [], NOW + 3 * DAY, NOW);
    expect(shape?.marks[0].label).toBe('Aug 22');
    expect(shape?.troubleLabel).toBe('Aug 20');
  });

  it('leaves the trouble label empty when there is no trouble', () => {
    const shape = horizonShape([land(1, 'Hades', 5)], [], null, NOW);
    expect(shape?.troubleLabel).toBe('');
  });

  /**
   * The publisher decides whether to write to the app group at all by
   * comparing the whole payload as JSON. A schedule recomputed a second
   * later moves every finishAt by a second, so raw timestamps would
   * make the plan differ from itself on every settle — a container
   * write and two widget reloads for a picture nobody could tell apart.
   */
  it('is identical for two moments of the same day', () => {
    const a = horizonShape(
      [land(1, 'Hades', 5)],
      [{ id: 9, name: 'Done', finishedAt: NOW - 3 * DAY }],
      NOW + 3 * DAY,
      NOW
    );
    const b = horizonShape(
      [{ ...land(1, 'Hades', 5), finishAt: NOW + 5 * DAY + 90_000 }],
      [{ id: 9, name: 'Done', finishedAt: NOW - 3 * DAY + 90_000 }],
      NOW + 3 * DAY + 90_000,
      NOW + 90_000
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('counts the landings it had no room to draw', () => {
    const shape = horizonShape(
      [1, 2, 3, 4, 5].map((n) => land(n, `Game ${n}`, n * 10)),
      [],
      null,
      NOW
    );
    // Three ahead on a widget, where the page draws four: the same
    // picture, cropped to what will actually read at that size.
    expect(shape?.marks).toHaveLength(3);
    expect(shape?.beyond).toBe(2);
  });

  it('stamps the most recent finish behind today', () => {
    const shape = horizonShape(
      [land(1, 'Tunic', 14)],
      [
        { id: 8, name: 'Older', finishedAt: NOW - 15 * DAY },
        { id: 9, name: 'Newer', finishedAt: NOW - 2 * DAY },
      ],
      null,
      NOW
    );
    expect(shape?.marks[0]).toMatchObject({ name: 'Newer', done: true });
    expect(shape?.marks.map((m) => m.name)).not.toContain('Older');
    // The axis reaches back to hold it, so the past keeps its true
    // proportion rather than being squeezed into a fixed slice.
    expect(shape!.from).toBeLessThan(NOW);
  });

  it('forgets a finish older than the horizon', () => {
    const shape = horizonShape(
      [land(1, 'Tunic', 14)],
      [{ id: 9, name: 'Ancient', finishedAt: NOW - 90 * DAY }],
      null,
      NOW
    );
    expect(shape?.marks.every((m) => !m.done)).toBe(true);
    // Nothing behind today, so the axis does not reach back past it.
    expect(shape?.from).toBe(midnightOf(NOW));
  });

  it('stretches the axis to hold a date that cannot be met', () => {
    const trouble = NOW + 60 * DAY;
    const shape = horizonShape([land(1, 'Tunic', 5)], [], trouble, NOW);
    expect(shape?.troubleAt).toBe(midnightOf(trouble));
    expect(shape!.to).toBeGreaterThan(trouble);
  });

  /** A plan that ends on Thursday should still read as time, not a wall. */
  it('never draws a horizon shorter than a fortnight', () => {
    const shape = horizonShape([land(1, 'Quick', 2)], [], null, NOW);
    expect(shape!.to - NOW).toBeGreaterThan(14 * DAY);
  });
});
