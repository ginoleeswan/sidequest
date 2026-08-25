import { supabaseBackend } from '../supabaseBackend';
import { supabase } from '../../supabase';

/**
 * The half of sync that is only field names.
 *
 * There is no logic here worth testing and every mistake here is
 * expensive: a mistyped column, a forgotten `user_id`, an upsert whose
 * conflict target does not match the unique index — each fails at
 * runtime against a real project and nowhere else. So what this pins is
 * the shape of the statements: which table, which columns, scoped to
 * whom, and what a thrown Postgres error turns into.
 */

interface Call {
  table: string;
  select?: string;
  ops: [string, string, unknown?][];
  limit?: number;
  upsert?: unknown;
  options?: unknown;
}

const mockCalls: Call[] = [];
const mockResult: { data: unknown; error: { message: string } | null } = {
  data: null,
  error: null,
};

jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      const call: Call = { table, ops: [] };
      mockCalls.push(call);
      const settled = () =>
        Promise.resolve({ data: mockResult.data, error: mockResult.error });
      const builder: Record<string, unknown> = {
        select: (cols: string) => ((call.select = cols), builder),
        eq: (col: string, val: unknown) => (call.ops.push(['eq', col, val]), builder),
        gt: (col: string, val: unknown) => (call.ops.push(['gt', col, val]), builder),
        order: (col: string) => (call.ops.push(['order', col]), builder),
        limit: (n: number) => ((call.limit = n), builder),
        maybeSingle: settled,
        upsert: (rows: unknown, options: unknown) => {
          call.upsert = rows;
          call.options = options;
          return settled();
        },
        then: (ok: unknown, fail: unknown) =>
          settled().then(ok as never, fail as never),
      };
      return builder;
    }),
  },
}));

const backend = supabaseBackend('user-1');
const only = () => mockCalls[0];

beforeEach(() => {
  mockCalls.length = 0;
  mockResult.data = null;
  mockResult.error = null;
  (supabase.from as jest.Mock).mockClear();
});

describe('supabaseBackend', () => {
  describe('pulling', () => {
    it('asks for one person’s library, oldest change first', async () => {
      mockResult.data = [];
      await backend.pullLibrary(null);
      expect(only().table).toBe('library_entries');
      expect(only().ops).toContainEqual(['eq', 'user_id', 'user-1']);
      // Oldest first, so a truncated page leaves a usable cursor
      // behind rather than a hole in the middle of the history.
      expect(only().ops).toContainEqual(['order', 'updated_at']);
      expect(only().limit).toBe(500);
    });

    it('names every column the mappers read', async () => {
      // shape.ts reads these by name; a column missing from the select
      // arrives as undefined rather than as an error.
      mockResult.data = [];
      await backend.pullLibrary(null);
      for (const column of [
        'game_id',
        'status',
        'added_at',
        'finished_at',
        'hours_played',
        'steam_app_id',
        'deadline',
        'want',
        'note',
        'rating',
        'tags',
        'client_updated_at',
        'deleted_at',
        'updated_at',
      ]) {
        expect(only().select?.split(',')).toContain(column);
      }
    });

    it('asks only for what changed when it has a cursor', async () => {
      mockResult.data = [];
      await backend.pullLibrary('2026-01-01T00:00:00.000Z');
      expect(only().ops).toContainEqual([
        'gt',
        'updated_at',
        '2026-01-01T00:00:00.000Z',
      ]);
    });

    it('asks for everything when it has none', async () => {
      mockResult.data = [];
      await backend.pullDurations(null);
      expect(only().table).toBe('game_durations');
      expect(only().ops.some(([op]) => op === 'gt')).toBe(false);
    });

    it('reads an empty table as no rows rather than as null', async () => {
      mockResult.data = null;
      expect(await backend.pullLibrary(null)).toEqual([]);
      expect(await backend.pullDurations(null)).toEqual([]);
    });

    it('takes preferences as a single row, or none', async () => {
      mockResult.data = null;
      expect(await backend.pullPreferences()).toBeNull();
      expect(only().table).toBe('preferences');
      expect(only().ops).toContainEqual(['eq', 'user_id', 'user-1']);
    });
  });

  describe('pushing', () => {
    it('stamps the session’s user on every row it writes', async () => {
      // Never trusted from the row: row-level security enforces the
      // same thing server-side, and the two agreeing is the point.
      await backend.pushLibrary([{ game_id: 7 } as never]);
      expect(only().upsert).toEqual([{ game_id: 7, user_id: 'user-1' }]);
      expect(only().options).toEqual({ onConflict: 'user_id,game_id' });

      mockCalls.length = 0;
      await backend.pushDurations([{ game_id: 7 } as never]);
      expect(only().upsert).toEqual([{ game_id: 7, user_id: 'user-1' }]);
      expect(only().options).toEqual({ onConflict: 'user_id,game_id' });

      mockCalls.length = 0;
      await backend.pushPreferences({ pace: 6 } as never);
      expect(only().upsert).toEqual({ pace: 6, user_id: 'user-1' });
      expect(only().options).toEqual({ onConflict: 'user_id' });
    });

    it('leaves the shared games cache alone once a row is there', async () => {
      // That table is RAWG's data, not anybody's: a second device
      // re-uploading the same row changes nothing worth a write.
      await backend.pushGames([{ id: 7 } as never]);
      expect(only().table).toBe('games');
      expect(only().options).toEqual({
        onConflict: 'id',
        ignoreDuplicates: true,
      });
      // And no user_id — this row belongs to no one.
      expect(only().upsert).toEqual([{ id: 7 }]);
    });
  });

  describe('when Postgres refuses', () => {
    it.each([
      ['pullLibrary', () => backend.pullLibrary(null)],
      ['pullDurations', () => backend.pullDurations(null)],
      ['pullPreferences', () => backend.pullPreferences()],
      ['pushGames', () => backend.pushGames([])],
      ['pushLibrary', () => backend.pushLibrary([])],
      ['pushDurations', () => backend.pushDurations([])],
      ['pushPreferences', () => backend.pushPreferences({} as never)],
    ])('%s throws so syncOnce can decide what it means', async (_name, call) => {
      mockResult.error = { message: 'row level security' };
      await expect(call()).rejects.toThrow('row level security');
    });
  });
});
