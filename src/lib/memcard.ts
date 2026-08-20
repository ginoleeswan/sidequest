import type { HoursOf } from './libraryStats';
import type { LibraryEntry } from './library';

/**
 * The Memcard: a year of finished games, as a memory card.
 *
 * Steam's year-in-review celebrates volume, which is a flex only if you
 * had the time. This celebrates the opposite — that you finished things
 * — because for the person this app is for, seeing the credits twice in
 * a year is the achievement.
 *
 * Pure, and separate from how it is drawn: the same model backs the card
 * on screen and the image someone posts.
 */

export interface MemcardBlock {
  id: number;
  name: string;
  hours: number;
  /** Month index the credits rolled in, 0-11 — the card is a calendar. */
  month: number;
}

export interface Memcard {
  year: number;
  /** Games finished in the period. */
  count: number;
  hours: number;
  blocks: MemcardBlock[];
  /** The longest thing finished — the one worth bragging about. */
  longest: MemcardBlock | null;
  /** How the card reads out loud. */
  headline: string;
  /** The quiet line underneath, in the app's own voice. */
  subhead: string;
}

const MONTHS_IN_YEAR = 12;

/** Whole hours, because nobody brags in decimals. */
const round = (hours: number) => Math.round(hours);

/**
 * An evening is the unit this app thinks in — 90 minutes after the day
 * is done. It is also the honest way to make 40 hours feel like
 * something a person spent rather than a number.
 */
const EVENINGS = 1.5;

function headlineFor(count: number, hours: number): string {
  if (count === 0) return 'Nothing finished yet';
  if (count === 1) return 'One game, all the way to the credits';
  return `${count} games finished · ${round(hours)} hours`;
}

function subheadFor(count: number, hours: number): string {
  if (count === 0)
    return 'The year is not over. One short game is all it takes.';
  const evenings = Math.round(hours / EVENINGS);
  if (count === 1)
    return `About ${evenings} evenings, and you saw the end of it. Most people do not.`;
  return `About ${evenings} evenings, none of them wasted.`;
}

/**
 * Build the card for a calendar year.
 *
 * Games with no recorded finish date fall back to when they were added,
 * which is the best guess available and better than dropping someone's
 * achievement out of their own year.
 */
export function buildMemcard(
  entries: LibraryEntry[],
  hoursOf: HoursOf,
  year: number
): Memcard {
  const blocks: MemcardBlock[] = [];

  for (const entry of entries) {
    if (entry.status !== 'finished') continue;
    const at = entry.finishedAt ?? entry.addedAt;
    const date = new Date(at);
    if (date.getFullYear() !== year) continue;
    blocks.push({
      id: entry.game.id,
      name: entry.game.name,
      hours: hoursOf(entry.game),
      month: date.getMonth(),
    });
  }

  blocks.sort((a, b) => a.month - b.month || a.name.localeCompare(b.name));

  const hours = blocks.reduce((sum, block) => sum + block.hours, 0);
  const longest =
    blocks.reduce<MemcardBlock | null>(
      (best, block) => (best && best.hours >= block.hours ? best : block),
      null
    ) ?? null;

  return {
    year,
    count: blocks.length,
    hours,
    blocks,
    longest,
    headline: headlineFor(blocks.length, hours),
    subhead: subheadFor(blocks.length, hours),
  };
}

/** Which years a library has anything to show for. */
export function memcardYears(entries: LibraryEntry[]): number[] {
  const years = new Set<number>();
  for (const entry of entries) {
    if (entry.status !== 'finished') continue;
    years.add(new Date(entry.finishedAt ?? entry.addedAt).getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/** Month initials, for the card's twelve columns. */
export const MONTH_INITIALS = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
];

/** How many blocks fell in each month — the card's shape at a glance. */
export function blocksByMonth(card: Memcard): number[] {
  const months = Array.from({ length: MONTHS_IN_YEAR }, () => 0);
  for (const block of card.blocks) months[block.month] += 1;
  return months;
}
