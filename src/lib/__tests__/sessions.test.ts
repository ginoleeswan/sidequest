import {
  cancelSession,
  elapsedMinutes,
  endSession,
  formatMinutes,
  MAX_SESSION_MINUTES,
  readRunning,
  readSessions,
  sessionLabelFor,
  sessionMinutesFor,
  startSession,
} from '../sessions';
import { _setBackendForTests } from '../storage';

// A fresh backend per test, through the storage layer's own seam: under
// jest the app runs its native code paths, where localStorage is a global
// nothing reads.
let store: Record<string, string>;
beforeEach(() => {
  store = {};
  _setBackendForTests({
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
  });
});

const MINUTE = 60_000;

/**
 * The clock is in storage on purpose: a closed tab, a locked phone or a
 * discarded page must not lose someone's evening.
 */
describe('a play session', () => {
  it('survives the page going away', () => {
    startSession(1, 'Celeste', 1000);
    expect(readRunning()).toEqual({
      gameId: 1,
      name: 'Celeste',
      startedAt: 1000,
    });
  });

  it('counts whole minutes', () => {
    const session = startSession(1, 'Celeste', 0);
    expect(elapsedMinutes(session, 90 * MINUTE + 30_000)).toBe(90);
  });

  it('refuses to believe a forgotten tab', () => {
    const session = startSession(1, 'Celeste', 0);
    expect(elapsedMinutes(session, 14 * 60 * MINUTE)).toBe(MAX_SESSION_MINUTES);
  });

  it('records what was played, most recent first', () => {
    startSession(1, 'Celeste', 0);
    expect(endSession(45 * MINUTE)).toEqual({
      gameId: 1,
      minutes: 45,
      endedAt: 45 * MINUTE,
    });
    startSession(2, 'Hades', 100 * MINUTE);
    endSession(160 * MINUTE);
    expect(readSessions().map((s) => s.gameId)).toEqual([2, 1]);
  });

  it('throws away a misclick rather than logging it', () => {
    startSession(1, 'Celeste', 0);
    expect(endSession(30_000)).toBeNull();
    expect(readSessions()).toEqual([]);
    expect(readRunning()).toBeNull();
  });

  it('ends nothing when nothing is running', () => {
    expect(endSession()).toBeNull();
  });

  it('can be abandoned without recording anything', () => {
    startSession(1, 'Celeste', 0);
    cancelSession();
    expect(readRunning()).toBeNull();
    expect(readSessions()).toEqual([]);
  });

  it('ignores rubbish in storage', () => {
    store['sidequest.session.running.v1'] = JSON.stringify({ nonsense: true });
    expect(readRunning()).toBeNull();
  });
});

describe('how long an evening is', () => {
  const on = (day: number) => Date.UTC(2026, 7, 16 + day, 20);

  it('is ninety minutes on a Tuesday', () => {
    expect(sessionMinutesFor(on(2))).toBe(90);
    expect(sessionLabelFor(on(2))).toBe('Tonight');
  });

  it('is three hours on a Friday or Saturday', () => {
    expect(sessionMinutesFor(on(5))).toBe(180);
    expect(sessionMinutesFor(on(6))).toBe(180);
    expect(sessionLabelFor(on(6))).toMatch(/weekend/);
  });

  it('is two hours on a Sunday, when tomorrow is Monday', () => {
    expect(sessionMinutesFor(on(0))).toBe(120);
    expect(sessionLabelFor(on(0))).toBe('Sunday evening');
  });
});

describe('saying a length out loud', () => {
  it('reads the way a person would say it', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(80)).toBe('1h 20m');
  });
});

/**
 * A play history that will not parse.
 *
 * `endSession` writes `[newest, ...readSessions()]`, so a log reading as
 * empty is a log replaced by its own last entry the moment somebody
 * stops playing — every evening they ever recorded, gone, with nothing
 * on screen to suggest it happened.
 */
describe('a damaged session log', () => {
  const LOG = 'sidequest.sessions.v1';
  const truncated = '[{"gameId":1,"minutes":90,"endedAt":1';

  it('reads as empty rather than throwing', () => {
    store[LOG] = truncated;
    expect(readSessions()).toEqual([]);
  });

  it('keeps the unreadable copy where it can be found again', () => {
    store[LOG] = truncated;
    readSessions();
    expect(store[`${LOG}.damaged`]).toBe(truncated);
  });

  /** The failure itself: finishing a session used to overwrite it. */
  it('does not lose the copy when the next session ends', () => {
    store[LOG] = truncated;
    startSession(1, 'Celeste', 0);
    endSession(30 * MINUTE);
    expect(store[LOG]).not.toBe(truncated);
    expect(store[`${LOG}.damaged`]).toBe(truncated);
  });
});
