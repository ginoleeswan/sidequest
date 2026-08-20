import type { LibraryStatus } from './library';

/**
 * A library pasted in from somewhere else.
 *
 * Backloggd exports CSV. HowLongToBeat exports CSV. A spreadsheet
 * somebody has kept since 2014 is CSV. None of them agree on column
 * names, so this reads the header and takes what it recognises rather
 * than demanding a shape — and a file it cannot read at all says so,
 * with the header it actually found.
 *
 * Only the title is required. Everything else is a bonus, because a
 * title is enough to look a game up.
 */

export interface CsvRow {
  title: string;
  status?: LibraryStatus;
  hours?: number;
}

export interface CsvParse {
  rows: CsvRow[];
  /** Headers seen, for the "we couldn't find a title column" message. */
  headers: string[];
}

const TITLE_KEYS = ['title', 'name', 'game', 'game name', 'game title'];
const STATUS_KEYS = ['status', 'state', 'shelf', 'list', 'progress'];
const HOURS_KEYS = ['hours', 'playtime', 'time', 'hours played', 'main story'];

const FINISHED = [
  'finished',
  'completed',
  'beaten',
  'played',
  'done',
  'retired',
];
const PLAYING = ['playing', 'in progress', 'started', 'current'];

/** Splits one CSV line, honouring quotes — titles have commas in them. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function statusFrom(value: string | undefined): LibraryStatus | undefined {
  if (!value) return undefined;
  const text = value.toLowerCase();
  if (FINISHED.some((word) => text.includes(word))) return 'finished';
  if (PLAYING.some((word) => text.includes(word))) return 'playing';
  return 'wishlist';
}

function hoursFrom(value: string | undefined): number | undefined {
  if (!value) return undefined;
  // "12", "12h", "12 hours", "12½" — take the leading number and stop.
  const match = /^(\d+(?:\.\d+)?)/.exec(value.trim());
  const hours = match ? Number(match[1]) : NaN;
  return Number.isFinite(hours) && hours > 0 && hours < 10000
    ? hours
    : undefined;
}

/** Read a pasted export. Never throws — a bad paste is a message. */
export function parseCsv(text: string): CsvParse {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return { rows: [], headers: [] };

  const headers = splitCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/^"|"$/g, '')
  );
  const indexOf = (keys: string[]) =>
    headers.findIndex((header) => keys.includes(header));

  const titleAt = indexOf(TITLE_KEYS);
  if (titleAt < 0) return { rows: [], headers };

  const statusAt = indexOf(STATUS_KEYS);
  const hoursAt = indexOf(HOURS_KEYS);

  const seen = new Set<string>();
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const title = cells[titleAt]?.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      title,
      status: statusAt >= 0 ? statusFrom(cells[statusAt]) : undefined,
      hours: hoursAt >= 0 ? hoursFrom(cells[hoursAt]) : undefined,
    });
  }

  return { rows, headers };
}
