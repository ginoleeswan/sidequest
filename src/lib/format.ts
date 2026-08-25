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
