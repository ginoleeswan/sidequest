/**
 * The web halves of the platform-split modules.
 *
 * Jest resolves bare imports to the `.native.ts` siblings, so these
 * files were never loaded by any test — and a file jest never loads is
 * silently absent from the coverage report, which is worse than showing
 * 0%: the gap did not even appear on the map. Requiring them by full
 * filename puts them back on it.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- explicit extension beats platform resolution, on purpose
const { platformBackend } = require('../kvBackend.ts') as {
  platformBackend: typeof import('../kvBackend').platformBackend;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports -- explicit extension beats platform resolution, on purpose
const { widgetStore } = require('../widgetStore.ts') as {
  widgetStore: typeof import('../widgetStore').widgetStore;
};

describe("web's kv backend", () => {
  afterEach(() => {
    // @ts-expect-error test-installed
    delete globalThis.localStorage;
  });

  const install = (store: Record<string, string>) =>
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });

  it('reads, writes and removes through localStorage', () => {
    const store: Record<string, string> = {};
    install(store);
    const backend = platformBackend();
    backend.setItem('k', 'v');
    expect(backend.getItem('k')).toBe('v');
    backend.removeItem?.('k');
    expect(store.k).toBeUndefined();
  });

  it('a missing localStorage reads as empty and THROWS on write', () => {
    // The throw is the contract: writeJson catches it and reports
    // "unavailable" instead of pretending the save landed.
    const backend = platformBackend();
    expect(backend.getItem('k')).toBeNull();
    expect(() => backend.setItem('k', 'v')).toThrow(/unavailable/);
    expect(() => backend.removeItem?.('k')).not.toThrow();
  });
});

describe("web's widget store", () => {
  it('is honestly nothing — there are no widgets on the web', () => {
    expect(widgetStore()).toBeNull();
  });
});
