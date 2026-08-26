import { measuredPace, worthSaying } from '../measuredPace';
import type { LoggedSession } from '../sessions';

/**
 * The pace the app watched, against the one it was told.
 *
 * Everything the plan says rests on hours-a-week, and that number is
 * chosen in ten seconds during onboarding by somebody being generous
 * with themselves. The session clock has been recording the truth the
 * whole time and only the Memcard ever looked.
 *
 * The care in these tests is all in the same direction: this counts
 * logged sessions, nobody logs every evening, so it is a floor. It must
 * refuse to speak on thin evidence rather than replace one guess with
 * another.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 7, 26, 22).getTime();

const at = (daysAgo: number, minutes: number): LoggedSession => ({
  gameId: 1,
  minutes,
  endedAt: NOW - daysAgo * DAY,
});

describe('measuredPace', () => {
  it('says nothing at all with no sessions', () => {
    expect(measuredPace([], NOW)).toBeNull();
  });

  /** Two good evenings in one week is a weekend, not a pace. */
  it('refuses to judge on too few evenings', () => {
    expect(measuredPace([at(20, 120), at(10, 120)], NOW)).toBeNull();
  });

  it('refuses to judge on too short a stretch', () => {
    // Three sessions, but all inside a week.
    expect(measuredPace([at(6, 120), at(4, 120), at(2, 120)], NOW)).toBeNull();
  });

  it('works out hours a week once there is enough to go on', () => {
    // 28 days, four evenings of two hours = 8h over 4 weeks = 2h a week.
    const log = [at(28, 120), at(20, 120), at(12, 120), at(4, 120)];
    const out = measuredPace(log, NOW);
    expect(out?.hoursPerWeek).toBe(2);
    expect(out?.sessions).toBe(4);
  });

  /**
   * A busy fortnight followed by three quiet weeks is a slower pace
   * than a busy fortnight. Measuring to the last session rather than to
   * today would report the fortnight and call it current.
   */
  it('counts the quiet weeks since, not just the busy ones', () => {
    const busy = [at(56, 180), at(50, 180), at(44, 180), at(42, 180)];
    const out = measuredPace(busy, NOW);
    // 12 hours spread over eight weeks, not over the two they fell in.
    expect(out!.hoursPerWeek).toBeLessThan(2);
  });

  it('forgets a stretch too old to be this life', () => {
    const ancient = [at(400, 180), at(380, 180), at(360, 180)];
    expect(measuredPace(ancient, NOW)).toBeNull();
  });

  it('ignores a session stamped in the future', () => {
    const log = [at(28, 120), at(20, 120), at(12, 120), at(-5, 600)];
    expect(measuredPace(log, NOW)?.sessions).toBe(3);
  });

  /** False precision would make a floor look like a measurement. */
  it('rounds to something a person would actually say', () => {
    const log = [at(30, 97), at(20, 63), at(10, 41), at(3, 88)];
    const hours = measuredPace(log, NOW)!.hoursPerWeek;
    expect(hours * 2).toBe(Math.round(hours * 2));
  });
});

/**
 * The asymmetry, which is the whole design.
 *
 * The count is a floor: it sees the evenings somebody timed and none of
 * the ones they did not. A floor ABOVE the assumption proves the
 * assumption is low — those hours happened. A floor BELOW it proves
 * nothing whatever, because the missing evenings are exactly the ones
 * absent from the count, so a small number is equally consistent with
 * somebody who plays constantly and never presses the button.
 *
 * Drawn on screen, that second case read "your dates are optimistic,
 * use 1h a week" off five timed evenings — the app confidently
 * rewriting a stranger's life from the corner it happened to see.
 */
describe('worthSaying', () => {
  it('stays quiet when the plan is about right', () => {
    expect(worthSaying(8, 7)).toBe(false);
    expect(worthSaying(8, 9)).toBe(false);
  });

  it('speaks when there is provably more room than the plan thinks', () => {
    expect(worthSaying(4, 9)).toBe(true);
  });

  /**
   * The case it would most like to help with, and cannot: an untimed
   * evening looks exactly like an evening that did not happen. Steam
   * sees every hour and the plan already offers it — that is the honest
   * route to catching an over-generous pace.
   */
  it('stays quiet when the floor is low, which proves nothing', () => {
    expect(worthSaying(8, 4)).toBe(false);
    expect(worthSaying(8, 1)).toBe(false);
  });

  it('cannot be tripped up by a nonsense pace', () => {
    expect(worthSaying(0, 5)).toBe(false);
  });
});
