import { SyncError, isPermanent, reasonOf } from '../errors';

/**
 * The one distinction the hardening rests on.
 *
 * Both mistakes are expensive and neither is loud: call a dropped
 * connection a bad row and the app stops sending somebody's library;
 * call a bad row a dropped connection and one impossible value freezes
 * every other game they own.
 */
describe('isPermanent', () => {
  it.each([
    ['23514', 'a check constraint — a rating of 0, a want of 9'],
    ['23503', 'a foreign key — a game the games table lacks'],
    ['23502', 'a not-null column left null'],
    ['22P02', 'a malformed value'],
  ])('%s is the row, not the moment (%s)', (code) => {
    expect(isPermanent(new SyncError('refused', code))).toBe(true);
  });

  it.each([
    ['08006', 'connection failure'],
    ['57014', 'statement cancelled'],
    ['42501', 'row level security'],
  ])('%s is the moment, not the row (%s)', (code) => {
    // Worth being specific about 42501: a permissions problem looks
    // permanent and is not. It is the shape of a misconfigured policy
    // or an expired token, and both get fixed without the row changing.
    expect(isPermanent(new SyncError('refused', code))).toBe(false);
  });

  it('treats an unrecognised code as temporary', () => {
    // The safe default. Quarantining means not trying again until the
    // row changes, and doing that on a guess loses somebody's edit.
    expect(isPermanent(new SyncError('who knows', '99999'))).toBe(false);
    expect(isPermanent(new SyncError('no code at all'))).toBe(false);
    expect(isPermanent(new Error('not even a SyncError'))).toBe(false);
    expect(isPermanent('a string')).toBe(false);
  });
});

describe('reasonOf', () => {
  it('passes the server’s own words through', () => {
    expect(reasonOf(new SyncError('violates check constraint', '23514'))).toBe(
      'violates check constraint'
    );
  });

  it('has something to say about a thrown non-error', () => {
    expect(reasonOf(undefined)).toBe('The server refused it');
  });
});
