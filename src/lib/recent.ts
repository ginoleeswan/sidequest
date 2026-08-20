import type { Game } from '@/api/types';
import { readVersioned, writeJson } from './storage';

/**
 * The games you just looked at.
 *
 * Browsing a games database is a lot of opening things and going back,
 * and the app forgot every one of them the moment you did. This is the
 * cheapest possible memory: a short list, on the device, written when a
 * game page opens.
 */

const STORAGE_KEY = 'sidequest.recent.v1';

/** Enough to find your way back, short enough to stay a rail. */
const MAX = 12;

export interface RecentGame {
  id: number;
  slug?: string;
  name: string;
  background_image: string | null;
  seenAt: number;
}

export const readRecent = (): RecentGame[] =>
  readVersioned<RecentGame[]>(STORAGE_KEY, [], []).filter(
    (game) => typeof game?.id === 'number' && typeof game?.name === 'string'
  );

/**
 * Record a visit and hand back the new list.
 *
 * Most recent first, one entry per game — revisiting something moves it
 * to the front rather than filling the list with itself.
 */
export function rememberGame(
  game: Pick<Game, 'id' | 'slug' | 'name' | 'background_image'>,
  now: number = Date.now()
): RecentGame[] {
  const next: RecentGame[] = [
    {
      id: game.id,
      slug: game.slug,
      name: game.name,
      background_image: game.background_image ?? null,
      seenAt: now,
    },
    ...readRecent().filter((seen) => seen.id !== game.id),
  ].slice(0, MAX);

  writeJson(STORAGE_KEY, next);
  return next;
}

/** Forget the lot — it is a convenience, not a record. */
export function clearRecent(): void {
  writeJson(STORAGE_KEY, []);
}
