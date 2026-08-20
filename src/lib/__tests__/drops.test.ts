import { dropInsight, readDrops, recordDrop, totalDrops } from '../drops';

let store: Record<string, string>;
beforeAll(() => {
  store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => delete store[k],
    },
  });
});
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

/**
 * Asking why is not a guilt trip — "too long" and "bounced off it" mean
 * opposite things about what to offer next. Counts only: nobody needs a
 * permanent record of a game they decided not to play.
 */
describe('why a game was let go', () => {
  it('starts with nothing to say', () => {
    expect(readDrops()).toEqual({});
    expect(dropInsight({})).toBeNull();
  });

  it('counts several at once', () => {
    recordDrop('too-long', 3);
    recordDrop('too-long');
    expect(readDrops()).toEqual({ 'too-long': 4 });
    expect(totalDrops(readDrops())).toBe(4);
  });

  it('stays quiet until there is a habit rather than a Tuesday', () => {
    recordDrop('bounced', 2);
    expect(dropInsight(readDrops())).toBeNull();
  });

  it('says what the pattern means, in the app’s own voice', () => {
    recordDrop('too-long', 4);
    expect(dropInsight(readDrops())).toMatch(/leads with what fits/);
  });

  it('never scolds, whichever reason wins', () => {
    for (const reason of ['not-now', 'bounced', 'never-really'] as const) {
      for (const k of Object.keys(store)) delete store[k];
      recordDrop(reason, 5);
      const insight = dropInsight(readDrops());
      expect(insight).toBeTruthy();
      expect(insight).not.toMatch(/should|failed|too many/i);
    }
  });

  it('needs one reason to dominate, not just a total', () => {
    recordDrop('too-long', 2);
    recordDrop('bounced', 2);
    expect(totalDrops(readDrops())).toBe(4);
    expect(dropInsight(readDrops())).toBeNull();
  });
});
