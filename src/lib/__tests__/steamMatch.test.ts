import type { Game } from '@/api/types';
import {
  bestMatch,
  hoursOf,
  importOrder,
  isSameGame,
  normalizeTitle,
  progressForLibrary,
  type SteamGame,
} from '../steamMatch';

const steam = (
  appid: number,
  name: string,
  minutesForever = 0,
  minutes2Weeks = 0
): SteamGame => ({ appid, name, minutesForever, minutes2Weeks });

const game = (id: number, name: string) => ({ id, name }) as Game;

/**
 * A wrong match is worse than no match: it puts one game's length on
 * another and the plan quietly schedules a lie. These tests are mostly
 * about what must NOT match.
 */
describe('normalising a title', () => {
  it('ignores decoration a storefront adds', () => {
    expect(normalizeTitle('Hades™')).toBe('hades');
    expect(normalizeTitle('DOOM®')).toBe('doom');
  });

  it('ignores edition suffixes', () => {
    expect(normalizeTitle('Skyrim Special Edition')).toBe(
      normalizeTitle('Skyrim Special Edition')
    );
    expect(normalizeTitle('The Witcher 3: Game of the Year Edition')).toBe(
      normalizeTitle('The Witcher 3')
    );
    expect(normalizeTitle('Hades Definitive Edition')).toBe('hades');
  });

  it('reads roman numerals as the numbers they are', () => {
    expect(normalizeTitle('Hades II')).toBe('hades 2');
    expect(normalizeTitle('Final Fantasy XIV')).toBe('final fantasy 14');
  });

  it('treats punctuation as the noise it is', () => {
    expect(normalizeTitle("Marvel's Spider-Man")).toBe('marvel s spider man');
    expect(normalizeTitle('Marvel s Spider Man')).toBe('marvel s spider man');
  });
});

describe('deciding whether two names are one game', () => {
  it('matches the same game written two ways', () => {
    expect(isSameGame('Hades II', 'Hades 2')).toBe(true);
    expect(isSameGame('DOOM® Eternal', 'Doom Eternal')).toBe(true);
  });

  it('refuses a sequel', () => {
    expect(isSameGame('Hades', 'Hades II')).toBe(false);
  });

  it('refuses a longer title that merely contains the shorter one', () => {
    expect(isSameGame('Portal', 'Portal Knights')).toBe(false);
    expect(isSameGame('Celeste', 'Celeste Classic')).toBe(false);
  });

  it('picks the right candidate out of a search page', () => {
    const results = [
      game(1, 'Hades II: Prologue'),
      game(2, 'Hades'),
      game(3, 'Hades 2'),
    ];
    expect(bestMatch('Hades II', results)?.id).toBe(3);
  });

  it('returns nothing rather than the nearest thing', () => {
    expect(bestMatch('Some Obscure Game', [game(1, 'Hades')])).toBeUndefined();
  });
});

describe('attaching playtime to a library', () => {
  it('recognises saved games by name', () => {
    const progress = progressForLibrary(
      [steam(1, 'Hades II', 360), steam(2, 'Celeste', 90)],
      [{ game: game(10, 'Hades 2') }, { game: game(11, 'Celeste') }]
    );
    expect(progress).toEqual({ 10: 6, 11: 1.5 });
  });

  it('leaves out a game with no time on it — zero is not progress', () => {
    const progress = progressForLibrary(
      [steam(1, 'Celeste', 0)],
      [{ game: game(11, 'Celeste') }]
    );
    expect(progress).toEqual({});
  });

  it('keeps the entry with real time when Steam lists a game twice', () => {
    const progress = progressForLibrary(
      [steam(1, 'Hades II Demo', 30), steam(2, 'Hades II', 600)],
      [{ game: game(10, 'Hades II') }]
    );
    expect(progress).toEqual({ 10: 10 });
  });

  it('says nothing about games Steam does not have', () => {
    expect(
      progressForLibrary([steam(1, 'Hades')], [{ game: game(9, 'Tunic') }])
    ).toEqual({});
  });
});

describe('the order to offer a library in', () => {
  it('leads with what is being played right now', () => {
    const order = importOrder([
      steam(1, 'Old Favourite', 6000, 0),
      steam(2, 'This Fortnight', 120, 120),
      steam(3, 'Untouched', 0, 0),
    ]);
    expect(order.map((g) => g.appid)).toEqual([2, 1, 3]);
  });

  it('does not mutate what it was given', () => {
    const games = [steam(1, 'A', 1), steam(2, 'B', 99)];
    importOrder(games);
    expect(games.map((g) => g.appid)).toEqual([1, 2]);
  });
});

describe('minutes to hours', () => {
  it('rounds to something a person would say', () => {
    expect(hoursOf(90)).toBe(1.5);
    expect(hoursOf(3607)).toBe(60.1);
    expect(hoursOf(0)).toBe(0);
  });
});
