import {
  NO_CURSORS,
  syncOnce,
  type Stamped,
  type SyncBackend,
  type SyncState,
} from '../engine';
import { toStamp, type DurationRow, type LibraryRow } from '../shape';
import type { LibraryEntry } from '../../library';
import type { Game } from '@/api/types';

/**
 * A round of sync, against a backend that is a plain object.
 *
 * The engine's job is sequencing and failure: the decisions belong to
 * merge.ts and the field names to shape.ts, both tested on their own.
 * So what is pinned here is the order things happen in, what the cursor
 * does, and — the part that matters most — that a round which fails
 * changes nothing at all.
 */

const game = (id = 42, name = 'Hades'): Game =>
  ({ id, name, slug: 'hades', background_image: null }) as unknown as Game;

const entry = (over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  game: game(),
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

interface Calls {
  games: unknown[][];
  library: LibraryRow[][];
  durations: DurationRow[][];
  preferences: unknown[];
  pulledSince: (string | null)[];
}

function fakeBackend(over: Partial<SyncBackend> = {}) {
  const calls: Calls = {
    games: [],
    library: [],
    durations: [],
    preferences: [],
    pulledSince: [],
  };
  const order: string[] = [];
  const backend: SyncBackend = {
    pullLibrary: async (since) => {
      order.push('pullLibrary');
      calls.pulledSince.push(since);
      return [];
    },
    pullDurations: async () => {
      order.push('pullDurations');
      return [];
    },
    pullPreferences: async () => {
      order.push('pullPreferences');
      return null;
    },
    pushGames: async (rows) => {
      order.push('pushGames');
      calls.games.push(rows);
    },
    pushLibrary: async (rows) => {
      order.push('pushLibrary');
      calls.library.push(rows);
    },
    pushDurations: async (rows) => {
      order.push('pushDurations');
      calls.durations.push(rows);
    },
    pushPreferences: async (row) => {
      order.push('pushPreferences');
      calls.preferences.push(row);
    },
    ...over,
  };
  return { backend, calls, order };
}

const pulledEntry = (over: Partial<Stamped<LibraryRow>> = {}) =>
  ({
    game_id: 7,
    status: 'wishlist',
    added_at: toStamp(1_700_000_000_000),
    finished_at: null,
    hours_played: null,
    steam_app_id: null,
    deadline: null,
    want: null,
    note: null,
    rating: null,
    tags: null,
    client_updated_at: toStamp(1_800_000_000_000),
    deleted_at: null,
    updated_at: '2026-02-01T00:00:00.000Z',
    ...over,
  }) as Stamped<LibraryRow>;

describe('syncOnce', () => {
  it('pushes a local library up to an empty account', async () => {
    const { backend, calls } = fakeBackend();
    const result = await syncOnce(
      backend,
      state({ entries: { '42': entry() } })
    );
    expect(result.ok).toBe(true);
    expect(calls.library[0]).toHaveLength(1);
    expect(calls.library[0][0].game_id).toBe(42);
  });

  it('names the games before it references them', async () => {
    // library_entries.game_id is a foreign key: pushing an entry for a
    // game the table has never heard of fails the whole batch.
    const { backend, order } = fakeBackend();
    await syncOnce(backend, state({ entries: { '42': entry() } }));
    expect(order.indexOf('pushGames')).toBeLessThan(
      order.indexOf('pushLibrary')
    );
  });

  it('adopts what a fresh device pulls', async () => {
    const { backend } = fakeBackend({
      pullLibrary: async () => [pulledEntry()],
    });
    const result = await syncOnce(backend, state());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.state.entries)).toEqual(['7']);
  });

  it('moves the cursor to the newest row it saw, and no further', async () => {
    const { backend } = fakeBackend({
      pullLibrary: async () => [
        pulledEntry({ updated_at: '2026-01-01T00:00:00.000Z' }),
        pulledEntry({ game_id: 8, updated_at: '2026-03-01T00:00:00.000Z' }),
      ],
    });
    const result = await syncOnce(backend, state());
    if (!result.ok) throw new Error('expected a finished round');
    expect(result.state.cursors.library).toBe('2026-03-01T00:00:00.000Z');
  });

  it('asks only for what changed since last time', async () => {
    const { backend, calls } = fakeBackend();
    await syncOnce(
      backend,
      state({
        cursors: { library: '2026-01-01T00:00:00.000Z', durations: null },
      })
    );
    expect(calls.pulledSince[0]).toBe('2026-01-01T00:00:00.000Z');
  });

  it('says nothing to the server when there is nothing to say', async () => {
    const { backend, calls } = fakeBackend();
    await syncOnce(backend, state());
    expect(calls.library).toHaveLength(0);
    expect(calls.durations).toHaveLength(0);
    expect(calls.games).toHaveLength(0);
  });

  it('takes newer preferences and pushes older ones', async () => {
    const theirs = {
      pace: 12,
      plan_window: '8w',
      steam: null,
      client_updated_at: toStamp(1_900_000_000_000),
    };
    const fresher = fakeBackend({ pullPreferences: async () => theirs });
    const adopted = await syncOnce(
      fresher.backend,
      state({ preferences: { pace: 6, updatedAt: 1_700_000_000_000 } })
    );
    if (!adopted.ok) throw new Error('expected a finished round');
    expect(adopted.state.preferences.pace).toBe(12);
    expect(fresher.calls.preferences).toHaveLength(0);

    const staler = fakeBackend({ pullPreferences: async () => theirs });
    const kept = await syncOnce(
      staler.backend,
      state({ preferences: { pace: 6, updatedAt: 2_000_000_000_000 } })
    );
    if (!kept.ok) throw new Error('expected a finished round');
    expect(kept.state.preferences.pace).toBe(6);
    expect(staler.calls.preferences).toHaveLength(1);
  });

  it('counts what actually moved', async () => {
    const { backend } = fakeBackend({
      pullLibrary: async () => [pulledEntry()],
    });
    const result = await syncOnce(
      backend,
      state({ entries: { '42': entry() } })
    );
    if (!result.ok) throw new Error('expected a finished round');
    expect(result.pulled).toBe(1);
    expect(result.pushed).toBe(1);
  });

  describe('when it cannot finish', () => {
    it('is an ordinary answer, not a thrown error', async () => {
      const { backend } = fakeBackend({
        pullLibrary: async () => {
          throw new Error('offline');
        },
      });
      const result = await syncOnce(
        backend,
        state({ entries: { '42': entry() } })
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('offline');
    });

    it('leaves the cursor exactly where it was', async () => {
      // The round is re-run next time. That is safe because the merge
      // is idempotent — but only if the cursor did not move past rows
      // that were pulled and never applied.
      const held = { library: '2026-01-01T00:00:00.000Z', durations: null };
      const { backend } = fakeBackend({
        pullDurations: async () => {
          throw new Error('dropped halfway');
        },
      });
      const before = state({ entries: { '42': entry() }, cursors: held });
      const result = await syncOnce(backend, before);
      expect(result.ok).toBe(false);
      // Nothing about the local state was handed back to be adopted.
      expect(before.cursors).toEqual(held);
      expect(before.entries['42']).toBeTruthy();
    });

    it('survives a push that the server rejects', async () => {
      const { backend } = fakeBackend({
        pushLibrary: async () => {
          throw new Error('row level security');
        },
      });
      const result = await syncOnce(
        backend,
        state({ entries: { '42': entry() } })
      );
      expect(result.ok).toBe(false);
    });
  });

  it('says nothing about durations when neither side has any', async () => {
    const { backend, calls } = fakeBackend();
    await syncOnce(backend, state());
    expect(calls.durations).toHaveLength(0);
  });

  it('pushes a local correction the server has never seen', async () => {
    const { backend, calls } = fakeBackend();
    const result = await syncOnce(
      backend,
      state({ durations: { '42': 30 } }),
      1_800_000_000_000
    );
    expect(result.ok).toBe(true);
    expect(calls.durations[0]).toHaveLength(1);
    expect(calls.durations[0][0]).toMatchObject({ game_id: 42, hours: 30 });
  });

  describe('what the server is known to hold', () => {
    it('does not re-push a library the server already has', async () => {
      // The loop this closes: a pull is a patch, so every row it does
      // not mention looks unknown to the server. Without a record of
      // what landed, the whole library re-uploads on every change.
      const first = fakeBackend();
      const before = state({ entries: { '42': entry() } });
      const one = await syncOnce(first.backend, before);
      if (!one.ok) throw new Error('expected a finished round');
      expect(first.calls.library[0]).toHaveLength(1);

      const second = fakeBackend();
      const two = await syncOnce(second.backend, { ...before, ...one.state });
      expect(two.ok).toBe(true);
      expect(second.calls.library).toHaveLength(0);
    });

    it('re-pushes an entry the device has since edited', async () => {
      const first = fakeBackend();
      const one = await syncOnce(
        first.backend,
        state({ entries: { '42': entry() } })
      );
      if (!one.ok) throw new Error('expected a finished round');

      const second = fakeBackend();
      await syncOnce(second.backend, {
        ...one.state,
        entries: {
          '42': entry({ status: 'finished', updatedAt: 1_900_000_000_000 }),
        },
      });
      expect(second.calls.library[0]).toHaveLength(1);
      expect(second.calls.library[0][0].status).toBe('finished');
    });

    it('notices a game that left the device and tombstones it', async () => {
      // Deleting a game drops the key from the local store, so there is
      // nothing left for the merge to compare. The record of the last
      // round is the only thing that can tell the other device.
      const first = fakeBackend();
      const one = await syncOnce(
        first.backend,
        state({ entries: { '42': entry() } })
      );
      if (!one.ok) throw new Error('expected a finished round');

      const second = fakeBackend();
      const two = await syncOnce(
        second.backend,
        { ...one.state, entries: {} },
        1_900_000_000_000
      );
      expect(two.ok).toBe(true);
      expect(second.calls.library[0]).toHaveLength(1);
      expect(second.calls.library[0][0]).toMatchObject({
        game_id: 42,
        deleted_at: toStamp(1_900_000_000_000),
      });
    });

    it('does not re-push an unchanged duration, whatever the clock says', async () => {
      // Corrections are stamped with the moment of the sync, which is
      // different every round; the hours are what either changed or did
      // not.
      const first = fakeBackend();
      const one = await syncOnce(
        first.backend,
        state({ durations: { '42': 30 } }),
        1_800_000_000_000
      );
      if (!one.ok) throw new Error('expected a finished round');
      expect(first.calls.durations[0]).toHaveLength(1);

      const second = fakeBackend();
      await syncOnce(
        second.backend,
        { ...one.state, durations: { '42': 30 } },
        1_900_000_000_000
      );
      expect(second.calls.durations).toHaveLength(0);

      const third = fakeBackend();
      await syncOnce(
        third.backend,
        { ...one.state, durations: { '42': 31 } },
        1_900_000_000_000
      );
      expect(third.calls.durations[0]).toHaveLength(1);
    });

    it('a failed round does not record anything as landed', async () => {
      const { backend } = fakeBackend({
        pushLibrary: async () => {
          throw new Error('row level security');
        },
      });
      const result = await syncOnce(
        backend,
        state({ entries: { '42': entry() } })
      );
      expect(result.ok).toBe(false);

      // The next round, against a backend that works, still sends it.
      const retry = fakeBackend();
      const again = await syncOnce(
        retry.backend,
        state({ entries: { '42': entry() } })
      );
      expect(again.ok).toBe(true);
      expect(retry.calls.library[0]).toHaveLength(1);
    });
  });

  it('pushes a corrected duration and adopts a newer one', async () => {
    const pulled: Stamped<DurationRow> = {
      game_id: 42,
      hours: 55,
      source: 'you',
      client_updated_at: toStamp(1_900_000_000_000),
      deleted_at: null,
      updated_at: '2026-04-01T00:00:00.000Z',
    };
    const { backend } = fakeBackend({ pullDurations: async () => [pulled] });
    const result = await syncOnce(
      backend,
      state({ durations: { '42': 30 } }),
      1_800_000_000_000
    );
    if (!result.ok) throw new Error('expected a finished round');
    expect(result.state.durations['42']).toBe(55);
  });
});
