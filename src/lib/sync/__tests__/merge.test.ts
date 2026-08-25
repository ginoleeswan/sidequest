import {
  advanceCursor,
  knownAfter,
  mergeRows,
  pendingPush,
  type Row,
} from '../merge';

/**
 * The rules that decide whether somebody keeps their library.
 *
 * Written as the situations they protect against rather than as the
 * branches they exercise: a first sign-in against an empty account, an
 * edit made on a plane, a game deleted on the phone while the laptop
 * was closed.
 */

interface Entry extends Row {
  name?: string;
}

const at = (key: string, clientUpdatedAt: number, over: Partial<Entry> = {}) =>
  ({ key, clientUpdatedAt, ...over }) as Entry;

describe('mergeRows', () => {
  it('a first sign-in against an empty account keeps every local row', () => {
    // The one that would be catastrophic: "make local look like remote"
    // against a fresh account empties a real library.
    const local = [at('1', 100), at('2', 100), at('3', 100)];
    const { next, push } = mergeRows(local, []);
    expect(next).toHaveLength(3);
    expect(push).toHaveLength(3);
  });

  it('a fresh device adopts everything the account holds', () => {
    const remote = [at('1', 100), at('2', 100)];
    const { next, push } = mergeRows([], remote);
    expect(next.map((r) => r.key).sort()).toEqual(['1', '2']);
    expect(push).toHaveLength(0);
  });

  it('two half-full devices end up with the union, not the intersection', () => {
    const { next } = mergeRows([at('1', 100)], [at('2', 100)]);
    expect(next.map((r) => r.key).sort()).toEqual(['1', '2']);
  });

  it('the later edit wins, whichever side made it', () => {
    const newerRemote = mergeRows(
      [at('1', 100, { name: 'stale' })],
      [at('1', 200, { name: 'fresh' })]
    );
    expect(newerRemote.next[0].name).toBe('fresh');
    expect(newerRemote.push).toHaveLength(0);

    const newerLocal = mergeRows(
      [at('1', 300, { name: 'fresh' })],
      [at('1', 200, { name: 'stale' })]
    );
    expect(newerLocal.next[0].name).toBe('fresh');
    // The server is behind and has to be told.
    expect(newerLocal.push).toHaveLength(1);
  });

  it('a tie goes to the device in front of the person', () => {
    const { next, push } = mergeRows(
      [at('1', 100, { name: 'mine' })],
      [at('1', 100, { name: 'theirs' })]
    );
    expect(next[0].name).toBe('mine');
    expect(push).toHaveLength(1);
  });

  it('a newer tombstone removes the row here too', () => {
    const { next } = mergeRows(
      [at('1', 100), at('2', 100)],
      [at('1', 200, { deleted: true })]
    );
    expect(next.map((r) => r.key)).toEqual(['2']);
  });

  it('a stale tombstone does NOT remove a row edited since', () => {
    // Deleted on the phone, then edited on the laptop: the edit is the
    // later intent and the game stays.
    const { next, push } = mergeRows(
      [at('1', 300, { name: 'edited after the delete' })],
      [at('1', 200, { deleted: true })]
    );
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('edited after the delete');
    expect(push).toHaveLength(1);
  });

  it('a tombstone for a game this device never had teaches it nothing', () => {
    const { next } = mergeRows([], [at('9', 200, { deleted: true })]);
    expect(next).toHaveLength(0);
  });

  it('a local delete made offline survives the next pull', () => {
    const { next, push } = mergeRows(
      [at('1', 300, { deleted: true })],
      [at('1', 200)]
    );
    // Still a tombstone here, and queued so the server hears about it.
    expect(next[0].deleted).toBe(true);
    expect(push[0].deleted).toBe(true);
  });

  it('rows the pull never mentioned are pushed, never dropped', () => {
    // A pull is a patch, not a picture: almost every row is absent from
    // almost every pull.
    const { next, push } = mergeRows(
      [at('1', 100), at('2', 100)],
      [at('1', 150)]
    );
    expect(next).toHaveLength(2);
    expect(push.map((r) => r.key)).toEqual(['2']);
  });
});

describe('advanceCursor', () => {
  it('takes the newest stamp it was handed', () => {
    expect(
      advanceCursor(null, [
        '2026-01-01T00:00:00Z',
        '2026-03-01T00:00:00Z',
        '2026-02-01T00:00:00Z',
      ])
    ).toBe('2026-03-01T00:00:00Z');
  });

  it('never moves backwards on an empty or older page', () => {
    const held = '2026-03-01T00:00:00Z';
    expect(advanceCursor(held, [])).toBe(held);
    expect(advanceCursor(held, ['2026-01-01T00:00:00Z'])).toBe(held);
  });
});

describe('pendingPush', () => {
  const held = (...keys: string[]) => new Set(keys);
  const row = (key: string, clientUpdatedAt: number) => ({
    key,
    clientUpdatedAt,
  });

  it('drops what the server is already known to hold', () => {
    const send = pendingPush(held('a'), [row('a', 5)], { a: 5 }, 9);
    expect(send).toEqual([]);
  });

  it('keeps a row the server holds at an older stamp', () => {
    const send = pendingPush(held('a'), [row('a', 6)], { a: 5 }, 9);
    expect(send).toEqual([row('a', 6)]);
  });

  it('turns a key that left the device into a tombstone', () => {
    // The only way a delete is ever noticed: the local store drops the
    // key outright, so there is nothing for mergeRows to compare.
    const send = pendingPush(held(), [], { a: 5 }, 9);
    expect(send).toEqual([{ key: 'a', clientUpdatedAt: 9, deleted: true }]);
  });

  it('does not tombstone a key the pull is dealing with', () => {
    const send = pendingPush(held('a'), [], { a: 5 }, 9);
    expect(send).toEqual([]);
  });

  it('fingerprints on whatever the caller says identity is', () => {
    // Durations carry no stamp of their own, so the hours are the
    // fingerprint; the stamp changes every round and would mean
    // re-uploading every correction forever.
    const hours = (r: { clientUpdatedAt: number; value?: number }) =>
      r.value ?? 0;
    const same = [{ key: 'a', clientUpdatedAt: 999, value: 30 }];
    expect(pendingPush(held('a'), same, { a: 30 }, 9, hours)).toEqual([]);
    expect(pendingPush(held('a'), same, { a: 12 }, 9, hours)).toEqual(same);
  });
});

describe('knownAfter', () => {
  it('records the stamp of everything retained', () => {
    expect(
      knownAfter([
        { key: 'a', clientUpdatedAt: 1 },
        { key: 'b', clientUpdatedAt: 2 },
      ])
    ).toEqual({ a: 1, b: 2 });
  });

  it('records nothing for an empty round', () => {
    expect(knownAfter([])).toEqual({});
  });
});
