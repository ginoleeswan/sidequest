import {
  NO_CURSORS,
  syncOnce,
  type Stamped,
  type SyncBackend,
  type SyncState,
} from '../engine';
import { SyncError } from '../errors';
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

  describe('a library too big for one statement', () => {
    // The asymmetry that was a real bug: the pull has been paged since
    // it was written, the push was not. CSV import has no cap on it, so
    // a long backlog went up as a single upsert — over the request size
    // limit, refused for a reason that is not a constraint violation,
    // and therefore retried forever.
    const shelf = (count: number) =>
      Object.fromEntries(
        Array.from({ length: count }, (_, i) => [
          String(i + 1),
          entry({ game: game(i + 1, `Game ${i + 1}`) }),
        ])
      );

    it('sends a long backlog in statements the server will take', async () => {
      const { backend, calls } = fakeBackend();
      const result = await syncOnce(backend, state({ entries: shelf(1000) }));
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.pushed).toBe(1000);
      expect(calls.library.length).toBeGreaterThan(1);
      for (const batch of calls.library) {
        expect(batch.length).toBeLessThanOrEqual(200);
      }
      // Every row, once, across the batches.
      const ids = calls.library.flat().map((row) => row.game_id);
      expect(new Set(ids).size).toBe(1000);
    });

    it('chunks the games cache too', async () => {
      const { backend, calls } = fakeBackend();
      await syncOnce(backend, state({ entries: shelf(500) }));
      expect(calls.games.length).toBeGreaterThan(1);
      for (const batch of calls.games) {
        expect(batch.length).toBeLessThanOrEqual(200);
      }
    });

    it('still finds one bad row in a long backlog', async () => {
      const { backend } = fakeBackend({
        pushLibrary: async (rows) => {
          if (rows.some((row) => row.game_id === 777)) {
            throw new SyncError('refused', '23514');
          }
        },
      });
      const result = await syncOnce(backend, state({ entries: shelf(1000) }));
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.stuck.map((s) => s.key)).toEqual(['777']);
      expect(result.pushed).toBe(999);
    });

    it('a network failure part way through changes nothing', async () => {
      // Earlier chunks are already on the server, which is safe rather
      // than merely tolerable: the upserts are idempotent and `known`
      // does not move for a round that did not finish, so the next
      // round sends them again and reaches the same place.
      let batches = 0;
      const { backend } = fakeBackend({
        pushLibrary: async () => {
          batches += 1;
          if (batches === 3) throw new SyncError('connection reset', '08006');
        },
      });
      const before = state({ entries: shelf(1000) });
      const result = await syncOnce(backend, before);
      expect(result.ok).toBe(false);
      expect(before.cursors).toEqual(NO_CURSORS);
      expect(Object.keys(before.entries)).toHaveLength(1000);
    });
  });

  describe('a row the server will never accept', () => {
    // The failure this exists for: a round is one statement per table,
    // so without it a single impossible value stops every other game
    // the person owns from ever reaching their account — permanently,
    // and with no way for them to tell which game did it.
    const refuse = (bad: number) => async (rows: LibraryRow[]) => {
      if (rows.some((row) => row.game_id === bad)) {
        throw new SyncError(
          'new row violates check constraint "library_entries_want_check"',
          '23514'
        );
      }
    };

    const shelf = (...ids: number[]) =>
      Object.fromEntries(
        ids.map((id) => [String(id), entry({ game: game(id, `Game ${id}`) })])
      );

    it('places the rest of the shelf and names the one that failed', async () => {
      const { backend } = fakeBackend({ pushLibrary: refuse(3) });
      const result = await syncOnce(
        backend,
        state({ entries: shelf(1, 2, 3, 4) })
      );
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.pushed).toBe(3);
      expect(result.stuck).toEqual([
        { key: '3', reason: expect.stringContaining('check constraint') },
      ]);
    });

    it('finds several bad rows in one batch', async () => {
      const { backend } = fakeBackend({
        pushLibrary: async (rows) => {
          if (rows.some((row) => row.game_id === 2 || row.game_id === 5)) {
            throw new SyncError('refused', '23514');
          }
        },
      });
      const result = await syncOnce(
        backend,
        state({ entries: shelf(1, 2, 3, 4, 5, 6) })
      );
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.stuck.map((s) => s.key).sort()).toEqual(['2', '5']);
      expect(result.pushed).toBe(4);
    });

    it('bisects rather than trying every row on its own', async () => {
      // Six round trips for one bad row in five hundred, not five
      // hundred. The whole batch first, then halves.
      let attempts = 0;
      const { backend } = fakeBackend({
        pushLibrary: async (rows) => {
          attempts += 1;
          if (rows.some((row) => row.game_id === 40)) {
            throw new SyncError('refused', '23514');
          }
        },
      });
      const ids = Array.from({ length: 64 }, (_, i) => i + 1);
      const result = await syncOnce(backend, state({ entries: shelf(...ids) }));
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.stuck).toHaveLength(1);
      expect(attempts).toBeLessThan(20);
    });

    it('does not offer a refused row again until it changes', async () => {
      const first = fakeBackend({ pushLibrary: refuse(3) });
      const one = await syncOnce(
        first.backend,
        state({ entries: shelf(1, 3) })
      );
      if (!one.ok) throw new Error('expected a finished round');
      expect(one.state.quarantine?.library['3']).toBeTruthy();

      // A second round with the same data: game 3 is not sent at all,
      // so a permanently bad row costs one request, once.
      const second = fakeBackend({ pushLibrary: refuse(3) });
      const two = await syncOnce(second.backend, {
        ...one.state,
        entries: shelf(1, 3),
      });
      if (!two.ok) throw new Error('expected a finished round');
      expect(second.calls.library).toHaveLength(0);
      expect(two.state.quarantine?.library['3']).toBeTruthy();
    });

    it('tries again the moment the person edits it', async () => {
      const first = fakeBackend({ pushLibrary: refuse(3) });
      const one = await syncOnce(
        first.backend,
        state({ entries: shelf(1, 3) })
      );
      if (!one.ok) throw new Error('expected a finished round');

      // Editing the entry restamps it, which is the retry: the only
      // thing that can clear a refusal is the row becoming different.
      const fixed = fakeBackend();
      const two = await syncOnce(fixed.backend, {
        ...one.state,
        entries: {
          ...shelf(1),
          '3': entry({ game: game(3, 'Game 3'), updatedAt: 1_900_000_000_000 }),
        },
      });
      if (!two.ok) throw new Error('expected a finished round');
      expect(fixed.calls.library[0].map((row) => row.game_id)).toEqual([3]);
      expect(two.state.quarantine?.library['3']).toBeUndefined();
      expect(two.stuck).toEqual([]);
    });

    it('a refused row is never recorded as landed', async () => {
      // If it were, `pendingPush` would filter it out on the next round
      // and the row would be lost to the server for good.
      const { backend } = fakeBackend({ pushLibrary: refuse(3) });
      const result = await syncOnce(backend, state({ entries: shelf(1, 3) }));
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.state.known?.library['1']).toBeTruthy();
      expect(result.state.known?.library['3']).toBeUndefined();
    });

    it('quarantines a duration the server refuses, on its hours', async () => {
      const { backend } = fakeBackend({
        pushDurations: async (rows) => {
          if (rows.some((row) => row.hours > 1000)) {
            throw new SyncError('refused', '22003');
          }
        },
      });
      const result = await syncOnce(
        backend,
        state({ durations: { '1': 30, '2': 99_999 } }),
        1_800_000_000_000
      );
      if (!result.ok) throw new Error('expected a finished round');
      expect(result.stuck.map((s) => s.key)).toEqual(['2']);
      expect(result.state.quarantine?.durations['2']?.fingerprint).toBe(99_999);
    });

    it('leaves a dropped connection alone instead of bisecting it', async () => {
      // Splitting a batch because the network died turns one failed
      // request into a storm of them, and the round should simply end.
      let attempts = 0;
      const { backend } = fakeBackend({
        pushLibrary: async () => {
          attempts += 1;
          throw new SyncError('connection reset', '08006');
        },
      });
      const result = await syncOnce(
        backend,
        state({ entries: shelf(1, 2, 3, 4) })
      );
      expect(result.ok).toBe(false);
      expect(attempts).toBe(1);
    });

    it('treats an error with no code as the moment, not the row', async () => {
      const { backend } = fakeBackend({
        pushLibrary: async () => {
          throw new Error('fetch failed');
        },
      });
      const result = await syncOnce(backend, state({ entries: shelf(1) }));
      expect(result.ok).toBe(false);
    });

    it('one unusable game does not cost the shelf its cache row', async () => {
      const cached: number[] = [];
      const { backend } = fakeBackend({
        pushGames: async (rows) => {
          if (rows.some((row) => row.id === 2)) {
            throw new SyncError('invalid input syntax for type date', '22P02');
          }
          cached.push(...rows.map((row) => row.id));
        },
      });
      const result = await syncOnce(
        backend,
        state({ entries: shelf(1, 2, 3) })
      );
      expect(result.ok).toBe(true);
      // Games 1 and 3 still reach the shared cache.
      expect(cached).toContain(1);
      expect(cached).toContain(3);
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
