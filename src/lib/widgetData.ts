import type { Alert } from './alerts';
import type { Memcard } from './memcard';
import type { PlannedEvening } from './week';

/**
 * What the home-screen widgets are given, and nothing else.
 *
 * A widget extension is a separate process with its own sandbox: it
 * cannot call into JavaScript, cannot read the app's storage, and is
 * woken by the system at moments the app knows nothing about. The only
 * thing the two share is an app-group container, so everything the
 * widgets show has to be reduced to a small, flat, already-decided
 * shape and written there.
 *
 * Flat and already-decided is the discipline. The widget must never
 * hold a rule the app also holds — "which game is tonight's", "does
 * this evening roll the credits" — because the two would drift and the
 * drift would only be visible on somebody's Lock Screen. Every decision
 * is made here, in the language that already makes it, and Swift gets
 * the answer.
 *
 * Pure, and separate from the writing, because the writing needs a
 * native module and this needs testing.
 */

/** Tonight's pick, or nothing if there is no plan. */
export interface TonightShape {
  title: string;
  hours: number;
  finishes: boolean;
}

/** One of the seven evenings ahead. Free nights are kept, not dropped. */
export interface WeekNightShape {
  /** Three letters, already shortened here so Swift does no formatting. */
  day: string;
  /** Empty for a free evening. */
  title: string;
  hours: number;
  finishes: boolean;
}

/** The memory card, as twelve lit-or-not months. */
export interface YearShape {
  year: number;
  count: number;
  hours: number;
  /** Twelve entries, January first: how many finished that month. */
  months: number[];
}

/**
 * How pressed the plan is, in the three states the widget paints with.
 *
 * PRODUCT.md §6.1 asks for a calm → amber → red gradient and for the
 * widget to say plainly when a plan cannot be met. Red is exactly the
 * alert engine's `at-risk`: a deadline there is not room for, which is
 * the one state where doing nothing is the wrong answer.
 */
export type Urgency = 'calm' | 'amber' | 'red';

export interface Pressure {
  urgency: Urgency;
  /**
   * One short line. Not the in-app alert sentence — those are written
   * to be read on a screen somebody chose to open, and run to two
   * clauses. A Lock Screen gets a handful of words or nothing.
   */
  note: string;
}

/** The plan in two numbers, for the calm state. */
export interface PlanSummary {
  /** How many games are actually scheduled. */
  games: number;
  /** When the last of them rolls its credits, epoch ms, or null. */
  lastFinishAt: number | null;
}

const DAY_MS = 86_400_000;

const daysBetween = (from: number, to: number) =>
  Math.max(0, Math.ceil((to - from) / DAY_MS));

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The colour and the sentence, from what the app already worked out.
 *
 * The calm line is the one §6.1 calls the marketing asset — a home
 * screen reading "3 games · 12 days" says what the app is for without
 * a word of explanation. It is only shown when there is nothing more
 * pressing, because a deadline that cannot be met outranks a boast.
 */
