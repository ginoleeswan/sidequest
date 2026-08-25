/**
 * Sync, against the real Postgres.
 *
 * Every other test in this folder runs against a backend I wrote
 * myself, which means they prove the engine is consistent with my
 * understanding of the database rather than with the database. That is
 * most of the value and none of the reassurance: an upsert whose
 * conflict target does not match the index, a policy that refuses the
 * anon role, a column that comes back with a different name — none of
 * those can fail against a fake.
 *
 * So this one signs in for real and drives a round through PostgREST,
 * twice, as two devices. It is excluded from `npm test` because it
 * needs credentials and a network, and a suite that silently skips is
 * worse than one that is not there. Run it deliberately:
 *
 *   SIDEQUEST_LIVE_URL=… SIDEQUEST_LIVE_KEY=… \
 *   SIDEQUEST_LIVE_EMAIL=… SIDEQUEST_LIVE_PASSWORD=… npm run test:live
 *
 * Use a throwaway account. It writes rows and then deletes them, but
 * it is still somebody's database.
 */

import { NO_CURSORS, syncOnce, type SyncState } from './engine';
import { supabaseBackend } from './supabaseBackend';
import { getSupabase } from '../supabase';
import type { LibraryEntry } from '../library';
import type { Game } from '@/api/types';

jest.mock('../supabase', () => {
  // A require, because a jest.mock factory is hoisted above the
  // imports and cannot use them — and because the real module reaches
  // for react-native's Platform and this suite runs on plain Node,
  // where that would not transform. The client is built here so it
  // reads the environment at run time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(
    process.env.SIDEQUEST_LIVE_URL ?? '',
    process.env.SIDEQUEST_LIVE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return {
    authConfigured: true,
    getSupabase: async () => client,
    hasStoredSession: () => true,
    isAuthCallback: () => false,
  };
});

/** The same client the backend gets, for reading rows back directly. */
const db = async () => await getSupabase();

jest.setTimeout(120_000);

/**
 * Ids well outside anything RAWG will ever mint.
 *
 * `games` is a shared cache with no delete policy, so a row left behind
 * here is a row every other account can see. High, obviously synthetic
 * ids make the leftovers findable if a run dies half way.
 */
const BASE = 990_000;

const game = (n: number): Game =>
  ({
    id: BASE + n,
    name: `Sync Probe ${n}`,
    slug: `sync-probe-${n}`,
    background_image: null,
  }) as unknown as Game;

const entry = (n: number, over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  game: game(n),
  status: 'playing',
  addedAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  ...over,
});

const state = (over: Partial<SyncState> = {}): SyncState => ({
  entries: {},
  durations: {},
  preferences: {},
  cursors: NO_CURSORS,
  ...over,
});

let userId = '';
let backend: ReturnType<typeof supabaseBackend>;

beforeAll(async () => {
  const { data, error } = await (
    await db()
  ).auth.signInWithPassword({
    email: process.env.SIDEQUEST_LIVE_EMAIL ?? '',
    password: process.env.SIDEQUEST_LIVE_PASSWORD ?? '',
  });
  if (error) throw new Error(`could not sign in: ${error.message}`);
  userId = data.user!.id;
  backend = supabaseBackend(userId);

  // A previous run that died half way would otherwise be indis-
  // tinguishable from a bug in this one.
  await (await db()).from('library_entries').delete().eq('user_id', userId);
  await (await db()).from('game_durations').delete().eq('user_id', userId);
  await (await db()).from('preferences').delete().eq('user_id', userId);
});

afterAll(async () => {
  if (!userId) return;
  await (await db()).from('library_entries').delete().eq('user_id', userId);
  await (await db()).from('game_durations').delete().eq('user_id', userId);
  await (await db()).from('preferences').delete().eq('user_id', userId);
  await (await db()).auth.signOut();
});

