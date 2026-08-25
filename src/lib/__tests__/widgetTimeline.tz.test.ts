import { midnightOf, planTimeline } from '../widgetData';

/**
 * The two days a year that are not twenty-four hours long.
 *
 * A widget timeline is a list of dated entries, and WidgetKit shows
 * each one from its date until the next. Step through the week by
 * adding 86,400,000 milliseconds and the Monday after the spring
 * change lands at 01:00 rather than 00:00 — so for that first hour the
 * widget still shows Sunday's plan, on the one morning of the year
 * somebody is most likely to glance at a clock.
 *
 * This file exists apart from the rest because the bug only appears in
 * a timezone that observes the change, and the runner is UTC, which
 * does not. Setting `process.env.TZ` inside a test does not help —
 * jest's sandbox has already fixed the timezone by then, and `Date`
 * quietly keeps reporting UTC, so the test passes against the broken
 * implementation. The clock has to be set before the process starts,
 * which is what `npm run test:tz` does.
 */

const HOUR = 3_600_000;

describe('planTimeline across a clock change', () => {
  const calm = { urgency: 'calm' as const, note: '', days: null };
  const timeline = (from: string) =>
    planTimeline(
      () => [],
      () => calm,
      new Date(from).getTime()
    );

  it('runs on London time, or it proves nothing', () => {
    // Guards the guard: if this file is ever run without TZ set, every
    // assertion below would hold trivially and say nothing.
    expect(new Date('2026-07-01T12:00:00Z').getTimezoneOffset()).toBe(-60);
  });

  it('starts every morning at midnight through the spring change', () => {
    // Clocks go forward on Sunday 29 March 2026.
    for (const day of timeline('2026-03-27T10:00:00')) {
      expect(new Date(day.at).getHours()).toBe(0);
      expect(new Date(day.at).getMinutes()).toBe(0);
    }
  });

  it('starts every morning at midnight through the autumn change', () => {
    // And back on Sunday 25 October 2026, where the naive version
    // overshoots instead of falling short.
    for (const day of timeline('2026-10-23T10:00:00')) {
      expect(new Date(day.at).getHours()).toBe(0);
    }
  });

  it('covers seven distinct days, not six and a repeat', () => {
    const days = timeline('2026-03-27T10:00:00');
    expect(
      new Set(days.map((day) => new Date(day.at).getDate()).sort()).size
    ).toBe(7);
  });

  it('spans a short day and a long one without a gap or an overlap', () => {
    const spring = timeline('2026-03-27T10:00:00');
    const shortDay = spring.find((day) => new Date(day.at).getDate() === 29)!;
    const next = spring.find((day) => new Date(day.at).getDate() === 30)!;
    // 23 hours in March, and the entries meet exactly.
    expect(next.at - shortDay.at).toBe(23 * HOUR);

    const autumn = timeline('2026-10-23T10:00:00');
    const longDay = autumn.find((day) => new Date(day.at).getDate() === 25)!;
    const after = autumn.find((day) => new Date(day.at).getDate() === 26)!;
    expect(after.at - longDay.at).toBe(25 * HOUR);
  });

  it('midnightOf lands on midnight whatever hour it is handed', () => {
    for (const hour of [0, 1, 12, 23]) {
      const at = midnightOf(new Date(2026, 2, 30, hour, 30).getTime());
      expect(new Date(at).getHours()).toBe(0);
      expect(new Date(at).getDate()).toBe(30);
    }
  });
});
