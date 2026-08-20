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
  /**
   * How much this one is wanted: 3 must be played, 2 normal, 1 maybe.
   *
   * Only 3 changes the schedule, and it does so by pinning rather than
   * by weighting. Weighted tardiness (1‖ΣwⱼUⱼ) is NP-hard, and an
   * approximation would quietly trade away the one guarantee this engine
   * has — that it finishes as many games as can be finished. Pinning
   * keeps that guarantee intact and moves the trade into the open: the
   * schedule reports what the pins cost.
   */
  want?: number;
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
  /**
   * How many more games would have fitted if nothing were pinned.
   *
   * Zero when the pins are free. Above zero it is the honest price of
   * insisting, and the plan says it out loud rather than presenting a
   * worse schedule as the best one.
   */
  costOfPins: number;
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

/** Earliest deadline first; shortest first within a tie. */
function byDeadline(a: PlanItem, b: PlanItem): number {
  const da = a.deadline ?? Infinity;
  const db = b.deadline ?? Infinity;
  if (da !== db) return da - db;
  return a.hours - b.hours;
}

/**
 * Moore–Hodgson over jobs already in deadline order.
 *
 * `pinned` names jobs that must survive: they are still subject to their
 * own deadlines, but the eviction step will not choose them. With an
 * empty set this is the textbook algorithm and its optimality guarantee.
 */
function moore(
  jobs: PlanItem[],
  now: number,
  hoursPerWeek: number,
  pinned: Set<number>
): { accepted: PlanItem[]; evicted: PlanItem[]; totalHours: number } {
  const accepted: PlanItem[] = [];
  const evicted: PlanItem[] = [];
  let totalHours = 0;

  for (const job of jobs) {
    accepted.push(job);
    totalHours += job.hours;
    const cap = capacityHours(job.deadline, now, hoursPerWeek);

    // Without pins one eviction always restores feasibility, because the
    // job removed is the longest one there is. Protecting jobs breaks
    // that: evicting a six-hour game may not make room for a forty-hour
    // one, so keep evicting until it fits or there is nothing left to
    // give. A pin that still does not fit is a pin on a game that cannot
    // be finished in time, and it goes too — the plan's promise is that
    // what it schedules is actually achievable.
    while (totalHours > cap && accepted.length > 0) {
      let longest = -1;
      for (let i = 0; i < accepted.length; i++) {
        if (pinned.has(accepted[i].id)) continue;
        if (longest < 0 || accepted[i].hours > accepted[longest].hours)
          longest = i;
      }
      if (longest < 0) {
        // Only pinned jobs remain and they still overrun: the longest of
        // them is the one that cannot be honoured.
        longest = 0;
        for (let i = 1; i < accepted.length; i++)
          if (accepted[i].hours > accepted[longest].hours) longest = i;
      }

      const [out] = accepted.splice(longest, 1);
      totalHours -= out.hours;
      evicted.push(out);
    }
  }

  return { accepted, evicted, totalHours };
}

export function planSchedule(
  items: PlanItem[],
  { hoursPerWeek, now, deadline }: PlanOptions
): Schedule {
  const dropped: PlanItem[] = [];

  if (hoursPerWeek <= 0) {
    return {
      scheduled: [],
      dropped: [...items],
      totalHours: 0,
      costOfPins: 0,
    };
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
    .sort(byDeadline);

  const mustPlay = new Set(
    jobs.filter((job) => (job.want ?? 2) >= 3).map((job) => job.id)
  );

  const open = moore(jobs, now, hoursPerWeek, new Set());
  const run =
    mustPlay.size > 0 ? moore(jobs, now, hoursPerWeek, mustPlay) : open;

  const accepted = run.accepted;
  const totalHours = run.totalHours;
  dropped.push(...run.evicted);
  const costOfPins = Math.max(0, open.accepted.length - accepted.length);

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

  return { scheduled, dropped, totalHours, costOfPins };
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
