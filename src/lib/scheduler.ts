/**
 * The Sidequest engine.
 *
 * A backlog is a scheduling problem: one player, limited hours per week,
 * games with durations and (optionally) deadlines. Maximising the number of
 * games finished on time is the classic single-machine problem 1||ΣUj,
 * solved optimally by the Moore–Hodgson algorithm (1968) in O(n log n):
 * process jobs in deadline order, and when the schedule overruns a
 * deadline, evict the longest job accepted so far.
 *
 * This module is pure - (items, options) in, schedule out - and is the
 * most-tested code in the app, including a brute-force optimality check.
 */

export interface PlanItem {
  id: number;
  name: string;
  /** Estimated hours to finish. Must be > 0 to be schedulable. */
  hours: number;
  /** Epoch ms. Omitted = no deadline (can never be "late"). */
  deadline?: number;
}

export interface ScheduledItem extends PlanItem {
  /** Cumulative play hours when this game is finished. */
  endHours: number;
  /** Projected wall-clock finish, epoch ms. */
  finishAt: number;
}

export interface Schedule {
  scheduled: ScheduledItem[];
  dropped: PlanItem[];
  totalHours: number;
}

export interface PlanOptions {
  hoursPerWeek: number;
  /** Epoch ms "now" - passed in so the module stays pure and testable. */
  now: number;
  /** Optional global deadline applied to every item without its own. */
  deadline?: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Play-hours available between now and an epoch-ms deadline. */
function capacityHours(
  deadline: number | undefined,
  now: number,
  hoursPerWeek: number
): number {
  if (deadline == null) return Infinity;
  return Math.max(0, ((deadline - now) / WEEK_MS) * hoursPerWeek);
}

export function planSchedule(
  items: PlanItem[],
  { hoursPerWeek, now, deadline }: PlanOptions
): Schedule {
  const dropped: PlanItem[] = [];

  if (hoursPerWeek <= 0) {
    return { scheduled: [], dropped: [...items], totalHours: 0 };
  }

  const jobs = items
    .filter((item) => {
      if (item.hours > 0) return true;
      dropped.push(item);
      return false;
    })
    .map((item) => ({
      ...item,
      deadline: item.deadline ?? deadline,
    }))
    // Earliest-deadline-first; no-deadline jobs last, shortest first within
    // ties so quick wins land early without affecting the optimal count.
    .sort((a, b) => {
      const da = a.deadline ?? Infinity;
      const db = b.deadline ?? Infinity;
      if (da !== db) return da - db;
      return a.hours - b.hours;
    });

  // Moore–Hodgson.
  const accepted: PlanItem[] = [];
  let totalHours = 0;
  for (const job of jobs) {
    accepted.push(job);
    totalHours += job.hours;
    const cap = capacityHours(job.deadline, now, hoursPerWeek);
    if (totalHours > cap) {
      let longest = 0;
      for (let i = 1; i < accepted.length; i++) {
        if (accepted[i].hours > accepted[longest].hours) longest = i;
      }
      const [evicted] = accepted.splice(longest, 1);
      totalHours -= evicted.hours;
      dropped.push(evicted);
    }
  }

  // Project finish times in sequence order.
  let clock = 0;
  const scheduled: ScheduledItem[] = accepted.map((job) => {
    clock += job.hours;
    return {
      ...job,
      endHours: clock,
      finishAt: now + (clock / hoursPerWeek) * WEEK_MS,
    };
  });

  return { scheduled, dropped, totalHours };
}

/* ------------------------------------------------------------- tonight */

export interface TonightItem {
  id: number;
  name: string;
  hours: number;
  playing?: boolean;
}

export interface TonightPick {
  /** The biggest game you could actually finish in the session. */
  finishable: TonightItem | null;
  /** The in-progress game to push forward instead. */
  continueGame: TonightItem | null;
  /** Fallback: the shortest thing you own, for when nothing fits. */
  shortest: TonightItem | null;
}

/** "I have N minutes - what do I play?" Ranking, not scheduling. */
export function pickTonight(
  items: TonightItem[],
  minutes: number
): TonightPick {
  const sessionHours = minutes / 60;
  const known = items.filter((item) => item.hours > 0);

  const finishable =
    known
      .filter((item) => item.hours <= sessionHours)
      .sort((a, b) => b.hours - a.hours)[0] ?? null;

  const continueGame =
    items.filter((item) => item.playing).sort((a, b) => a.hours - b.hours)[0] ??
    null;

  const shortest = known.sort((a, b) => a.hours - b.hours)[0] ?? null;

  return { finishable, continueGame, shortest };
}
