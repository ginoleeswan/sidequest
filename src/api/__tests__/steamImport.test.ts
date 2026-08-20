import { importSteamGames } from '../steamImport';
import type { SteamGame } from '@/lib/steamMatch';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;

const steam = (appid: number, name: string, minutes = 60): SteamGame => ({
  appid,
  name,
  minutesForever: minutes,
  minutes2Weeks: 0,
});

/** RAWG answers with whatever the fixture says for that query. */
let results: Record<string, { id: number; name: string }[]>;
let failFor: string | null;

beforeAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const query = url.searchParams.get('search') ?? '';
    if (failFor && query.includes(failFor.toLowerCase()))
      return new Response('nope', { status: 500 });
    return new Response(
      JSON.stringify({
        count: 0,
        next: null,
        results: results[query] ?? [],
      })
    );
  }) as unknown as typeof fetch;
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  failFor = null;
  results = {
    'hades ii': [
      { id: 1, name: 'Hades II: Prologue' },
      { id: 2, name: 'Hades 2' },
    ],
    celeste: [{ id: 3, name: 'Celeste' }],
    'some bundle filler': [{ id: 4, name: 'Something Else Entirely' }],
  };
});

/**
 * The import is the wedge: a person connects Steam and their real
 * library arrives. What it must never do is arrive wrong — a mismatched
 * game carries the wrong length into the plan, and nobody would ever
 * notice.
 */
describe('importing a Steam library', () => {
  it('matches what it can and names what it cannot', async () => {
    const result = await importSteamGames([
      steam(1, 'Hades II', 600),
      steam(2, 'Celeste', 120),
      steam(3, 'Some Bundle Filler', 0),
    ]);
    expect(result.matched.map((m) => m.game.id)).toEqual([2, 3]);
    expect(result.unmatched.map((u) => u.name)).toEqual(['Some Bundle Filler']);
  });

  it('carries the hours across', async () => {
    const result = await importSteamGames([steam(1, 'Celeste', 90)]);
    expect(result.matched[0].hoursPlayed).toBe(1.5);
  });

  it('treats a failed lookup as unmatched rather than losing the game', async () => {
    failFor = 'celeste';
    const result = await importSteamGames([steam(2, 'Celeste', 120)]);
    expect(result.matched).toEqual([]);
    expect(result.unmatched.map((u) => u.name)).toEqual(['Celeste']);
  });

  it('counts up as it goes, once per game', async () => {
    const seen: number[] = [];
    const games = [
      steam(1, 'Hades II'),
      steam(2, 'Celeste'),
      steam(3, 'Some Bundle Filler'),
    ];
    await importSteamGames(games, (done, total) => {
      expect(total).toBe(3);
      seen.push(done);
    });
    expect(seen.sort()).toEqual([1, 2, 3]);
  });

  it('returns the most-played first, whatever order the lookups finished in', async () => {
    const result = await importSteamGames([
      steam(2, 'Celeste', 120),
      steam(1, 'Hades II', 600),
    ]);
    expect(result.matched.map((m) => m.game.name)).toEqual([
      'Hades 2',
      'Celeste',
    ]);
  });

  it('does nothing at all with an empty selection', async () => {
    const result = await importSteamGames([]);
    expect(result).toEqual({ matched: [], unmatched: [] });
  });
});
