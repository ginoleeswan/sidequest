import { readVersioned, writeJson } from './storage';

/**
 * What you looked for last time.
 *
 * Opening search used to show the storefront sitting behind a keyboard
 * — the page you had just left, dimmed, with nothing to do until you
 * typed. Every search box people actually like opens on where they
 * were going before: the last few things they asked it. Kept short, on
 * the device, and written only when a search led somewhere.
 */

const STORAGE_KEY = 'sidequest.searches.v1';

/** Enough to be a memory, few enough to scan before you start typing. */
const MAX = 8;

const normalise = (term: string) => term.trim().replace(/\s+/g, ' ');

export const readSearches = (): string[] =>
  readVersioned<string[]>(STORAGE_KEY, []).filter(
    (term) => typeof term === 'string' && term.length > 0
  );

/**
 * Record a search and hand back the new list.
 *
 * Most recent first, one entry per term regardless of case — searching
 * "hades" after "Hades" moves it to the front rather than listing both.
 */
export function rememberSearch(term: string): string[] {
  const clean = normalise(term);
  if (clean.length < 2) return readSearches();
  const next = [
    clean,
    ...readSearches().filter(
      (seen) => seen.toLowerCase() !== clean.toLowerCase()
    ),
  ].slice(0, MAX);
  writeJson(STORAGE_KEY, next);
  return next;
}

/** Drop one — a typo is not something to be reminded of for a week. */
export function forgetSearch(term: string): string[] {
  const next = readSearches().filter((seen) => seen !== term);
  writeJson(STORAGE_KEY, next);
  return next;
}

export function clearSearches(): void {
  writeJson(STORAGE_KEY, []);
}
