import type { LibraryEntry } from './library';
import type { HoursOf } from './libraryStats';
import { formatHours } from './duration';
import type { PlannedEvening } from './week';

/**
 * Sidequest, on the calendar you already keep.
 *
 * The whole product is an argument about time, and until now it made
 * that argument entirely inside itself — you came here, it told you
 * Tuesday was free, and then you closed the tab and Tuesday went the
 * way every other Tuesday goes. A plan that does not appear where you
 * look for your week is a suggestion.
 *
 * iCalendar rather than an integration, on purpose. Google's API needs
 * OAuth and a server; Apple's has no web API at all; both would mean
 * this app growing an account and a backend to hold the one thing it
 * promises never to hold. A `.ics` file is built here, on the device,
 * from data that never leaves it — and every calendar anyone actually
 * uses opens one. The cost is that it is a snapshot rather than a live
 * feed, and the app says so where it offers it.
 *
 * Pure and dateless except where a date is passed in, so the same
 * functions can be tested without a clock.
 */

export interface IcsEvent {
  /**
   * Stable across exports. Re-importing an already-imported file
   * updates those events rather than doubling them, which is the
   * difference between a feature and a mess in someone's calendar.
   */
  uid: string;
  start: Date;
  end: Date;
  /** All-day events are dates, not instants — a finish has no o'clock. */
  allDay?: boolean;
  title: string;
  description?: string;
}

/** RFC 5545 wants CRLF, and some parsers genuinely enforce it. */
const CRLF = '\r\n';

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** `YYYYMMDD`, in local terms: an all-day event has no timezone. */
function dateValue(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/**
 * Local wall-clock, deliberately floating — no `Z`, no `TZID`.
 *
 * "Tuesday evening" means eight in the evening wherever the reader is.
 * Pinning it to the timezone the export happened in would move a play
 * session by three hours the moment somebody travels, which is the
 * opposite of what this data means.
 */
function localValue(date: Date): string {
  return `${dateValue(date)}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

/** UTC instant, for the stamps the format requires to be absolute. */
function utcValue(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Escape a TEXT value.
 *
 * Order matters: backslashes first, or every escape this adds gets
 * escaped again. Game names are the reason this exists — commas and
 * colons are ordinary punctuation in a title and structural characters
 * in the format.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold a content line to 75 octets.
 *
 * Measured in octets rather than characters because the spec says so
 * and because game names carry accents and CJK — folding by character
 * count produces lines that are legal to look at and rejected by strict
 * parsers. A continuation begins with one space, which the reader
 * strips back out.
 */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let current = '';
  let used = 0;
  // First line takes 75; continuations take 74, because the leading
  // space they are given counts toward the limit.
  let limit = 75;

  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (used + size > limit) {
      out.push(current);
      current = '';
      used = 0;
      limit = 74;
    }
    current += char;
    used += size;
  }
  out.push(current);
  return out.join(`${CRLF} `);
}

/**
 * A calendar file.
 *
 * `X-WR-CALNAME` is not in the spec and is honoured by Google, Apple
 * and Outlook alike, which is the only test that matters: without it
 * the import lands as "Untitled" and nobody can find it again.
 */
export function buildIcs(
  events: IcsEvent[],
  { name, now }: { name: string; now: Date }
): string {
  const stamp = utcValue(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sidequest//Backlog//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dateValue(event.start)}`);
      // DTEND is exclusive: a one-day event ends on the following day,
      // and getting this wrong is how an all-day event renders as two.
      lines.push(`DTEND;VALUE=DATE:${dateValue(event.end)}`);
    } else {
      lines.push(`DTSTART:${localValue(event.start)}`);
      lines.push(`DTEND:${localValue(event.end)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description)
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join(CRLF) + CRLF;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * The memcard as a calendar: one all-day mark on the day you finished.
 *
 * A year of finishes read back as a wall of games is the card. Read
 * back as dates in the month you lived them, it is something else —
 * proof, in the same place as the dentist and the school run, that the
 * evenings went somewhere.
 */
export function memcardEvents(
  entries: LibraryEntry[],
  hoursOf: HoursOf,
  year: number
): IcsEvent[] {
  return entries
    .filter(
      (entry) =>
        entry.status === 'finished' &&
        entry.finishedAt != null &&
        new Date(entry.finishedAt).getFullYear() === year
    )
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0))
    .map((entry) => {
      const day = new Date(entry.finishedAt as number);
      day.setHours(0, 0, 0, 0);
      const hours = hoursOf(entry.game);
      return {
        uid: `finish-${entry.game.id}-${year}@sidequest.app`,
        start: day,
        end: new Date(day.getTime() + DAY),
        allDay: true,
        title: `🏆 Finished ${entry.game.name}`,
        description: hours
          ? `${formatHours(hours)} of your backlog, done. — Sidequest`
          : 'One more off the pile. — Sidequest',
      };
    });
}

/** Where an evening starts, when nobody has said otherwise. */
const EVENING_START_HOUR = 20;

/**
 * The week's plan as real appointments.
 *
 * One event per evening rather than one per game: an evening with two
 * games in it is still one sitting, and three back-to-back entries in a
 * calendar row is how a plan starts looking like work. The games go in
 * the description, where they belong.
 *
 * Empty evenings are skipped. The app shows them because seeing a free
 * Tuesday is half the point; putting "nothing" in someone's calendar is
 * not the same gesture at all.
 */
export function planEvents(
  evenings: PlannedEvening[],
  { startHour = EVENING_START_HOUR }: { startHour?: number } = {}
): IcsEvent[] {
  return evenings
    .filter((evening) => evening.games.length > 0)
    .map((evening) => {
      const start = new Date(evening.date);
      start.setHours(startHour, 0, 0, 0);
      const spent = evening.games.reduce((sum, game) => sum + game.hours, 0);
      const end = new Date(start.getTime() + spent * 60 * 60 * 1000);
      const finisher = evening.games.find((game) => game.finishes);
      const names = evening.games.map((game) => game.name);

      return {
        uid: `play-${dateValue(start)}@sidequest.app`,
        start,
        end,
        title: finisher
          ? `🎮 Finish ${finisher.name}`
          : `🎮 ${names.join(' · ')}`,
        description: evening.games
          .map(
            (game) =>
              `${game.name} — ${formatHours(game.hours)}${game.finishes ? ' (credits)' : ''}`
          )
          .concat('Planned by Sidequest. Move it if life moves.')
          .join('\n'),
      };
    });
}

/**
 * Hand the file to the device.
 *
 * `text/calendar` is what makes a phone offer to open it in a calendar
 * rather than a text editor; the `.ics` extension is what makes a
 * desktop do the same. Both are needed, because different platforms
 * trust different halves of that.
 */
export function downloadIcs(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
