import { fitFrom, fitLine, fitTitle } from '../fit';

// A Monday, so the weekday capacities are predictable: 1.5h on weekdays,
// 3h on Friday and Saturday, 2h on Sunday.
const MONDAY = new Date('2026-09-07T20:00:00').getTime();

describe('how a game fits the evenings ahead', () => {
  it('is nothing for a game of unknown length', () => {
    expect(fitFrom(0, MONDAY)).toBeNull();
    expect(fitFrom(NaN, MONDAY)).toBeNull();
  });

  it('spends the evenings the plan engine would, and stops at the credits', () => {
    const fit = fitFrom(6, MONDAY)!;
    // Mon 1.5 + Tue 1.5 + Wed 1.5 + Thu 1.5 = 6: four evenings.
    expect(fit.evenings).toBe(4);
    expect(fit.days).toHaveLength(4);
    expect(fit.days[3].finishes).toBe(true);
    expect(fit.finishAt).toBe(fit.days[3].date);
    expect(fitTitle(fit)).toBe('Four evenings');
    expect(fitLine(fit, MONDAY)).toBe(
      'Start tonight, see the credits Thursday.'
    );
  });

  it('names a date once the credits are more than a week away', () => {
    const fit = fitFrom(30, MONDAY)!;
    expect(fit.finishAt).not.toBeNull();
    expect(fitLine(fit, MONDAY)).toMatch(
      /^Start tonight, see the credits around [A-Z][a-z]{2} \d+\.$/
    );
  });

  it('calls a game past the horizon a long one rather than inventing a date', () => {
    const fit = fitFrom(400, MONDAY)!;
    expect(fit.finishAt).toBeNull();
    expect(fitTitle(fit)).toBe('A long one');
    expect(fitLine(fit, MONDAY)).toMatch(/^More than \d+ weeks/);
  });

  it('is one evening when it fits in one', () => {
    const fit = fitFrom(1, MONDAY)!;
    expect(fit.evenings).toBe(1);
    expect(fitTitle(fit)).toBe('One evening');
    expect(fitLine(fit, MONDAY)).toBe(
      'Start tonight, see the credits tonight.'
    );
  });
});
