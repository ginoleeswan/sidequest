/** 12926 -> "12.9k", 1200000 -> "1.2m" */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * A calendar date string ("2013-09-17") formatted without moving.
 *
 * `new Date('2013-09-17')` is UTC midnight, so formatting it in local
 * time put every release date one day early for everyone west of
 * Greenwich. A release date is a calendar fact, not an instant: format
 * it in the same UTC frame it was parsed in and it stays September 17
 * in Los Angeles too.
 */
export function calendarDate(
  iso: string,
  style: 'long' | 'short' = 'long'
): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: style,
    day: 'numeric',
    ...(style === 'long' ? { year: 'numeric' } : {}),
  });
}

/**
 * "1 game", "12 games": a count with its noun agreeing. The app said
 * "1 games" on the You page, the first time anyone saved a single game.
 */
export function countOf(n: number, noun: string, plural = `${noun}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? noun : plural}`;
}

/**
 * A game's name as a person says it in a sentence.
 *
 * "More action, like The Legend of Zelda: Breath of the Wild" wrapped
 * a row's title onto two lines under its own eyebrow and a chapter
 * heading — four lines of heading over one row of tiles. Nobody says
 * the franchise half aloud: after a colon, the subtitle is the name,
 * as long as it is a name (two words or more) and not a number.
 */
export function spokenName(name: string): string {
  const at = name.indexOf(': ');
  if (at < 0) return name;
  const rest = name.slice(at + 2).trim();
  return rest.split(/\s+/).length >= 2 ? rest : name;
}
