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
  const wanted = [...new Set(slugs.filter(Boolean))];
  if (wanted.length === 0) return {};

  const batches: string[][] = [];
  for (let i = 0; i < wanted.length; i += SLUG_BATCH)
    batches.push(wanted.slice(i, i + SLUG_BATCH));

  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        const response = await fetch(
          `/api/igdb?slugs=${encodeURIComponent(batch.join(','))}`
        );
        if (!response.ok) return {};
        const body = (await response.json()) as {
          durations?: TimeToBeatBySlug;
        };
        return body.durations ?? {};
      } catch {
        return {};
      }
    })
  );

  return Object.assign({}, ...results) as TimeToBeatBySlug;
}
