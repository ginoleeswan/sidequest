import { readVersioned, writeJson } from './storage';

/**
 * Why a game was let go.
 *
 * The app's whole stance is that dropping things is allowed, and asking
 * why is not a guilt trip — it is the only way the shelves can learn
 * anything. "Too long" and "bounced off it" mean opposite things about
 * what to offer next, and the difference is two taps.
 *
 * Counts, not a diary. Nobody needs a permanent record of a game they
 * decided not to play, and the totals are all the app can act on.
 */

const STORAGE_KEY = 'sidequest.drops.v1';

export const DROP_REASONS = [
  { key: 'too-long', label: 'Too long for me' },
  { key: 'not-now', label: 'Not in the mood' },
  { key: 'bounced', label: 'Bounced off it' },
  { key: 'never-really', label: 'Never really wanted it' },
] as const;

export type DropReason = (typeof DROP_REASONS)[number]['key'];

export type DropCounts = Partial<Record<DropReason, number>>;

export const readDrops = (): DropCounts =>
  readVersioned<DropCounts>(STORAGE_KEY, {}, []);

/** Record one reason, once per game let go. */
export function recordDrop(reason: DropReason, count = 1): DropCounts {
  const counts = readDrops();
  const next = { ...counts, [reason]: (counts[reason] ?? 0) + count };
  writeJson(STORAGE_KEY, next);
  return next;
}

export const totalDrops = (counts: DropCounts): number =>
  Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

/**
 * What the pattern says about someone, in their own terms.
 *
 * Only spoken when there is enough to be worth saying: three of one
 * reason is a habit, one is a Tuesday.
 */
export function dropInsight(counts: DropCounts): string | null {
  const total = totalDrops(counts);
  if (total < 3) return null;

  const [top] = Object.entries(counts).sort(
    ([, a], [, b]) => (b ?? 0) - (a ?? 0)
  ) as [DropReason, number][];
  if (!top || top[1] < 3) return null;

  switch (top[0]) {
    case 'too-long':
      return 'Most of what you let go was too long. The plan leads with what fits.';
    case 'not-now':
      return 'Mostly a matter of timing. Nothing you dropped is gone — it is just not now.';
    case 'bounced':
      return 'You give things a fair go and then move on. That is a skill, not a failing.';
    case 'never-really':
      return 'A lot of these were never really yours. Saving less is allowed too.';
    default:
      return null;
  }
}
