/** Client side of the time-to-beat lookup. The credentials stay on the server. */

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
  return (await fetchIgdbBatch(slugs)).times;
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

export async function fetchIgdbBatch(slugs: string[]): Promise<IgdbBatch> {
  const wanted = [...new Set(slugs.filter(Boolean))];
  if (wanted.length === 0) return { times: {}, covers: {} };

  const batches: string[][] = [];
  for (let i = 0; i < wanted.length; i += SLUG_BATCH)
    batches.push(wanted.slice(i, i + SLUG_BATCH));

  const results = await Promise.all(
    batches.map(async (batch): Promise<IgdbBatch> => {
      try {
        const response = await fetch(
          `/api/igdb?slugs=${encodeURIComponent(batch.join(','))}`
        );
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
}

/** t_cover_big is 264x352 — the box-art rung; t_720p for a lead. */
export function igdbCoverUri(imageId: string, size = 'cover_big'): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export async function fetchIgdbExtras(
  slug: string
): Promise<(IgdbExtras & { times: TimeToBeat | null }) | null> {
  try {
    const response = await fetch(`/api/igdb?slugs=${encodeURIComponent(slug)}`);
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
