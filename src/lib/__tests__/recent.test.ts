import type { Game } from '@/api/types';
import { clearRecent, readRecent, rememberGame } from '../recent';

const KEY = 'sidequest.recent.v1';
let store: Record<string, string>;

beforeAll(() => {
  store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => delete store[k],
    },
  });
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

const game = (id: number, name: string) =>
  ({ id, slug: name.toLowerCase(), name, background_image: null }) as Game;

/** A convenience, not a record — but it has to actually work. */
describe('games you just looked at', () => {
  it('starts empty and stays sane', () => {
    expect(readRecent()).toEqual([]);
  });

  it('remembers the last one first', () => {
    rememberGame(game(1, 'Celeste'), 1);
    rememberGame(game(2, 'Hades'), 2);
    expect(readRecent().map((g) => g.name)).toEqual(['Hades', 'Celeste']);
  });

  it('moves a revisit to the front rather than repeating it', () => {
    rememberGame(game(1, 'Celeste'), 1);
    rememberGame(game(2, 'Hades'), 2);
    rememberGame(game(1, 'Celeste'), 3);
    expect(readRecent().map((g) => g.id)).toEqual([1, 2]);
  });

  it('stays a rail rather than becoming a history', () => {
    for (let i = 0; i < 20; i++) rememberGame(game(i, `Game ${i}`), i);
    expect(readRecent()).toHaveLength(12);
  });

  it('ignores rubbish in storage instead of breaking a screen', () => {
    store[KEY] = JSON.stringify([{ nonsense: true }, { id: 5, name: 'Real' }]);
    expect(readRecent().map((g) => g.name)).toEqual(['Real']);
  });

  it('forgets everything on request', () => {
    rememberGame(game(1, 'Celeste'), 1);
    clearRecent();
    expect(readRecent()).toEqual([]);
  });
});
