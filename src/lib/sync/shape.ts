import type { Row } from './merge';
import type { LibraryEntry, LibraryStatus } from '../library';
import type { Game } from '@/api/types';

/**
 * Translating between what the device holds and what the tables hold.
 *
 * Pure, and deliberately dull. Everything interesting about sync lives
 * in merge.ts; this file only has to be right about field names, units
 * and null-vs-undefined — which is where the boring, expensive bugs
 * are. Timestamps are epoch milliseconds on the device and ISO strings
 * in Postgres, and every crossing goes through here so there is exactly
 * one place to get that wrong.
 */

/** Postgres timestamptz from epoch ms, and back. */
export const toStamp = (ms: number): string => new Date(ms).toISOString();
export const fromStamp = (stamp: string | null): number | undefined =>
  stamp == null ? undefined : new Date(stamp).getTime();

/**
 * When the device last changed an entry.
 *
 * Entries saved before sync existed carry no such stamp, and the
 * honest origin for those is when the game entered the library: it is
 * the one time we know the person acted on it, and it makes a
 * long-untouched local row lose cleanly to a fresh edit from another
 * device rather than winning by accident.
 */
export const entryStamp = (entry: LibraryEntry): number =>
  entry.updatedAt ?? entry.addedAt;

/* ------------------------------------------------------------ library */

/** One row of `public.library_entries`, as the client sees it. */
export interface LibraryRow {
  game_id: number;
  status: LibraryStatus;
  added_at: string;
  finished_at: string | null;
  hours_played: number | null;
  steam_app_id: number | null;
  deadline: string | null;
  want: number | null;
  note: string | null;
  rating: number | null;
  tags: string[] | null;
  client_updated_at: string;
  deleted_at: string | null;
}

/** A merge envelope: the key and stamp merge.ts needs, plus the cargo. */
export interface Carried<T> extends Row {
  value?: T;
}

export function localLibrary(
  entries: Record<string, LibraryEntry>
): Carried<LibraryEntry>[] {
  return Object.entries(entries).map(([key, entry]) => ({
    key,
    clientUpdatedAt: entryStamp(entry),
    value: entry,
  }));
}

export function remoteLibrary(rows: LibraryRow[]): Carried<LibraryEntry>[] {
  return rows.map((row) => {
    const stamp = new Date(row.client_updated_at).getTime();
    if (row.deleted_at != null) {
      return {
        key: String(row.game_id),
        clientUpdatedAt: stamp,
        deleted: true,
      };
    }
    return {
      key: String(row.game_id),
      clientUpdatedAt: stamp,
      value: {
        // The device keeps its own snapshot of the game; sync carries
        // the id and the person's own fields around it. A row whose
        // game this device has never seen is filled in from the shared
        // games cache before it gets here.
        game: { id: row.game_id } as Game,
        status: row.status,
        addedAt: new Date(row.added_at).getTime(),
        finishedAt: fromStamp(row.finished_at),
        hoursPlayed: row.hours_played ?? undefined,
        steamAppId: row.steam_app_id ?? undefined,
        deadline: fromStamp(row.deadline),
        want: row.want ?? undefined,
        note: row.note ?? undefined,
        rating: row.rating ?? undefined,
        tags: row.tags ?? undefined,
        updatedAt: stamp,
      },
    };
  });
}

/** What goes up. `user_id` is added by the caller, which holds the session. */
export function libraryUpload(carried: Carried<LibraryEntry>[]): LibraryRow[] {
  return carried.map((row) => {
    const entry = row.value;
    if (!entry) {
      // A tombstone still needs the columns the table declares NOT NULL,
      // so it carries a minimal, valid shell around its deleted_at.
      return {
        game_id: Number(row.key),
        status: 'wishlist' as LibraryStatus,
        added_at: toStamp(row.clientUpdatedAt),
        finished_at: null,
        hours_played: null,
        steam_app_id: null,
        deadline: null,
        want: null,
        note: null,
        rating: null,
        tags: null,
        client_updated_at: toStamp(row.clientUpdatedAt),
        deleted_at: toStamp(row.clientUpdatedAt),
      };
    }
    return {
      game_id: entry.game.id,
      status: entry.status,
      added_at: toStamp(entry.addedAt),
      finished_at: entry.finishedAt == null ? null : toStamp(entry.finishedAt),
      hours_played: entry.hoursPlayed ?? null,
      steam_app_id: entry.steamAppId ?? null,
      deadline: entry.deadline == null ? null : toStamp(entry.deadline),
      want: entry.want ?? null,
      note: entry.note ?? null,
      rating: entry.rating ?? null,
      tags: entry.tags ?? null,
      client_updated_at: toStamp(row.clientUpdatedAt),
      deleted_at: null,
    };
  });
}

