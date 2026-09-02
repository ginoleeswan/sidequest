/** Client side of the time-to-beat lookup. The credentials stay on the server. */

import { apiUrl } from './base';

export interface TimeToBeat {
  /** Rushing it. */
  hastily: number | null;
  /** The number the plan wants: how long it takes most people. */
  normally: number | null;
  /** Everything, including the bits nobody does. */
  completely: number | null;
  /** How many people reported. One person's Tuesday is not a length. */
  submissions: number;
}

export type TimeToBeatBySlug = Record<string, TimeToBeat>;

/**
 * A batch small enough to keep URLs sane and the server's IGDB query
 * inside one page of results.
 */
export const SLUG_BATCH = 40;

/**
 * Ask for the games in `slugs`, in batches.
 *
 * Missing answers are missing on purpose: IGDB simply has no submitted
 * times for a lot of games, and the caller falls back to the estimate
 * rather than inventing one. A failed batch is treated the same way — a
 * length nobody has is better than a plan that will not draw.
 */
export async function fetchTimesToBeat(
  slugs: string[]
): Promise<TimeToBeatBySlug> {
  return (await fetchIgdbBatch(slugs.map((slug) => ({ slug })))).times;
}

/**
 * What the server needs to be sure which game is meant.
 *
 * The slug alone is not enough: IGDB suffixes a reused title rather
 * than overwriting it, so a slug can land on a different game of the
 * same name from thirty years earlier. The title and the year are what
 * disambiguate, and both are already on every `Game` the app holds.
 */
export interface IgdbLookup {
  slug: string;
  name?: string;
  /** RAWG's release date; only the year is used. */
  released?: string | null;
}

/**
 * Everything one round trip already carries: the times, and the box
 * art. The server has always sent both maps; reading only the durations
 * meant every screen that batch-asked about its games was throwing the
 * covers on the floor, then paying IGDB again one game at a time if it
 * ever wanted them.
 */
export interface IgdbBatch {
  times: TimeToBeatBySlug;
  /** IGDB cover image id per slug, for `igdbCoverUri`. */
  covers: Record<string, string>;
}

export async function fetchIgdbBatch(
  lookups: IgdbLookup[]
): Promise<IgdbBatch> {
  const bySlug = new Map<string, IgdbLookup>();
  for (const lookup of lookups)
    if (lookup.slug && !bySlug.has(lookup.slug))
      bySlug.set(lookup.slug, lookup);
  const wanted = [...bySlug.values()];
  if (wanted.length === 0) return { times: {}, covers: {} };

  const batches: IgdbLookup[][] = [];
  for (let i = 0; i < wanted.length; i += SLUG_BATCH)
    batches.push(wanted.slice(i, i + SLUG_BATCH));

  const results = await Promise.all(
    batches.map(async (batch): Promise<IgdbBatch> => {
      try {
        // Index-aligned, pipe-separated: a title can hold a comma, and
        // an empty slot simply means the caller knew only the slug.
        const query = new URLSearchParams({
          slugs: batch.map((lookup) => lookup.slug).join(','),
          names: batch.map((lookup) => lookup.name ?? '').join('|'),
          years: batch
            .map((lookup) => lookup.released?.slice(0, 4) ?? '')
            .join('|'),
        });
        const response = await fetch(apiUrl(`/api/igdb?${query}`));
        if (!response.ok) return { times: {}, covers: {} };
        const body = (await response.json()) as {
          durations?: TimeToBeatBySlug;
          extras?: Record<string, IgdbExtras>;
        };
        const covers: Record<string, string> = {};
        for (const [slug, extras] of Object.entries(body.extras ?? {}))
          if (extras.cover) covers[slug] = extras.cover;
        return { times: body.durations ?? {}, covers };
      } catch {
        return { times: {}, covers: {} };
      }
    })
  );

  return {
    times: Object.assign({}, ...results.map((r) => r.times)),
    covers: Object.assign({}, ...results.map((r) => r.covers)),
  };
}

/**
 * The enrichment beside the durations: what IGDB knows that RAWG does
 * not. Same endpoint, same response — the server sends both maps and
 * each caller reads its half.
 */
export interface IgdbExtras {
  /** IGDB cover image id — the box art RAWG has no field for. */
  cover: string | null;
  /** Critic aggregate, 0-100, rounded. */
  critic: number | null;
  criticCount: number;
  /** Short spoiler-safe synopsis; often better prose than marketing. */
  storyline: string | null;
  /** IGDB's "games like this", slug-routable and covered. */
  similar: { slug: string; name: string; cover: string }[];
  /** The Steam app id, for the title-treatment lookup; null when none. */
  steam?: string | null;
}

/** t_cover_big is 264x352 — the box-art rung; t_720p for a lead. */
export function igdbCoverUri(imageId: string, size = 'cover_big'): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export async function fetchIgdbExtras(
  slug: string,
  lookup?: { name?: string; released?: string | null }
): Promise<(IgdbExtras & { times: TimeToBeat | null }) | null> {
  try {
    // Same disambiguation the batch does: without the title and year
    // this page would happily print a 1994 game's critic score.
    const query = new URLSearchParams({
      slugs: slug,
      names: lookup?.name ?? '',
      years: lookup?.released?.slice(0, 4) ?? '',
    });
    const response = await fetch(apiUrl(`/api/igdb?${query}`));
    if (!response.ok) return null;
    const body = (await response.json()) as {
      durations?: TimeToBeatBySlug;
      extras?: Record<string, IgdbExtras>;
    };
    const extras = body.extras?.[slug];
    if (!extras) return null;
    return { ...extras, times: body.durations?.[slug] ?? null };
  } catch {
    return null;
  }
}
