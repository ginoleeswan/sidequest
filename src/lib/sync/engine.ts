import { isPermanent, reasonOf } from './errors';
import {
  advanceCursor,
  knownAfter,
  mergeRows,
  pendingPush,
  type Row,
} from './merge';
import {
  applyDurations,
  applyLibrary,
  durationsUpload,
  gamesUpload,
  libraryUpload,
  localDurations,
  localLibrary,
  preferencesDownload,
  preferencesUpload,
  remoteDurations,
  remoteLibrary,
  type Carried,
  type DurationRow,
  type LibraryRow,
  type Preferences,
  type PreferencesRow,
} from './shape';
import type { LibraryEntry } from '../library';

/**
 * One round of talking to the server.
 *
 * Pull what changed since the cursor, merge it against what the device
 * holds, push whatever the server is missing or holding staler, and
 * hand back the new local state for the app to adopt. The decisions all
 * live in merge.ts and the field names all live in shape.ts; this is
 * the sequencing, and the error handling.
 *
 * A round is all-or-nothing per table, never per row. A pull that fails
 * halfway leaves the cursor where it was, so the next round asks for
 * the same window again — which is safe precisely because the merge is
 * idempotent: applying the same page twice reaches the same answer.
 *
 * Nothing here throws at its caller. A sync that cannot happen is an
 * ordinary condition — a plane, a tunnel, a signed-out session — and
 * the app is fully usable without it. The result says what happened so
 * the account screen can be specific rather than reassuring.
 */

/** The tables this carries. Sessions and drops are named in the docs. */
export interface SyncState {
  entries: Record<string, LibraryEntry>;
  durations: Record<string, number>;
  preferences: Preferences;
  /** Server `updated_at` of the newest row seen, per table. */
  cursors: Cursors;
  /**
   * What the server was last confirmed to hold, per table.
   *
   * Optional, and absent means "assume nothing" — which pushes the
   * whole library once and then settles. That is the safe direction to
   * be wrong in, and it is what a device upgrading from a build that
   * did not keep this record will do exactly once.
   */
  known?: Known;
  /**
   * Rows the server has already refused, and what it said.
   *
   * Optional, and absent means nothing is stuck — which is the state
   * every device is in until something goes wrong, and the state it
   * returns to once the offending row is edited.
   */
  quarantine?: Quarantine;
}

/** What the server said about a row, and which version of it it said so about. */
export interface Stuck {
  reason: string;
  /** The fingerprint that was refused. A different one gets a fresh try. */
  fingerprint: number;
}

export interface Quarantine {
  library: Record<string, Stuck>;
  durations: Record<string, Stuck>;
}

export const NO_QUARANTINE: Quarantine = { library: {}, durations: {} };

/** Key to fingerprint, per table. See `pendingPush` for what a fingerprint is. */
export interface Known {
  library: Record<string, number>;
  durations: Record<string, number>;
}

export const NO_KNOWN: Known = { library: {}, durations: {} };

export interface Cursors {
  library: string | null;
  durations: string | null;
}

export const NO_CURSORS: Cursors = { library: null, durations: null };

export type SyncOutcome =
  | {
      ok: true;
      state: SyncState;
      pushed: number;
      pulled: number;
      /** Rows this round could not place, named so a screen can say which. */
      stuck: { key: string; reason: string }[];
    }
  | { ok: false; reason: string };

/**
 * The slice of supabase-js this needs, named so it can be faked.
 *
 * Also the seam that keeps the real client out of the test runner: the
 * engine is worth testing thoroughly and none of that testing should
 * require a network, a project, or a hand-built mock of a query builder
 * three levels deep.
 */
