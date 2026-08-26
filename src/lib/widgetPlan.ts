import { buildAlerts } from './alerts';
import type { LibraryEntry } from './library';
import { planItems } from './planning';
import { planSchedule } from './scheduler';
import { planWeek } from './week';
import {
  horizonShape,
  planTimeline,
  pressureOf,
  type PlanDay,
} from './widgetData';

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

  /**
   * Everything already finished, with its date. The window and the cap
   * belong to `horizonShape`, so the widget's month and the app's
   * cannot disagree about how much past a month carries.
   */
  const landed = entries
    .filter((entry) => entry.status === 'finished' && entry.finishedAt)
    .map((entry) => ({
      id: entry.game.id,
      name: entry.game.name,
      finishedAt: entry.finishedAt as number,
    }));

  return planTimeline(
    // The same week, from that morning on. Evenings that have gone fall
    // off the front, and when they have all gone the widget is empty —
    // which is honest, and what makes it stop showing Monday's game.
    (at) => week.filter((evening) => evening.date >= at),
    (at) =>
      pressureOf(buildAlerts([...entries], hoursOf, pace, at), summary, at),
    now,
    7,
    scheduled,
    // Recomputed per morning for the same reason the pressure is: the
    // marks hold still, but today moves along the strip beneath them,
    // and a date that could be met on Monday cannot be by Thursday.
    (at) =>
      horizonShape(scheduled, landed, troubleAt(entries, hoursOf, pace, at), at)
  );
}

/**
 * The one date the plan cannot meet, if there is one.
 *
 * The strip draws a single piece of weather rather than all of it: a
 * widget has room for one warning, and the alert engine already ranks
 * them, so the first at-risk deadline is the one worth the coral.
 */
function troubleAt(
  entries: readonly LibraryEntry[],
  hoursOf: (entry: LibraryEntry) => number,
  pace: number,
  at: number
): number | null {
  const risk = buildAlerts([...entries], hoursOf, pace, at).find(
    (alert) => alert.kind === 'at-risk' && alert.days != null
  );
  if (!risk || risk.days == null) return null;
  return at + risk.days * 86_400_000;
}