describe('a round against the real database', () => {
  it('puts a device’s library on the account', async () => {
    const result = await syncOnce(
      backend,
      state({
        entries: {
          [String(BASE + 1)]: entry(1, { note: 'a note', rating: 4 }),
          [String(BASE + 2)]: entry(2, { status: 'wishlist' }),
          [String(BASE + 3)]: entry(3, { status: 'finished', want: 3 }),
        },
        durations: { [String(BASE + 1)]: 30 },
        preferences: { pace: 6, updatedAt: 1_800_000_000_000 },
      })
    );
    if (!result.ok) throw new Error(`round failed: ${result.reason}`);
    expect(result.pushed).toBe(4);
    expect(result.stuck).toEqual([]);

    // Read it back the way any client would, not through the engine.
    const { data } = await (
      await db()
    )
      .from('library_entries')
      .select('game_id,status,note,rating,client_updated_at,updated_at')
      .eq('user_id', userId)
      .order('game_id');
    expect(data).toHaveLength(3);
    expect(data![0].note).toBe('a note');
    expect(data![0].rating).toBe(4);
    // The trigger has to have run: without a server-side updated_at the
    // cursor can never see this row again.
    expect(data![0].updated_at).toBeTruthy();
  });

  it('a second device signing in gets all of it', async () => {
    const fresh = await syncOnce(backend, state());
    if (!fresh.ok) throw new Error(`round failed: ${fresh.reason}`);
    expect(Object.keys(fresh.state.entries).sort()).toEqual(
      [BASE + 1, BASE + 2, BASE + 3].map(String)
    );
    expect(fresh.state.entries[String(BASE + 1)].note).toBe('a note');
    expect(fresh.state.durations[String(BASE + 1)]).toBe(30);
    expect(fresh.state.preferences.pace).toBe(6);
    // And the cursor moved, so the next round asks for less.
    expect(fresh.state.cursors.library).toBeTruthy();
  });

  it('the later edit wins, whichever device made it', async () => {
    const later = await syncOnce(
      backend,
      state({
        entries: {
          [String(BASE + 1)]: entry(1, {
            status: 'finished',
            note: 'edited on the phone',
            updatedAt: 1_900_000_000_000,
          }),
        },
      })
    );
    if (!later.ok) throw new Error(`round failed: ${later.reason}`);

    const other = await syncOnce(backend, state());
    if (!other.ok) throw new Error(`round failed: ${other.reason}`);
    expect(other.state.entries[String(BASE + 1)].status).toBe('finished');
    expect(other.state.entries[String(BASE + 1)].note).toBe(
      'edited on the phone'
    );
  });

  it('a delete on one device reaches the other', async () => {
    // The case that cannot work without the record of what the server
    // holds: removing a game drops the key, leaving nothing to compare.
    const held = await syncOnce(backend, state());
    if (!held.ok) throw new Error(`round failed: ${held.reason}`);

    const after = await syncOnce(backend, {
      ...held.state,
      entries: Object.fromEntries(
        Object.entries(held.state.entries).filter(
          ([key]) => key !== String(BASE + 2)
        )
      ),
    });
    if (!after.ok) throw new Error(`round failed: ${after.reason}`);

    const { data } = await (
      await db()
    )
      .from('library_entries')
      .select('game_id,deleted_at')
      .eq('user_id', userId)
      .eq('game_id', BASE + 2)
      .maybeSingle();
    expect(data?.deleted_at).toBeTruthy();

    const other = await syncOnce(backend, state());
    if (!other.ok) throw new Error(`round failed: ${other.reason}`);
    expect(other.state.entries[String(BASE + 2)]).toBeUndefined();
  });

  it('a row Postgres refuses costs only that row', async () => {
    // want has a 1-to-3 check on it. setWant clamps, so this is the
    // shape of a bug that has not happened yet — which is exactly what
    // the quarantine is for.
    const poisoned = entry(4, { want: 9 as number });
    const result = await syncOnce(
      backend,
      state({
        entries: {
          [String(BASE + 4)]: poisoned,
          [String(BASE + 5)]: entry(5),
        },
      })
    );
    if (!result.ok) throw new Error(`round failed: ${result.reason}`);
    expect(result.stuck.map((s) => s.key)).toEqual([String(BASE + 4)]);
    expect(result.stuck[0].reason).toMatch(/want/i);
    // And the innocent one still landed.
    const { data } = await (
      await db()
    )
      .from('library_entries')
      .select('game_id')
      .eq('user_id', userId)
      .eq('game_id', BASE + 5)
      .maybeSingle();
    expect(data?.game_id).toBe(BASE + 5);
  });

  it('says nothing to the server when nothing changed', async () => {
    const settled = await syncOnce(backend, state());
    if (!settled.ok) throw new Error(`round failed: ${settled.reason}`);
    const again = await syncOnce(backend, settled.state);
    if (!again.ok) throw new Error(`round failed: ${again.reason}`);
    // The whole point of the known map: a quiet round is a quiet round.
    expect(again.pushed).toBe(0);
    expect(again.pulled).toBe(0);
  });
});
