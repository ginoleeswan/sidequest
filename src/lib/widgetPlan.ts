import { buildAlerts } from './alerts';
import type { LibraryEntry } from './library';
import { planItems } from './planning';
import { planSchedule } from './scheduler';
import { planWeek } from './week';
import { planTimeline, pressureOf, type PlanDay } from './widgetData';

/**
 * The plan, worked out for the widgets rather than for a screen.
 *
 * The plan screen builds this pipeline out of hooks and memos, which is
 * right for a screen and useless to anything that is not one. The
 * widgets need the same answer at moments nobody is looking: when a
 * game is finished, when a duration is corrected, when the pace moves.
 *
 * So the rules stay where they are — `planSchedule`, `planWeek`,
 * `buildAlerts` are all imported, not reimplemented. This is the
 * plumbing that runs them once per morning of the week ahead, which is
 * what turns a schedule into a widget timeline.
 *
 * Pure, and takes its clock, so it can be tested without a device.
 */

export interface PlanInput {
  /** The whole library, exactly as the provider holds it. */
  entries: readonly LibraryEntry[];
  /** How long each game is, after corrections. */
  hoursOf: (entry: LibraryEntry) => number;
  /** Hours of play a week. */
  pace: number;
  /** The plan window, or null for no horizon. */
  windowWeeks: number | null;
  now: number;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * The week ahead, one entry per morning.
 *
 * One schedule, walked — not seven schedules. This is the sentence
 * PRODUCT.md §6 is making when it says the engine's output already IS a
 * widget timeline: the plan already says Monday Game A, Tuesday Game A,
 * Wednesday Game B, so Thursday's entry is simply the plan from
 * Thursday onwards.
 *
 * Re-running the scheduler from each morning was the first attempt and
 * it was wrong in a way worth recording. The library does not change
 * while the week passes, so every run produced the same plan starting
 * that day — a three-hour game finished on Monday was still being
 * offered on Saturday, because "what should I play if I started today"
 * is not the question a Thursday entry answers.
 *
 * The pressure IS recomputed per morning, because that genuinely does
 * change without the library moving: a deadline that is comfortable on
 * Monday is at risk by Thursday, and saying so is the colour's whole
 * job.
 */
export function widgetPlan(input: PlanInput): PlanDay[] {
  const { entries, hoursOf, pace, windowWeeks, now } = input;
  const items = planItems(entries, hoursOf);
  if (items.length === 0) return [];

  const { scheduled } = planSchedule(items, {
    hoursPerWeek: pace,
    now,
    deadline: windowWeeks != null ? now + windowWeeks * WEEK_MS : undefined,
  });
  const week = planWeek(scheduled, now, 7);
  const summary = {
    games: scheduled.length,
    lastFinishAt: scheduled[scheduled.length - 1]?.finishAt ?? null,
  };

  return planTimeline(
    // The same week, from that morning on. Evenings that have gone fall
    // off the front, and when they have all gone the widget is empty —
    // which is honest, and what makes it stop showing Monday's game.
    (at) => week.filter((evening) => evening.date >= at),
    (at) =>
      pressureOf(buildAlerts([...entries], hoursOf, pace, at), summary, at),
    now
  );
}
