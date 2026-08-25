import type { Stamped, SyncBackend } from './engine';
import { SyncError } from './errors';
import type { DurationRow, LibraryRow, PreferencesRow } from './shape';
import { getSupabase } from '../supabase';

/**
 * The engine's interface, spoken to Postgres.
 *
 * Everything here is a query and a thrown error; nothing here decides
 * anything. `user_id` is stamped on every write rather than trusted
 * from the row, and row-level security enforces the same thing again on
 * the server — the client is not the security boundary, it is just
 * being consistent with one.
 *
 * Errors are thrown rather than returned, because `syncOnce` is the one
 * place that decides what a failure means and it already catches.
 */

/**
 * The client, awaited per call rather than held at module scope.
 *
 * supabase-js is a dynamic import now, so this module cannot have a
 * client at import time — and should not want one. A sync round is
 * already asynchronous, the promise is memoised, and by the time a
 * round runs the download has almost always happened for the sign-in
 * that made the round possible.
 */

const rethrow = (error: { message: string; code?: string } | null) => {
  // The code travels with the message. Without it the engine cannot
  // tell a row Postgres will never accept from a network that dropped,
  // and it has to treat both the same way — which means either
  // discarding good data or retrying bad data forever.
  if (error) throw new SyncError(error.message, error.code);
};

/**
 * A page size, and the reason there is one.
 *
 * A first sync on an account with years of history would otherwise ask
 * for all of it in one statement. The cursor makes paging free: a
 * truncated page simply leaves the rest for the next round, which the
 * next round asks for from where this one stopped.
 */
const PAGE = 500;

export function supabaseBackend(userId: string): SyncBackend {
  return {
    async pullLibrary(since) {
      const db = await getSupabase();
      let query = db
        .from('library_entries')
        .select(
          'game_id,status,added_at,finished_at,hours_played,steam_app_id,deadline,want,note,rating,tags,client_updated_at,deleted_at,updated_at'
        )
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .limit(PAGE);
      if (since) query = query.gt('updated_at', since);
      const { data, error } = await query;
      rethrow(error);
      return (data ?? []) as Stamped<LibraryRow>[];
    },

    async pullDurations(since) {
      const db = await getSupabase();
      let query = db
        .from('game_durations')
        .select('game_id,hours,source,client_updated_at,deleted_at,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .limit(PAGE);
      if (since) query = query.gt('updated_at', since);
      const { data, error } = await query;
      rethrow(error);
      return (data ?? []) as Stamped<DurationRow>[];
    },

    async pullPreferences() {
      const db = await getSupabase();
      const { data, error } = await db
        .from('preferences')
        .select('pace,plan_window,steam,client_updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      rethrow(error);
      return (data ?? null) as PreferencesRow | null;
    },

    async pushGames(rows) {
      // The shared public cache. `ignoreDuplicates` because a row that
      // is already there is already right — this table is RAWG's data,
      // not anybody's, and a second device re-uploading it changes
      // nothing worth a write.
      const db = await getSupabase();
      const { error } = await db
        .from('games')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      rethrow(error);
    },

    async pushLibrary(rows) {
      const db = await getSupabase();
      const { error } = await db.from('library_entries').upsert(
        rows.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,game_id' }
      );
      rethrow(error);
    },

    async pushDurations(rows) {
      const db = await getSupabase();
      const { error } = await db.from('game_durations').upsert(
        rows.map((row) => ({ ...row, user_id: userId })),
        { onConflict: 'user_id,game_id' }
      );
      rethrow(error);
    },

    async pushPreferences(row) {
      const db = await getSupabase();
      const { error } = await db
        .from('preferences')
        .upsert({ ...row, user_id: userId }, { onConflict: 'user_id' });
      rethrow(error);
    },
  };
}
