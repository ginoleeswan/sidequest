import type { Game } from '@/api/types';
import type { LibraryEntry } from './library';

/**
 * News that is actually about you.
 *
 * The app cannot know about sales, or Twitch, or what the group chat is
 * talking about — and inventing a "trending" row out of nothing would be
 * decoration. What it does know is what you finished and when things
 * come out, and the intersection of those two is the one genuinely
 * useful alert in the category: the sequel to the thing you loved is
 * here.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Recent enough to be news, far enough ahead to be worth waiting for. */
const OUT_WITHIN_DAYS = 60;
const SOON_WITHIN_DAYS = 120;

export interface SeriesNews {
  /** The game they finished. */
  becauseOf: string;
  game: Game;
  /** Already out, or still coming. */
  kind: 'out' | 'soon';
  days: number;
  message: string;
}

const dayDiff = (iso: string, now: number) =>
  Math.round((Date.parse(iso) - now) / DAY);

/**
 * Turn one finished game's series into news, if any of it is news.
 *
 * Anything already in the library is left out: someone who saved the
 * sequel the day it was announced does not need telling.
 */
export function seriesNews(
  finished: LibraryEntry,
  series: Game[],
  library: LibraryEntry[],
  now: number = Date.now()
): SeriesNews[] {
  const owned = new Set(library.map((entry) => entry.game.id));

  return series
    .filter((game) => !owned.has(game.id) && game.released)
    .map((game) => {
      const days = dayDiff(game.released as string, now);
      const kind: SeriesNews['kind'] = days <= 0 ? 'out' : 'soon';
      return { game, days, kind };
    })
    .filter(({ days, kind }) =>
      kind === 'out' ? days >= -OUT_WITHIN_DAYS : days <= SOON_WITHIN_DAYS
    )
    .map(({ game, days, kind }) => ({
      becauseOf: finished.game.name,
      game,
      kind,
      days,
      message:
        kind === 'out'
          ? `You finished ${finished.game.name}. ${game.name} is out.`
          : `You finished ${finished.game.name}. ${game.name} lands in ${days} ${
              days === 1 ? 'day' : 'days'
            }.`,
    }))
    .sort((a, b) => Math.abs(a.days) - Math.abs(b.days));
}

/**
 * Which finished games are worth asking about.
 *
 * Most recent first, and only a few: each one is a request, and the
 * game somebody finished last month is the one they still care about.
 */
export function seriesCandidates(
  entries: LibraryEntry[],
  limit = 4
): LibraryEntry[] {
  return entries
    .filter((entry) => entry.status === 'finished')
    .sort((a, b) => (b.finishedAt ?? b.addedAt) - (a.finishedAt ?? a.addedAt))
    .slice(0, limit);
}