export interface SyncBackend {
  pullLibrary(since: string | null): Promise<Stamped<LibraryRow>[]>;
  pullDurations(since: string | null): Promise<Stamped<DurationRow>[]>;
  pullPreferences(): Promise<PreferencesRow | null>;
  pushLibrary(rows: LibraryRow[]): Promise<void>;
  pushDurations(rows: DurationRow[]): Promise<void>;
  pushPreferences(row: PreferencesRow): Promise<void>;
  pushGames(rows: ReturnType<typeof gamesUpload>): Promise<void>;
}

/** Every pulled row carries the server clock the cursor is kept in. */
export type Stamped<T> = T & { updated_at: string };

/**
 * A duration's fingerprint is the number of hours, not its stamp.
 *
 * The local store keeps no per-correction timestamp, so `localDurations`
 * stamps every row with the moment of the sync. Fingerprinting on that
 * would mark every correction as changed on every round.
 */
const hours = (row: { value?: number }) => row.value ?? 0;

/**
 * Send a batch, and if the server refuses it, find out which row.
 *
 * A push is one statement, so a single impossible value takes the whole
 * batch down with it — and because the engine retries what it could not
 * place, that one row would stop every other game the person owns from
 * ever reaching their account. This halves the batch and tries again,
 * so the cost of finding one bad row among five hundred is nine round
 * trips rather than five hundred, and the good rows still land.
 *
 * Only permanent refusals are worth bisecting. A dropped connection
 * fails every half equally, and splitting it up would turn one failed
 * request into a storm of them — so those are rethrown untouched and
 * the round ends the way it always has, changing nothing.
 */
/**
 * How many rows go up in one statement.
 *
 * The pull has been paged since it was written; the push was not, and
 * the asymmetry was a real bug. A CSV import has no cap on it, so a
 * person moving a long backlog in would have sent every row as a single
 * upsert — over the request size limit, refused for a reason that is
 * not a constraint violation, and therefore classified as temporary and
 * retried forever. Sync permanently broken for precisely the people
 * with the most to sync, which is who this app is for.
 *
 * Smaller than the pull's page because these rows are much fatter: a
 * library entry carries a note and a tag array, where a pulled row is
 * read back into a fixed shape.
 */
const CHUNK = 200;

/**
 * Send everything, a chunk at a time, and report what landed.
 *
 * Sequential rather than parallel on purpose. Fifteen simultaneous
 * upserts from a phone on a train is a worse way to fail than fifteen
 * one after another, and it buys nothing: the round is not waiting on
 * anything else.
 *
 * A chunk that fails on the network ends the round with earlier chunks
 * already on the server. That is safe rather than merely tolerable —
 * the upserts are idempotent and `known` is not updated for a round
 * that did not finish, so the next round sends them again and reaches
 * the same place.
 */
async function pushEverything<T extends Row>(
  rows: T[],
  send: (batch: T[]) => Promise<void>
): Promise<{ sent: T[]; rejected: { row: T; reason: string }[] }> {
  const sent: T[] = [];
  const rejected: { row: T; reason: string }[] = [];
  for (let from = 0; from < rows.length; from += CHUNK) {
    const part = await pushSurvivors(rows.slice(from, from + CHUNK), send);
    sent.push(...part.sent);
    rejected.push(...part.rejected);
  }
  return { sent, rejected };
}

async function pushSurvivors<T extends Row>(
  rows: T[],
  send: (batch: T[]) => Promise<void>
): Promise<{ sent: T[]; rejected: { row: T; reason: string }[] }> {
  if (rows.length === 0) return { sent: [], rejected: [] };
  try {
    await send(rows);
    return { sent: rows, rejected: [] };
  } catch (error) {
    if (!isPermanent(error)) throw error;
    if (rows.length === 1) {
      return {
        sent: [],
        rejected: [{ row: rows[0], reason: reasonOf(error) }],
      };
    }
    const middle = Math.floor(rows.length / 2);
    const first = await pushSurvivors(rows.slice(0, middle), send);
    const second = await pushSurvivors(rows.slice(middle), send);
    return {
      sent: [...first.sent, ...second.sent],
      rejected: [...first.rejected, ...second.rejected],
    };
  }
}

