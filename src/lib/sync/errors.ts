/**
 * Telling a broken row apart from a broken connection.
 *
 * This distinction is the whole reason the file exists, and getting it
 * backwards is expensive in both directions. Treat a dropped connection
 * as a bad row and the app quietly stops sending somebody's library.
 * Treat a bad row as a dropped connection and sync retries the same
 * rejected batch forever, so one impossible value freezes every other
 * game the person owns.
 *
 * Postgres already draws the line, in the SQLSTATE class of the error:
 * a constraint violation or a malformed value is a statement that will
 * be refused identically every time it is sent, no matter how good the
 * network gets. Everything else — a timeout, a closed socket, a
 * permission problem, an error with no code at all — is treated as
 * temporary, because the safe assumption about an error we do not
 * recognise is that the data is fine and the moment was bad.
 */

export class SyncError extends Error {
  constructor(
    message: string,
    /** SQLSTATE, when Postgres gave one. */
    readonly code?: string
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

/**
 * SQLSTATEs that describe the row rather than the circumstances.
 *
 * Deliberately a short list of ones whose meaning is unambiguous. An
 * unrecognised code is temporary by default: quarantining a row means
 * not sending it again until it changes, and doing that on a guess is
 * how a person's edit goes missing.
 */
const PERMANENT = new Set([
  '22003', // numeric value out of range
  '22007', // invalid datetime format
  '22008', // datetime field overflow
  '22P02', // invalid text representation — a malformed uuid, mostly
  '23502', // not null violation
  '23503', // foreign key violation — a game the games table lacks
  '23505', // unique violation
  '23514', // check constraint violation — a rating of 0, a want of 9
]);

/** Whether re-sending this row could ever produce a different answer. */
export const isPermanent = (error: unknown): boolean =>
  error instanceof SyncError && error.code != null && PERMANENT.has(error.code);

export const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'The server refused it';
