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
 *
 * And a plain list of titles is a library too. This wanted a header row
 * with a column it recognised, so the most natural thing anybody would
 * paste — their backlog, one game a line — came back empty with the
 * first game consumed as a column name, and the app answered "no title
 * column, expected Title, Name or Game". That is the app telling
 * somebody to go and make a spreadsheet before it will help them, which
 * is exactly backwards for the reader who has no Steam account to
 * import from and is the whole reason this path exists.
 *
 * So: a paste that does not look like a table is read as a list of
 * titles. A paste that DOES look like a table and still has no title
 * column keeps the honest error, because guessing which column of a
 * spreadsheet holds the names is how somebody's library fills up with
 * dates and ratings.
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

/**
 * Whether a paste is a table at all.
 *
 * Half the lines carrying a comma, rather than any of them: plenty of
 * titles have a comma in them, and one "Crisis Core: Final Fantasy VII,
 * Reunion" in a list of forty should not turn the whole paste into a
 * spreadsheet nobody can read.
 */
const looksTabular = (lines: string[]): boolean =>
  lines.filter((line) => line.includes(',')).length * 2 >= lines.length;

/** Every line a title, minus a lone header if the list came with one. */
function titleList(lines: string[]): CsvRow[] {
  const body = TITLE_KEYS.includes(lines[0].toLowerCase())
    ? lines.slice(1)
    : lines;
  const seen = new Set<string>();
  const rows: CsvRow[] = [];
  for (const title of body) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ title });
  }
  return rows;
}

/** Read a pasted export. Never throws — a bad paste is a message. */
export function parseCsv(text: string): CsvParse {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  // One line is as likely to be a stray sentence as a library, and
  // somebody importing a backlog is pasting more than one game. A
  // single title is what the search box is for.
  if (lines.length < 2) return { rows: [], headers: [] };

  // Not a table: the reader pasted their backlog, one game a line.
  if (!looksTabular(lines)) return { rows: titleList(lines), headers: [] };

  const headers = splitCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/^"|"$/g, '')
  );
  const indexOf = (keys: string[]) =>
    headers.findIndex((header) => keys.includes(header));

  const titleAt = indexOf(TITLE_KEYS);
  // A table whose columns mean nothing to us keeps the honest error:
  // guessing which one holds the names fills a library with dates.
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
