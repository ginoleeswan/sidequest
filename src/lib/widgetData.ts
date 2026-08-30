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
  /**
   * The lead game, so the widget can open it rather than the plan.
   *
   * Tapping a card that names one game and landing on a list of seven
   * is a small betrayal of the tap. Sent as the id alone — the widget
   * builds the link, because the URL scheme is a thing the native side
   * already knows and the app should not spell twice.
   */
  id: number;
  title: string;
  hours: number;
  finishes: boolean;
}

/** One of the seven evenings ahead. Free nights are kept, not dropped. */
export interface WeekNightShape {
  /** Three letters, already shortened here so Swift does no formatting. */
  day: string;
  /**
   * Day of the month, so the widget can name a date rather than only a
   * weekday. "THU" is a repeating label; "THU 28" is a calendar.
   */
  date: number;
  /** Empty for a free evening. */
  title: string;
  hours: number;
  finishes: boolean;
  /**
   * Which of the plan's three colours this evening wears — the game's
   * position in the route, exactly as `planColour` indexes it, or -1
   * when the evening is free.
   *
   * Sent rather than derived, because the alternative is the widget
   * holding a rule about colour that the app also holds. Two copies of
   * a palette is how a Lock Screen ends up amber where the app is mint.
   */
  colour: number;
  /**
   * Whether this evening carries the game's name.
   *
   * A game across five nights is one fact, not five, so the app names a
   * run once and lets the rest carry the colour. The decision is made
   * here for the same reason the colour is.
   */
  named: boolean;
}

/** One mark on the month strip: a landing ahead, or a stamp behind. */
export interface HorizonMarkShape {
  name: string;
  /**
   * Epoch ms the mark stands on — for WHERE it goes, which depends on
   * how wide the widget is and so can only be decided over there.
   */
  at: number;
  /**
   * The date as it should be read, already formatted. Swift does no
   * date formatting, the same as it does no day-name shortening: two
   * formatters is two answers, and only one of them is on the screen
   * the person also opened.
   */
  label: string;
  /** Route position for the colour, as `planColour` indexes it. */
  colour: number;
  /** The credits already rolled — the slot is stamped, not empty. */
  done: boolean;
}

/**
 * The month, as the widget draws it.
 *
 * The axis is sent, not the positions: where a mark sits depends on how
 * wide the widget happens to be, which is the one thing only Swift can
 * know. Everything that is a DECISION — which marks, in what order,
 * what colour, how far back to remember — is made here, so the strip on
 * a Home Screen and the strip in the app cannot drift.
 */
export interface HorizonShape {
  /** The axis, epoch ms. */
  from: number;
  to: number;
  /** Where today falls on it, epoch ms. */
  now: number;
  marks: HorizonMarkShape[];
  /** A date the plan cannot meet, epoch ms, or null for none. */
  troubleAt: number | null;
  /** That date, already formatted. Empty when there is no trouble. */
  troubleLabel: string;
  /** Landings there was no room to draw. */
  beyond: number;
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
  /**
   * Days to the deadline the note is about, or null when there is not
   * one to count down to.
   *
   * A number rather than only a sentence, because §6.1 asks the small
   * and Lock Screen families for a days-remaining ring, and a ring
   * needs a quantity. Negative when the date has already gone: that is
   * a real state and rounding it up to zero would hide it.
   */
  days: number | null;
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
      days: risk.days ?? null,
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
      days: due.days ?? null,
    };
  }

  // Nothing to count down to. The calm families show the plan instead,
  // and the ring has nothing honest to draw.
  if (summary.games === 0) return { urgency: 'calm', note: '', days: null };
  if (summary.lastFinishAt == null) {
    return {
      urgency: 'calm',
      note: plural(summary.games, 'game'),
      days: null,
    };
  }
  return {
    urgency: 'calm',
    note: `${plural(summary.games, 'game')} · ${plural(
      daysBetween(now, summary.lastFinishAt),
      'day'
    )}`,
    days: null,
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
    id: lead.id,
    title: lead.name,
    // The evening's whole length, not the lead game's: two games on one
    // night is still one evening, and the number answers "how long am I
    // in for", not "how long is this title".
    hours: Math.round(evening.games.reduce((sum, g) => sum + g.hours, 0)),
    finishes: evening.games.some((g) => g.finishes),
  };
}

/**
 * The seven evenings, free ones included and marked as free.
 *
 * `order` is the route — the scheduled games in the order the plan puts
 * them — and it decides the colours, so the strip on a Lock Screen and
 * the agenda in the app paint the same game the same way.
 *
 * An evening reports its LEAD game. Two games on one night is still one
 * evening, and a widget has room for one name; the hours are the whole
 * evening's, which answers "how long am I in for".
 */
