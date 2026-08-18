import {
  measuredHoursPerWeek,
  parseSteamInput,
  recentGames,
  type SteamGame,
} from '../steam';

const g = (
  appid: number,
  minutes2Weeks: number,
  minutesForever = 0
): SteamGame => ({
  appid,
  name: `App ${appid}`,
  minutes2Weeks,
  minutesForever,
});

describe('parseSteamInput', () => {
  it('parses a vanity profile URL', () => {
    expect(
      parseSteamInput('https://steamcommunity.com/id/robinwalker/')
    ).toEqual({ kind: 'vanity', value: 'robinwalker' });
  });

  it('parses a profiles URL with an id64', () => {
    expect(
      parseSteamInput('steamcommunity.com/profiles/76561197960435530')
    ).toEqual({ kind: 'steamid', value: '76561197960435530' });
  });

  it('parses a bare id64 and a bare vanity', () => {
    expect(parseSteamInput('76561197960435530')).toEqual({
      kind: 'steamid',
      value: '76561197960435530',
    });
    expect(parseSteamInput('robinwalker')).toEqual({
      kind: 'vanity',
      value: 'robinwalker',
    });
  });

  it('rejects junk', () => {
    expect(parseSteamInput('')).toBeNull();
    expect(parseSteamInput('not a profile!!!')).toBeNull();
    expect(parseSteamInput('steamcommunity.com/profiles/12345')).toBeNull();
  });
});

describe('measuredHoursPerWeek', () => {
  it('halves the two-week minute total into weekly hours', () => {
    // 12h over two weeks -> 6 h/week
    expect(measuredHoursPerWeek([g(1, 600), g(2, 120)])).toBe(6);
  });

  it('rounds to one decimal', () => {
    expect(measuredHoursPerWeek([g(1, 100)])).toBe(0.8);
  });

  it('is zero for an idle fortnight', () => {
    expect(measuredHoursPerWeek([g(1, 0, 4000)])).toBe(0);
  });
});

describe('recentGames', () => {
  it('keeps only active games, most-played first', () => {
    const result = recentGames([g(1, 30), g(2, 0), g(3, 300)]);
    expect(result.map((x) => x.appid)).toEqual([3, 1]);
  });
});