/** Rows the server refused in this exact shape, and has not been re-offered since. */
const notRefused =
  <T extends Row>(
    held: Record<string, Stuck>,
    fingerprint: (row: T) => number
  ) =>
  (row: T) =>
    held[row.key]?.fingerprint !== fingerprint(row);

/** The quarantine after a round: refusals that still stand, plus new ones. */
function quarantineAfter<T extends Row>(
  before: Record<string, Stuck>,
  offered: readonly T[],
  rejected: readonly { row: T; reason: string }[],
  fingerprint: (row: T) => number
): Record<string, Stuck> {
  const after: Record<string, Stuck> = {};
  // A refusal survives only while nothing has been sent that clears it.
  // Anything offered this round either landed or was refused again, and
  // either way this round's answer is the current one.
  const answered = new Set(offered.map((row) => row.key));
  for (const [key, stuck] of Object.entries(before)) {
    if (!answered.has(key)) after[key] = stuck;
  }
  for (const { row, reason } of rejected) {
    after[row.key] = { reason, fingerprint: fingerprint(row) };
  }
  return after;
}

export async function syncOnce(
  backend: SyncBackend,
  local: SyncState,
  now: number = Date.now()
): Promise<SyncOutcome> {
  try {
    /* ---------------------------------------------------------- library */
    const pulledLibrary = await backend.pullLibrary(local.cursors.library);
    const libraryPlan = mergeRows(
      localLibrary(local.entries),
      remoteLibrary(pulledLibrary)
    );
    const entries = applyLibrary(libraryPlan.next, local.entries);

    // What the merge offered, minus what the server already has, plus
    // tombstones for keys that have since left the device. Rows the
    // pull itself mentioned count as held even when it removed them:
    // the server plainly knows about those already.
    const libraryHeld = new Set(libraryPlan.next.map((row) => row.key));
    for (const row of pulledLibrary) libraryHeld.add(String(row.game_id));
    const libraryPush = pendingPush(
      libraryHeld,
      libraryPlan.push,
      local.known?.library ?? {},
      now
    );

    // Skip what the server already refused in this exact shape. Edit
    // the game and the fingerprint changes, which is the retry: the
    // person fixing the problem is the event worth waiting for.
    const stuckLibrary = local.quarantine?.library ?? {};
    const libraryTry = libraryPush.filter(
      notRefused<Carried<LibraryEntry>>(
        stuckLibrary,
        (row) => row.clientUpdatedAt
      )
    );

    // Games before entries: a library_entries row references games(id),
    // so pushing an entry for a game the table has never heard of is a
    // foreign key violation that would fail the whole batch.
    let librarySent: typeof libraryTry = [];
    let libraryRejected: {
      row: (typeof libraryTry)[number];
      reason: string;
    }[] = [];
    if (libraryTry.length > 0) {
      const named = gamesUpload(
        Object.fromEntries(
          libraryTry
            .filter((row) => row.value?.game?.name)
            .map((row) => [row.key, row.value as LibraryEntry])
        )
      );
      // The games cache gets the same treatment: one malformed release
      // date should cost that one game, not the whole shelf.
      if (named.length > 0) {
        await pushEverything(
          named.map((game, index) => ({
            key: String(game.id),
            clientUpdatedAt: index,
            game,
          })),
          (batch) => backend.pushGames(batch.map((row) => row.game))
        );
      }
      const outcome = await pushEverything(libraryTry, (batch) =>
        backend.pushLibrary(libraryUpload(batch))
      );
      librarySent = outcome.sent;
      libraryRejected = outcome.rejected;
    }

    /* -------------------------------------------------------- durations */
    const pulledDurations = await backend.pullDurations(
      local.cursors.durations
    );
    const durationPlan = mergeRows(
      localDurations(local.durations, now),
      remoteDurations(pulledDurations)
    );
    const durations = applyDurations(durationPlan.next);
    const durationsHeld = new Set(durationPlan.next.map((row) => row.key));
    for (const row of pulledDurations) durationsHeld.add(String(row.game_id));
    const durationsPush = pendingPush(
      durationsHeld,
      durationPlan.push,
      local.known?.durations ?? {},
      now,
      hours
    );
    const stuckDurations = local.quarantine?.durations ?? {};
    const durationsTry = durationsPush.filter(
      notRefused<Carried<number>>(stuckDurations, hours)
    );
    let durationsSent: typeof durationsTry = [];
    let durationsRejected: {
      row: (typeof durationsTry)[number];
      reason: string;
    }[] = [];
    if (durationsTry.length > 0) {
      const outcome = await pushEverything(durationsTry, (batch) =>
        backend.pushDurations(durationsUpload(batch))
      );
      durationsSent = outcome.sent;
      durationsRejected = outcome.rejected;
    }

    /* ------------------------------------------------------ preferences */
    // A single row rather than a set, so it needs no merge — but it does
    // need the same last-write-wins, which here is a straight
    // comparison of the two stamps.
    const remotePrefs = await backend.pullPreferences();
    let preferences = local.preferences;
    if (remotePrefs) {
      const theirs = new Date(remotePrefs.client_updated_at).getTime();
      const mine = local.preferences.updatedAt ?? 0;
      if (theirs > mine) {
        preferences = {
          ...preferencesDownload(remotePrefs),
          updatedAt: theirs,
        };
      } else {
        await backend.pushPreferences(
          preferencesUpload(local.preferences, now)
        );
      }
    } else {
      await backend.pushPreferences(preferencesUpload(local.preferences, now));
    }

    const refusedLibrary = new Set(libraryRejected.map((r) => r.row.key));
    const refusedDurations = new Set(durationsRejected.map((r) => r.row.key));
    const quarantineLibrary = quarantineAfter(
      stuckLibrary,
      libraryTry,
      libraryRejected,
      (row) => row.clientUpdatedAt
    );
    const quarantineDurations = quarantineAfter(
      stuckDurations,
      durationsTry,
      durationsRejected,
      hours
    );

    return {
      ok: true,
      pulled: pulledLibrary.length + pulledDurations.length,
      // What landed, not what was attempted. A round that placed
      // nothing should not report progress it did not make.
      pushed: librarySent.length + durationsSent.length,
      stuck: [...libraryRejected, ...durationsRejected].map(
        ({ row, reason }) => ({ key: row.key, reason })
      ),
      state: {
        entries,
        durations,
        preferences,
        // Recorded from what is actually kept, not from the merge's
        // working set: a key remembered that the device did not retain
        // would read as a fresh delete on the very next round.
        //
        // A refused row is deliberately excluded. It is still on the
        // device and still absent from the server, so calling it known
        // would be a lie in the one direction that loses data — and the
        // quarantine, not this, is what stops it being retried blindly.
        known: {
          library: knownAfter(
            libraryPlan.next.filter(
              (row) => row.value && !refusedLibrary.has(row.key)
            )
          ),
          durations: knownAfter(
            durationPlan.next.filter(
              (row) => (row.value ?? 0) > 0 && !refusedDurations.has(row.key)
            ),
            hours
          ),
        },
        quarantine: {
          library: quarantineLibrary,
          durations: quarantineDurations,
        },
        cursors: {
          library: advanceCursor(
            local.cursors.library,
            pulledLibrary.map((row) => row.updated_at)
          ),
          durations: advanceCursor(
            local.cursors.durations,
            pulledDurations.map((row) => row.updated_at)
          ),
        },
      },
    };
  } catch (error) {
    // Deliberately not rethrown. Offline is not an error state for this
    // app, and a failed round changes nothing: the cursor does not move
    // and the local data was never touched.
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Sync did not finish',
    };
  }
}
