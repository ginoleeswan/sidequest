import {
  _setBackendForTests,
  damagedKey,
  quarantine,
  readJson,
  readJsonChecked,
  readRescued,
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

/**
 * A key that will not parse.
 *
 * Falling back to a default keeps the app from crashing on boot, and
 * for most keys that is the whole answer. For the library it is half of
 * one: the app renders as though the reader never had anything, and the
 * next thing they touch writes that emptiness over the bytes. So a read
 * reports what it could not read, and the caller puts it somewhere the
 * next write cannot reach.
 */
describe('unreadable bytes', () => {
  /**
   * A real backing map, so a write can be read back — set through the
   * seam directly rather than through `useStore`, whose name makes the
   * hooks rule treat any helper calling it as a broken custom hook.
   */
  const backed = (seed: Record<string, string> = {}) => {
    const map: Record<string, string> = { ...seed };
    _setBackendForTests({
      getItem: (k) => map[k] ?? null,
      setItem: (k, v) => void (map[k] = v),
    });
    return map;
  };

  it('still starts clean, so a corrupt key cannot stop the app', () => {
    backed({ thing: '{"half":' });
    expect(readJson('thing', { fallback: true })).toEqual({ fallback: true });
  });

  it('hands back exactly what it could not parse', () => {
    backed({ thing: '{"half":' });
    const read = readJsonChecked('thing', {});
    expect(read.value).toEqual({});
    expect(read.damaged).toBe('{"half":');
  });

  it('says nothing is damaged when the key is simply absent', () => {
    backed();
    expect(readJsonChecked('nothing', 7).damaged).toBeUndefined();
  });

  /**
   * Storage being unavailable and storage holding nonsense are
   * different failures, and only the second has anything to rescue.
   * Reporting an unreachable backend as damage would quarantine nothing
   * and alarm somebody whose data is perfectly intact.
   */
  it('does not call an unreachable backend damaged', () => {
    useStore(undefined);
    const read = readJsonChecked('thing', 'safe');
    expect(read.value).toBe('safe');
    expect(read.damaged).toBeUndefined();
  });

  it('keeps the unreadable copy under its own key', () => {
    const map = backed();
    expect(quarantine('thing', '{"half":').ok).toBe(true);
    expect(map[damagedKey('thing')]).toBe('{"half":');
  });

  /**
   * A second damaged read is more likely to be this mechanism's own
   * output than a fresh disaster, and overwriting would destroy the
   * copy that mattered. It also makes the rescue safe to run twice,
   * which a StrictMode initialiser does.
   */
  it('never overwrites a copy it already kept', () => {
    const map = backed();
    quarantine('thing', 'the original');
    quarantine('thing', 'a later mess');
    expect(map[damagedKey('thing')]).toBe('the original');
  });

  it('reports rather than throws when the copy cannot be written', () => {
    useStore({ getItem: () => null } as Partial<Storage>);
    expect(quarantine('thing', 'x').ok).toBe(false);
  });

  /**
   * The whole dance, for the three stores that hold something a person
   * cannot get back. Each one had the same silent failure and each one
   * needs a different sentence about it, so this returns what happened
   * and leaves the wording to the caller.
   */
  describe('readRescued', () => {
    it('reads normally and reports no damage', () => {
      backed({ k: '{"a":1}' });
      expect(readRescued('k', {})).toEqual({ value: { a: 1 }, rescue: 'none' });
    });

    it('falls back, keeps the bytes, and says it kept them', () => {
      const map = backed({ k: '{"half":' });
      expect(readRescued('k', { safe: true })).toEqual({
        value: { safe: true },
        rescue: 'kept',
      });
      expect(map[damagedKey('k')]).toBe('{"half":');
    });

    /** The one case where the next save really does destroy something. */
    it('says so when even the copy could not be written', () => {
      useStore({
        getItem: (k: string) => (k === 'k' ? '{"half":' : null),
      } as unknown as Partial<Storage>);
      expect(readRescued('k', null).rescue).toBe('lost');
    });

    it('is safe to run twice, as a StrictMode initialiser does', () => {
      const map = backed({ k: 'the original' });
      readRescued('k', null);
      readRescued('k', null);
      expect(map[damagedKey('k')]).toBe('the original');
    });
  });
});
