import { readVersioned, writeJson } from './storage';

/**
 * Time actually spent, recorded as it happens.
 *
 * Progress only existed for people on Steam: everyone on a console, on
 * Game Pass or on itch got the flat "a game under way is half done"
 * guess. A session is the honest alternative — press play, the app
 * counts, and afterwards it asks the only question that matters.
 *
 * The clock lives in storage rather than in a component. A tab that is
 * closed mid-session, a phone that locks, a browser that discards the
 * page: none of those should lose an evening, and none of them can if
 * the only thing being kept is when it started.
 */

const RUNNING_KEY = 'sidequest.session.running.v1';
const LOG_KEY = 'sidequest.sessions.v1';

/** Kept for the stats screen. Beyond this the tail is noise. */
const MAX_LOG = 400;

/**
 * Longer than any real sitting. A session left running overnight is a
 * forgotten tab, not fourteen hours of play, and recording it as play
 * would poison the one honest number the app has about someone.
 */
export const MAX_SESSION_MINUTES = 8 * 60;

export interface RunningSession {
  gameId: number;
  name: string;
  startedAt: number;
}

export interface LoggedSession {
  gameId: number;
  minutes: number;
  endedAt: number;
}

export const readRunning = (): RunningSession | null => {
  const running = readVersioned<RunningSession | null>(RUNNING_KEY, null, []);
  return running && typeof running.gameId === 'number' ? running : null;
};

export function startSession(
  gameId: number,
  name: string,
  now: number = Date.now()
): RunningSession {
  const session = { gameId, name, startedAt: now };
  writeJson(RUNNING_KEY, session);
  return session;
}

export const cancelSession = (): void => {
  writeJson(RUNNING_KEY, null);
};

/** Whole minutes elapsed, capped — see MAX_SESSION_MINUTES. */
export function elapsedMinutes(
  session: RunningSession,
  now: number = Date.now()
): number {
  const minutes = Math.floor((now - session.startedAt) / 60_000);
  return Math.max(0, Math.min(minutes, MAX_SESSION_MINUTES));
}

/**
 * End the running session and record it.
 *
 * Anything under a minute is thrown away rather than logged: it is a
 * misclick, and a backlog full of one-minute sessions is worse than no
 * record at all.
 */
export function endSession(now: number = Date.now()): LoggedSession | null {
  const running = readRunning();
  if (!running) return null;
  cancelSession();

  const minutes = elapsedMinutes(running, now);
  if (minutes < 1) return null;

  const logged: LoggedSession = {
    gameId: running.gameId,
    minutes,
    endedAt: now,
  };
  writeJson(LOG_KEY, [logged, ...readSessions()].slice(0, MAX_LOG));
  return logged;
}

export const readSessions = (): LoggedSession[] =>
  readVersioned<LoggedSession[]>(LOG_KEY, [], []).filter(
    (session) =>
      typeof session?.gameId === 'number' &&
      typeof session?.minutes === 'number'
  );

/** "1h 20m", "45m" — how a person says a sitting. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * How long an evening is, by the day it falls on.
 *
 * Tonight has always assumed ninety minutes, which is a Tuesday. A
 * Saturday is not a Tuesday, and a plan that cannot tell the difference
 * is answering the wrong question two days in seven.
 */
export function sessionMinutesFor(now: number = Date.now()): number {
  const day = new Date(now).getDay();
  if (day === 5 || day === 6) return 180; // Friday and Saturday nights
  if (day === 0) return 120; // Sunday
  return 90;
}

/** The name for that length, for the copy around it. */
export function sessionLabelFor(now: number = Date.now()): string {
  const day = new Date(now).getDay();
  if (day === 5 || day === 6) return 'Tonight — it’s the weekend';
  if (day === 0) return 'Sunday evening';
  return 'Tonight';
}
