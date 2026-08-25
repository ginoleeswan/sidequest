/**
 * Deciding what a device should hold after it talks to the server.
 *
 * Pure, and separate from everything that does I/O, because this is the
 * file where somebody's library gets lost if it is wrong. Every rule
 * below is written to fail in the direction of keeping data.
 *
 * The model is last-write-wins per row, on a timestamp the DEVICE
 * stamps — not the server's. Two devices editing the same game while
 * one is offline is the ordinary case, and the honest answer to "which
 * did the person mean" is "whichever they touched later", which only
 * the device clocks know. Clock skew between two of somebody's own
 * devices is seconds; the edits it would misorder are edits made
 * seconds apart, where either answer is defensible.
 *
 * Three rules earn their own explanation:
 *
 * ABSENCE IS NOT A DELETE. A row the server has never heard of is a row
 * to push, never a row to remove. Anything else means a first sign-in
 * on a device with a full library wipes it against an empty account —
 * which is the single worst thing this feature could do, and exactly
 * what a naive "make local look like remote" would do.
 *
 * A DELETE IS A ROW. Removing a game writes a tombstone rather than
 * dropping the row, because the other device has to be told. A row that
 * simply vanished is indistinguishable from one that never arrived.
 *
 * TIES GO LOCAL. The device is the source of truth in this app; the
 * server is a mirror that lets a second device catch up. When the two
 * are equally fresh, the one in front of the person wins.
 */

export interface Row {
  /** Natural key within one person's data — a game id, mostly. */
  key: string;
  /** When this device last changed it, epoch ms. */
  clientUpdatedAt: number;
  /** A tombstone: the row was removed, and the other side must know. */
  deleted?: boolean;
}

export interface MergePlan<T extends Row> {
  /** What the device should hold once this is applied. */
  next: T[];
  /** What has to go up: rows the server lacks, or holds staler. */
  push: T[];
}

/**
 * Fold a pulled page into what the device already has.
 *
 * `remote` is only what changed since the last cursor, so it is a patch
 * rather than a picture — which is the other reason absence cannot mean
 * deletion here: almost every row is absent from almost every pull.
 */
export function mergeRows<T extends Row>(
  local: readonly T[],
  remote: readonly T[]
): MergePlan<T> {
  const byKey = new Map<string, T>();
  for (const row of local) byKey.set(row.key, row);

  const push: T[] = [];
  const seen = new Set<string>();

  for (const incoming of remote) {
    seen.add(incoming.key);
    const mine = byKey.get(incoming.key);

    if (!mine) {
      // News. A tombstone for a row this device never had is nothing to
      // do — there is no local copy to remove, and holding the stone
      // would only teach the device about a game it never saved.
      if (!incoming.deleted) byKey.set(incoming.key, incoming);
      continue;
    }

    if (incoming.clientUpdatedAt > mine.clientUpdatedAt) {
      // Theirs is fresher. A tombstone removes the row; anything else
      // replaces it.
      if (incoming.deleted) byKey.delete(incoming.key);
      else byKey.set(incoming.key, incoming);
    } else {
      // Ours is fresher, or the same age and therefore ours. Either way
      // the server is behind and has to be told — including when ours
      // is a tombstone, which is how a delete made offline survives.
      push.push(mine);
    }
  }

  // Everything the pull did not mention and the server may never have
  // seen. Cheap to send and impossible to lose.
  for (const mine of local) {
    if (!seen.has(mine.key)) push.push(mine);
  }

  return { next: [...byKey.values()], push };
}

/**
 * The newest server timestamp in a pulled page, or the cursor unchanged.
 *
 * Kept as the server's own clock rather than the device's: the cursor's
 * only job is to be comparable with `updated_at` on the next pull, and
 * mixing two clocks into that comparison is how rows start going
 * missing between syncs.
 */
export function advanceCursor(
  cursor: string | null,
  serverStamps: readonly string[]
): string | null {
  let latest = cursor;
  for (const stamp of serverStamps) {
    if (latest == null || stamp > latest) latest = stamp;
  }
  return latest;
}
