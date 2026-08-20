import type { ScheduledItem } from './scheduler';

/**
 * The plan as a week rather than an order.
 *
 * The schedule already knows what and by when; what it never said was
 * *when*. "Celeste, done by 4 Sep" is an ordering. "Tuesday 2h Celeste,
 * Thursday 2h, Saturday you finish it" is a plan, and it is the same
 * data — spread across the evenings someone actually has.
 *
 * Pure, and deliberately the shape a widget wants: a list of dated
 * entries the renderer can walk without knowing anything.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Which evenings count as playing evenings, and how long each is.
 *
 * Matches lib/sessions: a Tuesday is ninety minutes, Friday and
 * Saturday are three hours, Sunday two. Weeknights nobody plays are
 * still listed as free, because seeing them empty is half the point.
 */
export function eveningHours(day: number): number {
  if (day === 5 || day === 6) return 3;
  if (day === 0) return 2;
  return 1.5;
}

export interface PlannedEvening {
  /** Epoch ms, midnight local. */
  date: number;
  /** 0-6, Sunday first — for the label. */
  weekday: number;
  hours: number;
  /** What that evening goes on, in order. */
  games: { id: number; name: string; hours: number; finishes: boolean }[];
}

const midnight = (at: number): number => {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Lay the schedule out across the next `days` evenings.
 *
 * Games are poured into evenings in schedule order: each evening takes
 * as much of the current game as it holds, and a game that runs out
 * mid-evening hands the rest of that evening to the next one — which is
 * exactly what happens in life, and is why "the last evening" of a game
 * is the one worth marking.
 */
export function planWeek(
  scheduled: ScheduledItem[],
  now: number = Date.now(),
  days = 7
): PlannedEvening[] {
  const evenings: PlannedEvening[] = [];
  const queue = scheduled.map((item) => ({ ...item, left: item.hours }));
  let index = 0;

  for (let offset = 0; offset < days; offset++) {
    const date = midnight(now + offset * DAY);
    const weekday = new Date(date).getDay();
    let capacity = eveningHours(weekday);
    const games: PlannedEvening['games'] = [];

    while (capacity > 0.25 && index < queue.length) {
      const game = queue[index];
      const spent = Math.min(capacity, game.left);
      game.left = Math.round((game.left - spent) * 100) / 100;
      capacity = Math.round((capacity - spent) * 100) / 100;
      const finishes = game.left <= 0;
      games.push({
        id: game.id,
        name: game.name,
        hours: Math.round(spent * 100) / 100,
        finishes,
      });
      if (finishes) index += 1;
      else break;
    }

    evenings.push({ date, weekday, hours: eveningHours(weekday), games });
  }

  return evenings;
}

/** "Tonight", "Tomorrow", then the weekday. */
export function eveningLabel(
  evening: PlannedEvening,
  now: number = Date.now()
): string {
  const today = midnight(now);
  if (evening.date === today) return 'Tonight';
  if (evening.date === today + DAY) return 'Tomorrow';
  return new Date(evening.date).toLocaleDateString(undefined, {
    weekday: 'long',
  });
}