export function weekShape(
  week: readonly PlannedEvening[],
  order: readonly { id: number }[] = []
): WeekNightShape[] {
  const position = new Map(order.map((item, index) => [item.id, index]));
  let carried: number | null = null;

  return week.map((night) => {
    const lead = night.games[0];
    const named = lead != null && lead.id !== carried;
    if (lead) carried = lead.id;
    return {
      day: DAYS[night.weekday] ?? '',
      date: new Date(night.date).getDate(),
      title: lead?.name ?? '',
      hours: Math.round(night.games.reduce((sum, g) => sum + g.hours, 0)),
      finishes: night.games.some((g) => g.finishes),
      colour: lead ? (position.get(lead.id) ?? 0) : -1,
      named,
    };
  });
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

/** A game whose credits already rolled, for the strip behind today. */
export interface LandedInput {
  id: number;
  name: string;
  finishedAt: number;
}

/**
 * How far back the strip remembers, and how much of it it draws.
 *
 * Three weeks matches the alert horizon, so the app looks the same
 * distance in both directions. The counts are lower than the in-app
 * strip's because a widget is narrower than a page — the picture is the
 * same picture, cropped to what will actually read at that size.
 */
const HORIZON_BACK_DAYS = 21;
const HORIZON_AHEAD = 3;
const HORIZON_LANDED = 1;

/**
 * A date as the strip prints it — the same short form the plan page
 * uses for a landing, so the two say "Sep 5" the same way.
 */
const markLabel = (at: number) =>
  new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * The month strip, decided.
 *
 * `scheduled` is the route in order; `landed` is everything finished,
 * unfiltered — the window and the caps are applied here so that no
 * caller can pick a different past.
 */
export function horizonShape(
  scheduled: readonly { id: number; name: string; finishAt: number }[],
  landed: readonly LandedInput[],
  troubleAt: number | null,
  now: number
): HorizonShape | null {
  if (scheduled.length === 0) return null;

  const recent = landed
    .filter(
      (item) =>
        item.finishedAt <= now &&
        item.finishedAt >= now - HORIZON_BACK_DAYS * DAY_MS
    )
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .slice(-HORIZON_LANDED);

  const near = scheduled.slice(0, HORIZON_AHEAD);
  const lastFinish = near[near.length - 1].finishAt;
  const latest = Math.max(lastFinish, troubleAt ?? 0, now + 14 * DAY_MS);
  const to = latest + Math.max((latest - now) * 0.08, 2 * DAY_MS);
  // True proportion both ways: a game finished three days ago sits
  // three days back. See components/HorizonStrip for why.
  const from = recent.length
    ? Math.min(now, recent[0].finishedAt) - DAY_MS
    : now;

  /**
   * Every timestamp lands on a midnight, and that is load-bearing.
   *
   * A month strip has no use for milliseconds — it prints dates — but
   * the publisher decides whether to write at all by comparing the
   * whole payload as JSON, and a schedule recomputed a second later
   * moves every `finishAt` by a second. Raw timestamps would make the
   * plan differ from itself on every settle, costing a container write
   * and two widget reloads for a picture nobody could tell apart.
   */
  return {
    from: midnightOf(from),
    to: midnightOf(to),
    now: midnightOf(now),
    marks: [
      ...recent.map((item) => ({
        name: item.name,
        at: midnightOf(item.finishedAt),
        label: markLabel(item.finishedAt),
        colour: -1,
        done: true,
      })),
      ...near.map((item, index) => ({
        name: item.name,
        at: midnightOf(item.finishAt),
        label: markLabel(item.finishAt),
        colour: index,
        done: false,
      })),
    ],
    troubleAt: troubleAt != null ? midnightOf(troubleAt) : null,
    troubleLabel: troubleAt != null ? markLabel(troubleAt) : '',
    beyond: scheduled.length - near.length,
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
  /** The month, from that morning. Null when there is no plan. */
  horizon: HorizonShape | null;
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
  days = 7,
  /**
   * The route, for the colours — and the month, from each morning.
   * Optional so the pure timeline can still be exercised on its own.
   */
  order: readonly { id: number }[] = [],
  horizonFor: (at: number) => HorizonShape | null = () => null
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
      nights: weekShape(week, order),
      horizon: horizonFor(at),
      pressure: pressureFor(at),
    });
  }
  return timeline;
}
