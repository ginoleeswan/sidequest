import type { LibraryEntry } from '../library';
import { planItems } from '../planning';
import { widgetPlan } from '../widgetPlan';
import type { Game } from '@/api/types';

/**
 * What the widgets are actually told, from a real library.
 *
 * `widgetData` owns the shapes and `planTimeline` owns the stepping;
 * both are tested on their own against callbacks. This is the layer
 * that runs the real engines, so what it has to get right is the split:
 * the plan is worked out once and walked, because the library does not
 * change while the week passes — but the pressure is worked out for
 * every morning, because a deadline gets closer whether anybody opens
 * the app or not.
 */

const DAY = 86_400_000;
const NOW = new Date('2026-03-04T10:00:00').getTime();

const game = (id: number, name = `Game ${id}`): Game =>
  ({ id, name, slug: `game-${id}` }) as unknown as Game;

const entry = (id: number, over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  game: game(id),
  status: 'playing',
  addedAt: NOW - DAY,
  updatedAt: NOW - DAY,
  ...over,
});

const input = (entries: LibraryEntry[], over = {}) => ({
  entries,
  hoursOf: () => 10,
  pace: 7,
  windowWeeks: null,
  now: NOW,
  ...over,
});

describe('planItems', () => {
  it('leaves finished games out of the plan', () => {
    const items = planItems(
      [entry(1), entry(2, { status: 'finished' })],
      () => 10
    );
    expect(items.map((item) => item.id)).toEqual([1]);
  });

  it('leaves out a game nobody knows the length of', () => {
    // An unschedulable game, the same rule the plan screen applies.
    expect(planItems([entry(1)], () => 0)).toEqual([]);
  });

  it('counts only the hours still to play', () => {
    const items = planItems([entry(1, { hoursPlayed: 6 })], () => 10);
    expect(items[0].hours).toBeCloseTo(4, 1);
  });

  it('keeps the app’s one-hour floor on a nearly-finished game', () => {
    // remainingHours never reports zero left on something unfinished,
    // and the widget must not disagree with the screen about that.
    const items = planItems([entry(1, { hoursPlayed: 10 })], () => 10);
    expect(items[0].hours).toBe(1);
  });

  it('carries the deadline and the must-play flag through', () => {
    const deadline = NOW + 5 * DAY;
    const items = planItems([entry(1, { deadline, want: 3 })], () => 10);
    expect(items[0].deadline).toBe(deadline);
    expect(items[0].want).toBe(3);
  });
});

describe('widgetPlan', () => {
  it('says nothing at all with an empty library', () => {
    expect(widgetPlan(input([]))).toEqual([]);
  });

  it('says nothing when every game is finished', () => {
    expect(widgetPlan(input([entry(1, { status: 'finished' })]))).toEqual([]);
  });

  it('gives a morning for each of the next seven days', () => {
    const days = widgetPlan(input([entry(1)]));
    expect(days).toHaveLength(7);
    expect(days[0].tonight?.title).toBe('Game 1');
  });

  it('walks one schedule rather than re-planning from each morning', () => {
    // The bug this replaced: re-running the scheduler from each morning
    // asks "what if I started today", so a game the plan finishes on
    // Monday was still being offered on Saturday. Walking the one plan
    // means the strip shortens as the evenings go by.
    const days = widgetPlan(
      input([entry(1), entry(2)], { hoursOf: () => 6, pace: 14 })
    );
    const lengths = days.map((day) => day.nights.length);
    expect(lengths[0]).toBeGreaterThan(lengths[lengths.length - 1]);
    // Strictly non-increasing: an evening never comes back.
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeLessThanOrEqual(lengths[i - 1]);
    }
  });

  it('turns amber as a deadline comes into view, on the day it does', () => {
    // The gradient §6.1 asks for, and the reason the pressure is
    // recomputed per morning: nothing about the library changes here,
    // only the date. The alert engine's horizon is 21 days, so a date
    // 25 days out is not news today and is by Friday.
    const days = widgetPlan(
      input([entry(1, { deadline: NOW + 25 * DAY })], { hoursOf: () => 2 })
    );
    const urgencies = days.map((day) => day.pressure.urgency);
    expect(urgencies[0]).toBe('calm');
    expect(urgencies[urgencies.length - 1]).toBe('amber');
    // And it crosses over exactly once, rather than flickering.
    const changes = urgencies.filter((u, i) => i > 0 && u !== urgencies[i - 1]);
    expect(changes).toHaveLength(1);
  });

  it('goes red for a deadline there is no room for, and says which game', () => {
    const days = widgetPlan(
      input([entry(1, { deadline: NOW + 2 * DAY })], {
        hoursOf: () => 40,
        pace: 4,
      })
    );
    expect(days[0].pressure.urgency).toBe('red');
    expect(days[0].pressure.note).toBe("Game 1 won't fit");
  });

  it('says what the plan is when nothing is pressing', () => {
    const days = widgetPlan(input([entry(1), entry(2)], { hoursOf: () => 3 }));
    expect(days[0].pressure.urgency).toBe('calm');
    expect(days[0].pressure.note).toMatch(/^2 games · \d+ days?$/);
  });

  it('empties out rather than repeating the last evening', () => {
    // Six hours at seven a week is done inside the first week, so the
    // later mornings have nothing to show — and should say so.
    const days = widgetPlan(input([entry(1)], { hoursOf: () => 3, pace: 21 }));
    expect(days[0].tonight).not.toBeNull();
    expect(days[days.length - 1].tonight).toBeNull();
  });

  it('every morning is midnight, and they are in order', () => {
    const days = widgetPlan(input([entry(1)]));
    for (const [index, day] of days.entries()) {
      expect(new Date(day.at).getHours()).toBe(0);
      if (index > 0) expect(day.at).toBeGreaterThan(days[index - 1].at);
    }
  });
});
