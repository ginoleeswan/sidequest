import {
  formatHours,
  parseHours,
  remainingHours,
  resolveDuration,
} from '../duration';

const NOW = Date.parse('2026-08-19T00:00:00Z');
const game = (playtime: number, released: string | null = '2024-01-01') => ({
  playtime,
  released,
});

describe('resolveDuration', () => {
  it('prefers what the player told us, over any estimate', () => {
    expect(resolveDuration(game(40), 12, NOW)).toEqual({
      hours: 12,
      source: 'yours',
      rough: false,
    });
  });

  it("trusts the player's number even when RAWG has none", () => {
    expect(resolveDuration(game(0), 8, NOW)).toMatchObject({
      hours: 8,
      source: 'yours',
    });
  });

  it('ignores a nonsense override', () => {
    expect(resolveDuration(game(20), 0, NOW).source).toBe('estimate');
    expect(resolveDuration(game(20), -5, NOW).source).toBe('estimate');
  });

  it('reports an ordinary estimate as trustworthy', () => {
    expect(resolveDuration(game(24), undefined, NOW)).toEqual({
      hours: 24,
      source: 'estimate',
      rough: false,
    });
  });

  it('says it does not know when there is no estimate', () => {
    expect(resolveDuration(game(0), undefined, NOW)).toEqual({
      hours: 0,
      source: 'unknown',
      rough: true,
    });
  });

  it('flags an estimate for a game nobody has finished yet', () => {
    // The case that started this: an unreleased game claiming 329 hours.
    const unreleased = resolveDuration(game(329, '2027-01-01'), undefined, NOW);
    expect(unreleased).toMatchObject({ source: 'estimate', rough: true });
    expect(resolveDuration(game(20, null), undefined, NOW).rough).toBe(true);
    expect(resolveDuration(game(20, 'not a date'), undefined, NOW).rough).toBe(
      true
    );
  });

  it('flags implausible averages in both directions', () => {
    expect(resolveDuration(game(400), undefined, NOW).rough).toBe(true);
    expect(resolveDuration(game(1), undefined, NOW).rough).toBe(true);
    expect(resolveDuration(game(60), undefined, NOW).rough).toBe(false);
  });

  it('never flags a number the player set, however unusual', () => {
    expect(resolveDuration(game(0, null), 500, NOW).rough).toBe(false);
  });
});

describe('formatHours', () => {
  it('writes hours the way a person would', () => {
    expect(formatHours(40)).toBe('40h');
    expect(formatHours(2)).toBe('2h');
    expect(formatHours(2.5)).toBe('2.5h');
    expect(formatHours(2.4)).toBe('2.5h');
    expect(formatHours(12.6)).toBe('13h');
  });

  it('has a dash for nothing known', () => {
    expect(formatHours(0)).toBe('—');
    expect(formatHours(-1)).toBe('—');
  });
});

describe('parseHours', () => {
  it('accepts the ways people write a length', () => {
    expect(parseHours('12')).toBe(12);
    expect(parseHours('12h')).toBe(12);
    expect(parseHours(' 12 hours ')).toBe(12);
    expect(parseHours('2.5')).toBe(2.5);
    expect(parseHours('90m')).toBe(1.5);
    expect(parseHours('30 min')).toBe(0.5);
  });

  it('rejects what is not a length', () => {
    expect(parseHours('')).toBeNull();
    expect(parseHours('soon')).toBeNull();
    expect(parseHours('0')).toBeNull();
    expect(parseHours('-4')).toBeNull();
    expect(parseHours('99999')).toBeNull();
  });
});

describe('what is left of a game', () => {
  it('is the whole thing when it has not been started', () => {
    expect(remainingHours(30, {})).toBe(30);
  });

  it('is half, honestly guessed, for something under way we cannot measure', () => {
    expect(remainingHours(30, { playing: true })).toBe(15);
  });

  it('is the measurement when there is one, whatever the status says', () => {
    expect(remainingHours(40, { hoursPlayed: 30 })).toBe(10);
    expect(remainingHours(40, { hoursPlayed: 30, playing: true })).toBe(10);
  });

  it('keeps an hour on the board past the estimate — the end is the slow part', () => {
    expect(remainingHours(40, { hoursPlayed: 90 })).toBe(1);
  });

  it('stays at zero for a game whose length nobody knows', () => {
    expect(remainingHours(0, { hoursPlayed: 12 })).toBe(0);
  });

  it('ignores a zero measurement rather than calling it finished', () => {
    expect(remainingHours(30, { hoursPlayed: 0, playing: true })).toBe(15);
  });
});