/** Back into the shape the library provider stores. */
export function applyLibrary(
  merged: Carried<LibraryEntry>[],
  existing: Record<string, LibraryEntry>
): Record<string, LibraryEntry> {
  const next: Record<string, LibraryEntry> = {};
  for (const row of merged) {
    if (!row.value) continue;
    const mine = existing[row.key];
    next[row.key] = {
      ...row.value,
      // Never trade a real game snapshot for the stub a pulled row
      // carries: the device's copy has the artwork, the name and the
      // platforms, and losing those turns a shelf into a row of blanks.
      game: row.value.game.name
        ? row.value.game
        : (mine?.game ?? row.value.game),
    };
  }
  return next;
}

/** The public games cache, so a second device can name what it pulled. */
export function gamesUpload(entries: Record<string, LibraryEntry>) {
  return Object.values(entries)
    .filter((entry) => Boolean(entry.game?.name))
    .map((entry) => ({
      id: entry.game.id,
      slug: entry.game.slug ?? null,
      name: entry.game.name,
      background_image: entry.game.background_image ?? null,
      released: entry.game.released ?? null,
      playtime: entry.game.playtime ?? null,
      metacritic: entry.game.metacritic ?? null,
    }));
}

/* ---------------------------------------------------------- durations */

export interface DurationRow {
  game_id: number;
  hours: number;
  source: string | null;
  client_updated_at: string;
  deleted_at: string | null;
}

/**
 * Corrections have never carried their own timestamps locally — the
 * store is a flat map of game id to hours. Rather than migrate that
 * (and risk the numbers themselves), each is stamped with when it was
 * last SEEN by a sync. The effect is that a correction made on the
 * device that is syncing wins over an older one, which is the
 * behaviour people expect, and two devices correcting the same game
 * settle on whichever synced last.
 */
export function localDurations(
  overrides: Record<string, number>,
  stampedAt: number
): Carried<number>[] {
  return Object.entries(overrides).map(([key, hours]) => ({
    key,
    clientUpdatedAt: stampedAt,
    value: hours,
  }));
}

export function remoteDurations(rows: DurationRow[]): Carried<number>[] {
  return rows.map((row) => ({
    key: String(row.game_id),
    clientUpdatedAt: new Date(row.client_updated_at).getTime(),
    deleted: row.deleted_at != null,
    value: row.deleted_at != null ? undefined : row.hours,
  }));
}

export function durationsUpload(carried: Carried<number>[]): DurationRow[] {
  return carried.map((row) => ({
    game_id: Number(row.key),
    hours: row.value ?? 0,
    source: 'you',
    client_updated_at: toStamp(row.clientUpdatedAt),
    deleted_at: row.value == null ? toStamp(row.clientUpdatedAt) : null,
  }));
}

export function applyDurations(
  merged: Carried<number>[]
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const row of merged) {
    if (typeof row.value === 'number' && row.value > 0)
      next[row.key] = row.value;
  }
  return next;
}

/* -------------------------------------------------------- preferences */

export interface Preferences {
  pace?: number;
  planWindow?: string | null;
  steam?: unknown;
  /**
   * When this device last changed any of them, epoch ms.
   *
   * Preferences are one row rather than a set, so they need no merge —
   * but they need the same last-write-wins, and that needs a stamp.
   */
  updatedAt?: number;
}

export interface PreferencesRow {
  pace: number | null;
  plan_window: string | null;
  steam: unknown;
  client_updated_at: string;
}

export const preferencesUpload = (
  prefs: Preferences,
  stampedAt: number
): PreferencesRow => ({
  pace: prefs.pace ?? null,
  plan_window: prefs.planWindow ?? null,
  steam: prefs.steam ?? null,
  client_updated_at: toStamp(stampedAt),
});

export const preferencesDownload = (row: PreferencesRow): Preferences => ({
  pace: row.pace ?? undefined,
  planWindow: row.plan_window,
  steam: row.steam,
});
