import { advanceCursor, mergeRows } from './merge';
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
}

export interface Cursors {
  library: string | null;
  durations: string | null;
}

export const NO_CURSORS: Cursors = { library: null, durations: null };

export type SyncOutcome =
  | { ok: true; state: SyncState; pushed: number; pulled: number }
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

    // Games before entries: a library_entries row references games(id),
    // so pushing an entry for a game the table has never heard of is a
    // foreign key violation that would fail the whole batch.
    if (libraryPlan.push.length > 0) {
      const named = gamesUpload(
        Object.fromEntries(
          libraryPlan.push
            .filter((row) => row.value?.game?.name)
            .map((row) => [row.key, row.value as LibraryEntry])
        )
      );
      if (named.length > 0) await backend.pushGames(named);
      await backend.pushLibrary(libraryUpload(libraryPlan.push));
    }

    /* -------------------------------------------------------- durations */
    const pulledDurations = await backend.pullDurations(local.cursors.durations);
    const durationPlan = mergeRows(
      localDurations(local.durations, now),
      remoteDurations(pulledDurations)
    );
    const durations = applyDurations(durationPlan.next);
    if (durationPlan.push.length > 0) {
      await backend.pushDurations(durationsUpload(durationPlan.push));
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
        preferences = { ...preferencesDownload(remotePrefs), updatedAt: theirs };
      } else {
        await backend.pushPreferences(preferencesUpload(local.preferences, now));
      }
    } else {
      await backend.pushPreferences(preferencesUpload(local.preferences, now));
    }

    return {
      ok: true,
      pulled: pulledLibrary.length + pulledDurations.length,
      pushed: libraryPlan.push.length + durationPlan.push.length,
      state: {
        entries,
        durations,
        preferences,
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
