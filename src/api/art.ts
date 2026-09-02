import { apiUrl } from './base';
import type { Game, StoreLink } from './types';

/**
 * Client side of the artwork lookup. The SteamGridDB key stays on the
 * server; see api/art.ts for what each piece is and where it comes from.
 */
export interface ArtAsset {
  url: string;
  thumb: string;
  width: number;
  height: number;
  source: 'sgdb' | 'steam';
  style: string;
}

export interface GameArt {
  /** The title as the publisher drew it, on transparency. */
  logo: ArtAsset | null;
  /** A wide banner composed to sit behind the logo, about 3:1. */
  hero: ArtAsset | null;
  /** Box art, 600×900 portrait. */
  grid: ArtAsset | null;
  /** The square mark, 256px. */
  icon: ArtAsset | null;
}

export const NO_ART: GameArt = {
  logo: null,
  hero: null,
  grid: null,
  icon: null,
};

/**
 * The Steam app id hiding in RAWG's store links, if the game has a
 * Steam release. RAWG gives the store URL and nothing else; the id is
 * the only part of it the lookup wants.
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

export async function fetchArt(
  game: Pick<Game, 'name' | 'released' | 'slug'>,
  steam: string | null = null
): Promise<GameArt> {
  try {
    const query = new URLSearchParams({ name: game.name, slug: game.slug });
    const year = game.released?.slice(0, 4);
    if (year) query.set('year', year);
    if (steam) query.set('steam', steam);
    const res = await fetch(apiUrl(`/api/art?${query}`));
    if (!res.ok) return NO_ART;
    const body = (await res.json()) as Partial<GameArt>;
    return {
      logo: body.logo ?? null,
      hero: body.hero ?? null,
      grid: body.grid ?? null,
      icon: body.icon ?? null,
    };
  } catch {
    // No artwork is the page drawn from RAWG, which is the page as it was.
    return NO_ART;
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
export function artQuery(
  game: Pick<Game, 'name' | 'released' | 'slug'>,
  steam: string | null = null
) {
  return {
    queryKey: ['art', game.slug] as const,
    queryFn: () => fetchArt(game, steam),
    // Artwork changes about never.
    staleTime: 7 * 24 * 60 * 60 * 1000,
  };
}
