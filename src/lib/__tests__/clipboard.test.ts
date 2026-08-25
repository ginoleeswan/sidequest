import { Share } from 'react-native';

import { CAN_COPY, handOff } from '../clipboard';

/**
 * The module exists to stop a specific lie — "copied" about a copy that
 * never happened — so its truthfulness under refusal and dismissal is
 * the whole contract.
 */
describe('handOff on native', () => {
  it('is the share sheet, honestly reported', async () => {
    expect(CAN_COPY).toBe(false); // jest runs the native paths
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction } as never);
    await expect(handOff('my library')).resolves.toBe(true);
    expect(share).toHaveBeenCalledWith({ message: 'my library' });
    share.mockRestore();
  });

  it('a dismissed sheet is false, not an exception', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.dismissedAction } as never);
    await expect(handOff('x')).resolves.toBe(false);
    share.mockRestore();
  });

  it('a sheet that throws is also false', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockRejectedValue(new Error('no activity'));
    await expect(handOff('x')).resolves.toBe(false);
    share.mockRestore();
  });
});

describe('handOff on web', () => {
  /**
   * CAN_COPY is computed at import time from Platform.OS, and
   * resetModules gives react-native a fresh registry too — so the web
   * flavour has to be built whole: reset, flip the FRESH Platform, then
   * require the module under test.
   */
  const freshWeb = () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh registry on purpose
    const rn = require('react-native') as { Platform: { OS: string } };
    rn.Platform.OS = 'web';
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh registry on purpose
    return require('../clipboard') as typeof import('../clipboard');
  };

  afterEach(() => {
    jest.resetModules();
    // @ts-expect-error test-installed global
    delete globalThis.navigator.clipboard;
  });

  it('reports a blocked write as false, not as copied', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    const fresh = freshWeb();
    expect(fresh.CAN_COPY).toBe(true);
    await expect(fresh.handOff('x')).resolves.toBe(false);
  });

  it('a successful write is true', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    });
    const fresh = freshWeb();
    await expect(fresh.handOff('x')).resolves.toBe(true);
    expect(write).toHaveBeenCalledWith('x');
  });
});
