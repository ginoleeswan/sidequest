import { apiUrl } from './base';
import type { Game, StoreLink } from './types';

/**
 * Client side of the title-treatment lookup. The SteamGridDB key stays
 * on the server; see api/logo.ts.
 */
export interface GameLogo {
  url: string;
  thumb: string;
  width: number;
  height: number;
  source: 'sgdb' | 'steam';
  style: string;
}

/**
 * The Steam app id hiding in RAWG's store links, if the game has a
 * Steam release. RAWG gives the store URL and nothing else; the id is
 * the only part of it the logo lookup wants.
 */
export function steamIdFrom(
  links: readonly StoreLink[] | undefined
): string | null {
  for (const link of links ?? []) {
    const match = /store\.steampowered\.com\/app\/(\d+)/.exec(link.url);
    if (match) return match[1];
  }
  return null;
}

export async function fetchLogo(
  game: Pick<Game, 'name' | 'released' | 'slug'>,
  steam: string | null = null
): Promise<GameLogo | null> {
  try {
    const query = new URLSearchParams({ name: game.name, slug: game.slug });
    const year = game.released?.slice(0, 4);
    if (year) query.set('year', year);
    if (steam) query.set('steam', steam);
    const res = await fetch(apiUrl(`/api/logo?${query}`));
    if (!res.ok) return null;
    const body = (await res.json()) as { logo?: GameLogo | null };
    return body.logo ?? null;
  } catch {
    // No logo is the typed title, which is the page as it was.
    return null;
  }
}

/**
 * One entry per game, keyed by slug alone.
 *
 * The Steam id is a hint that makes the server's answer more exact,
 * not part of the identity of the answer: a tile that prefetched
 * without one and a page that later learned it are asking about the
 * same game, and must not pay for two round trips.
 */
export function logoQuery(
  game: Pick<Game, 'name' | 'released' | 'slug'>,
  steam: string | null = null
) {
  return {
    queryKey: ['logo', game.slug] as const,
    queryFn: () => fetchLogo(game, steam),
    // A logo changes about never.
    staleTime: 7 * 24 * 60 * 60 * 1000,
  };
}
