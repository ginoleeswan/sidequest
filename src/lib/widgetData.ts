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
