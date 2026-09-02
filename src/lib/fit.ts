import { planWeek } from './week';

/**
 * How one game fits the evenings ahead, if you started it tonight.
 *
 * Every other number on the game page is somebody else's: RAWG's
 * rating, Metacritic's score, a length players reported. This is the
 * one Sidequest exists to say, and until now the page said it as a
 * sentence — "about 4 weeks at 6h a week" — which is arithmetic, not a
 * picture. Laid across the calendar it becomes the thing a person is
 * actually deciding: seven evenings, mostly weekends, credits on the
 * 27th. The same engine the plan uses lays it out, so the strip here
 * and the week there cannot disagree about what an evening holds.
 */

export interface FitDay {
  /** Local midnight, epoch ms. */
  date: number;
  weekday: number;
  /** Hours of this game that evening; 0 on a night it is not played. */
  hours: number;
  finishes: boolean;
}

export interface Fit {
  /** Tonight through the evening the credits roll, or the horizon. */
  days: FitDay[];
  /** How many evenings the game takes. */
  evenings: number;
  /** The evening the credits roll, or null past the horizon. */
  finishAt: number | null;
}

/** How far ahead the strip looks before calling a game a long one. */
export const FIT_HORIZON_DAYS = 63;

export function fitFrom(hours: number, now: number): Fit | null {
  if (!(hours > 0)) return null;
  const id = 1;
  const week = planWeek(
    [{ id, name: '', hours, endHours: hours, finishAt: 0 }],
    now,
    FIT_HORIZON_DAYS,
    id
  );
  const days: FitDay[] = [];
  let evenings = 0;
  let finishAt: number | null = null;
  for (const evening of week) {
    const played = evening.games.find((game) => game.id === id);
    if (played) evenings += 1;
    days.push({
      date: evening.date,
      weekday: evening.weekday,
      hours: played?.hours ?? 0,
      finishes: played?.finishes ?? false,
    });
    if (played?.finishes) {
      finishAt = evening.date;
      break;
    }
  }
  return { days, evenings, finishAt };
}

const WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

/** "Seven evenings", "One evening", "Forty evenings". */
export function fitTitle(fit: Fit): string {
  if (fit.finishAt == null) return 'A long one';
  const count = WORDS[fit.evenings] ?? String(fit.evenings);
  return `${count} ${fit.evenings === 1 ? 'evening' : 'evenings'}`;
}

/** The sentence under the title: when the credits would roll. */
export function fitLine(fit: Fit, now: number): string {
  if (fit.finishAt == null) {
    return `More than ${Math.round(FIT_HORIZON_DAYS / 7)} weeks of evenings from tonight.`;
  }
  const days = Math.round((fit.finishAt - now) / 86_400_000);
  if (fit.evenings === 1) return 'Start tonight, see the credits tonight.';
  if (days <= 6) {
    const day = new Date(fit.finishAt).toLocaleDateString('en-US', {
      weekday: 'long',
    });
    return `Start tonight, see the credits ${day}.`;
  }
  const date = new Date(fit.finishAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `Start tonight, see the credits around ${date}.`;
}