export function pressureOf(
  alerts: readonly Alert[],
  summary: PlanSummary,
  now: number
): Pressure {
  const risk = alerts.find((alert) => alert.kind === 'at-risk');
  if (risk) {
    return {
      urgency: 'red',
      note:
        risk.days != null && risk.days <= 0
          ? `${risk.name} is past its date`
          : `${risk.name} won't fit`,
    };
  }

  const due = alerts.find((alert) => alert.kind === 'due-soon');
  if (due) {
    return {
      urgency: 'amber',
      note:
        due.days === 0
          ? `${due.name} due today`
          : `${due.name} due in ${due.days}d`,
    };
  }

  if (summary.games === 0) return { urgency: 'calm', note: '' };
  if (summary.lastFinishAt == null) {
    return { urgency: 'calm', note: plural(summary.games, 'game') };
  }
  return {
    urgency: 'calm',
    note: `${plural(summary.games, 'game')} · ${plural(
      daysBetween(now, summary.lastFinishAt),
      'day'
    )}`,
  };
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * The first evening that actually has something in it.
 *
 * Not simply `week[0]`: a plan whose first night is free would put "No
 * plan yet" on the Lock Screen while the reader has four evenings
 * booked later in the week, which is both wrong and the most visible
 * place to be wrong. Tonight means the next evening with a game in it.
 */
export function tonightShape(
  week: readonly PlannedEvening[]
): TonightShape | null {
  const evening = week.find((night) => night.games.length > 0);
  const lead = evening?.games[0];
  if (!lead) return null;
  return {
    title: lead.name,
    // The evening's whole length, not the lead game's: two games on one
    // night is still one evening, and the number answers "how long am I
    // in for", not "how long is this title".
    hours: Math.round(evening.games.reduce((sum, g) => sum + g.hours, 0)),
    finishes: evening.games.some((g) => g.finishes),
  };
}

/** The seven evenings, free ones included and marked as free. */
export function weekShape(week: readonly PlannedEvening[]): WeekNightShape[] {
  return week.map((night) => ({
    day: DAYS[night.weekday] ?? '',
    title: night.games[0]?.name ?? '',
    hours: Math.round(night.games.reduce((sum, g) => sum + g.hours, 0)),
    finishes: night.games.some((g) => g.finishes),
  }));
}

/**
 * The card's twelve slots, counted.
 *
 * A count rather than a boolean, so the widget could grow a busier
 * month without the app changing what it writes — and because "three
 * things in March" is a fact the shape should not throw away just
 * because today's design only asks whether March is lit.
 */
export function yearShape(card: Memcard): YearShape {
  const months = Array.from({ length: 12 }, () => 0);
  for (const block of card.blocks) {
    if (block.month >= 0 && block.month < 12) months[block.month] += 1;
  }
  return {
    year: card.year,
    count: card.count,
    hours: Math.round(card.hours),
    months,
  };
}

/* ------------------------------------------------------------ timeline */

/**
 * One day of the plan, as the widget will show it that day.
 *
 * The piece PRODUCT.md §6 asks for and the first build did not have:
 * "the engine's output already is a widget timeline". A schedule is
 * deterministic over time, so every day between here and the end of the
 * week can be worked out now, in the language that already knows the
 * rules, and handed over as a list of future-dated entries.
 *
 * What that buys is not efficiency. It is being right. The previous
 * shape wrote one present-tense snapshot and asked WidgetKit to reload
 * at midnight — which re-rendered the same stale JSON, so Monday's game
 * sat on the Lock Screen through Wednesday for anybody who did not open
 * the app. A widget that is confidently wrong is worse than one that
 * admits it knows nothing.
 */
export interface PlanDay {
  /** Local midnight this entry becomes the truth, epoch ms. */
  at: number;
  /** What to play that evening, or nothing left to play. */
  tonight: TonightShape | null;
  /** The seven-day strip as it stands that morning. */
  nights: WeekNightShape[];
  pressure: Pressure;
}

/** Local midnight on the day `at` falls in. */
export const midnightOf = (at: number): number => {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * The next `days` mornings, each already decided.
 *
 * Takes the two engines as functions rather than their inputs, so this
 * stays pure and testable and holds no rule of its own — the same
 * discipline as the shapes above. The caller owns what a week is and
 * what an alert is; this owns only "once per morning, from here".
 *
 * The last entry is deliberately allowed to be empty. A plan that runs
 * out on Thursday should leave Friday showing the widget's own empty
 * state, not Thursday's game forever.
 */
export function planTimeline(
  weekFor: (at: number) => readonly PlannedEvening[],
  pressureFor: (at: number) => Pressure,
  now: number,
  days = 7
): PlanDay[] {
  const start = midnightOf(now);
  const timeline: PlanDay[] = [];
  for (let offset = 0; offset < days; offset++) {
    // Built from the date rather than by adding milliseconds, so the
    // two days a year that are not 24 hours long do not shift every
    // entry after them by an hour.
    const at = midnightOf(start + offset * DAY_MS + DAY_MS / 2);
    const week = weekFor(at);
    timeline.push({
      at,
      tonight: tonightShape(week),
      nights: weekShape(week),
      pressure: pressureFor(at),
    });
  }
  return timeline;
}
