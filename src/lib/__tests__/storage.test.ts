import {
  _setBackendForTests,
  readJson,
  readVersioned,
  writeFailureMessage,
  writeJson,
} from '../storage';

/**
 * Stubs go through the storage layer's own seam. These tests used to
 * define `globalThis.localStorage`, which under jest — where the app
 * runs its native code paths — is a global nothing reads: the suite
 * kept passing while asserting into a void the day the adapter landed.
 * An "unavailable" store is a backend that throws, same as production.
 */
function useStore(impl: Partial<Storage> | undefined) {
  _setBackendForTests({
    getItem: (k) => {
      if (!impl?.getItem) throw new Error('unavailable');
      return impl.getItem(k);
    },
    setItem: (k, v) => {
      if (!impl?.setItem) throw new Error('unavailable');
      impl.setItem(k, v);
    },
    removeItem: (k) => impl?.removeItem?.(k),
  });
}

describe('readJson', () => {
  it('returns the stored value', () => {
    useStore({ getItem: () => '{"a":1}' } as Partial<Storage>);
    expect(readJson('k', { a: 0 })).toEqual({ a: 1 });
  });

  it('falls back when nothing is stored', () => {
    useStore({ getItem: () => null } as Partial<Storage>);
    expect(readJson('k', { a: 0 })).toEqual({ a: 0 });
  });

  it('falls back on corrupt JSON rather than throwing on boot', () => {
    useStore({ getItem: () => '{not json' } as Partial<Storage>);
    expect(readJson('k', { a: 0 })).toEqual({ a: 0 });
  });

  it('falls back when storage is unavailable', () => {
    useStore(undefined);
    expect(readJson('k', 'fallback')).toBe('fallback');
  });
});

describe('writeJson', () => {
  it('reports success', () => {
    const setItem = jest.fn();
    useStore({ setItem } as Partial<Storage>);
    expect(writeJson('k', { a: 1 })).toEqual({ ok: true });
    expect(setItem).toHaveBeenCalledWith('k', '{"a":1}');
  });

  it('reports an unavailable store instead of pretending it saved', () => {
    useStore(undefined);
    expect(writeJson('k', 1)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
  });

  /**
   * The cases that matter: browsers disagree on how a full disk presents,
   * and each of these means the user's data did not land.
   */
  it.each([
    [
      'QuotaExceededError by name',
      Object.assign(new Error('x'), { name: 'QuotaExceededError' }),
    ],
    [
      'Firefox NS_ERROR_DOM_QUOTA_REACHED',
      Object.assign(new Error('x'), { name: 'NS_ERROR_DOM_QUOTA_REACHED' }),
    ],
    [
      'Safari private mode code 22',
      Object.assign(new Error('x'), { code: 22 }),
    ],
    ['Firefox code 1014', Object.assign(new Error('x'), { code: 1014 })],
  ])('recognises %s as a full store', (_label, error) => {
    useStore({
      setItem: () => {
        throw error;
      },
    } as Partial<Storage>);
    expect(writeJson('k', 1)).toMatchObject({ ok: false, reason: 'full' });
  });

  it('treats an unrecognised failure as unavailable, not as full', () => {
    useStore({
      setItem: () => {
        throw new Error('something else');
      },
    } as Partial<Storage>);
    expect(writeJson('k', 1)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
  });
});

describe('writeFailureMessage', () => {
  it('names the cause so the user can act on it', () => {
    expect(
      writeFailureMessage({ ok: false, reason: 'full', error: null })
    ).toContain('full');
    expect(
      writeFailureMessage({ ok: false, reason: 'unavailable', error: null })
    ).toContain("Couldn't save");
  });
});

describe('readVersioned', () => {
  it('prefers the current key and ignores migrations', () => {
    useStore({
      getItem: (k: string) => (k === 'v2' ? '{"a":2}' : '{"a":1}'),
    } as Partial<Storage>);
    const migrate = jest.fn();
    expect(readVersioned('v2', { a: 0 }, [{ from: 'v1', migrate }])).toEqual({
      a: 2,
    });
    expect(migrate).not.toHaveBeenCalled();
  });

  it('migrates an older key forward and writes it under the new one', () => {
    const setItem = jest.fn();
    useStore({
      getItem: (k: string) => (k === 'v1' ? '{"hours":5}' : null),
      setItem,
    } as Partial<Storage>);
    const result = readVersioned<{ minutes: number }>('v2', { minutes: 0 }, [
      {
        from: 'v1',
        migrate: (v) => ({ minutes: (v as { hours: number }).hours * 60 }),
      },
    ]);
    expect(result).toEqual({ minutes: 300 });
    expect(setItem).toHaveBeenCalledWith('v2', '{"minutes":300}');
  });

  it('leaves the old key in place so a rollback still finds it', () => {
    const removeItem = jest.fn();
    useStore({
      getItem: (k: string) => (k === 'v1' ? '1' : null),
      setItem: jest.fn(),
      removeItem,
    } as Partial<Storage>);
    readVersioned('v2', 0, [{ from: 'v1', migrate: (v) => Number(v) }]);
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('falls back rather than crashing when a migration throws', () => {
    useStore({
      getItem: (k: string) => (k === 'v1' ? '1' : null),
      setItem: jest.fn(),
    } as Partial<Storage>);
    expect(
      readVersioned('v2', 'safe', [
        {
          from: 'v1',
          migrate: () => {
            throw new Error('bad migration');
          },
        },
      ])
    ).toBe('safe');
  });

  it('tries the next migration when one yields nothing', () => {
    useStore({
      getItem: (k: string) => (k === 'v0' ? '9' : null),
      setItem: jest.fn(),
    } as Partial<Storage>);
    expect(
      readVersioned('v2', 0, [
        { from: 'v1', migrate: () => 1 },
        { from: 'v0', migrate: (v) => Number(v) },
      ])
    ).toBe(9);
  });
});
