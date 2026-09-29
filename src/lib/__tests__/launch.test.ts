/**
 * What is below the fold waits for the launch curtain, then comes in
 * one piece at a time — never in one burst on the frame it lifts.
 */
describe('the launch curtain queue', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  const load = () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../launch') as typeof import('../launch');

  it('runs at once when no curtain was raised', () => {
    const { afterCurtain } = load();
    const run = jest.fn();
    afterCurtain(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('holds work while the curtain is up, then releases it spaced out', () => {
    const { afterCurtain, lowerCurtain, raiseCurtain } = load();
    raiseCurtain();
    const first = jest.fn();
    const second = jest.fn();
    afterCurtain(first);
    afterCurtain(second);
    expect(first).not.toHaveBeenCalled();

    lowerCurtain();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('lets go on its own if the curtain never comes down', () => {
    const { afterCurtain, raiseCurtain } = load();
    raiseCurtain();
    const run = jest.fn();
    afterCurtain(run);
    jest.advanceTimersByTime(3000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('skips work whose owner has gone', () => {
    const { afterCurtain, lowerCurtain, raiseCurtain } = load();
    raiseCurtain();
    const run = jest.fn();
    const cancel = afterCurtain(run);
    cancel();
    lowerCurtain();
    jest.advanceTimersByTime(100);
    expect(run).not.toHaveBeenCalled();
  });
});
