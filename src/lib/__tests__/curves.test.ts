import {
  backOut,
  easeInCubic,
  easeOutCubic,
  easeOutQuint,
  shaped,
  springOut,
  stops,
} from '../curves';

/**
 * These exist so one linear driver can move things like objects rather
 * than like sliders, so what is worth asserting is the shape: does it
 * start and end where it should, and does it do the interesting thing
 * in between.
 */
describe('easings', () => {
  it.each([
    ['easeOutQuint', easeOutQuint],
    ['easeOutCubic', easeOutCubic],
    ['easeInCubic', easeInCubic],
  ])('%s runs from 0 to 1', (_label, ease) => {
    expect(ease(0)).toBeCloseTo(0);
    expect(ease(1)).toBeCloseTo(1);
  });

  it('eases OUT by covering most of the distance early', () => {
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.5);
    expect(easeOutQuint(0.25)).toBeGreaterThan(easeOutCubic(0.25));
  });

  it('eases IN by holding still and then going', () => {
    expect(easeInCubic(0.5)).toBeLessThan(0.25);
  });
});

describe('backOut', () => {
  it('lands exactly on its target', () => {
    expect(backOut()(0)).toBeCloseTo(0);
    expect(backOut()(1)).toBeCloseTo(1);
  });

  it('goes past the target before settling — the whole point', () => {
    const samples = Array.from({ length: 40 }, (_, i) => backOut(2)(i / 39));
    expect(Math.max(...samples)).toBeGreaterThan(1);
  });
});

describe('springOut', () => {
  it('is settled by the end', () => {
    expect(springOut()(1)).toBeCloseTo(1);
  });

  it('crosses its target more than once on the way', () => {
    const samples = Array.from({ length: 200 }, (_, i) =>
      springOut(2, 6)(i / 199)
    );
    const crossings = samples
      .slice(1)
      .filter((value, i) => (samples[i] - 1) * (value - 1) < 0).length;
    expect(crossings).toBeGreaterThanOrEqual(2);
  });

  it('damps: each overshoot is smaller than the one before', () => {
    const samples = Array.from({ length: 200 }, (_, i) =>
      springOut(2, 6)(i / 199)
    );
    const early = Math.max(
      ...samples.slice(0, 100).map((v) => Math.abs(v - 1))
    );
    const late = Math.max(...samples.slice(100).map((v) => Math.abs(v - 1)));
    expect(late).toBeLessThan(early);
  });
});

describe('shaped', () => {
  const frames = shaped([0.2, 0.6], 10, 20, easeOutCubic);

  it('samples across the window it was given, in order', () => {
    expect(frames.inputRange[0]).toBeCloseTo(0.2);
    expect(frames.inputRange[frames.inputRange.length - 1]).toBeCloseTo(0.6);
    const sorted = [...frames.inputRange].sort((a, b) => a - b);
    expect(frames.inputRange).toEqual(sorted);
  });

  it('starts at `from` and ends at `to`', () => {
    expect(frames.outputRange[0]).toBeCloseTo(10);
    expect(frames.outputRange[frames.outputRange.length - 1]).toBeCloseTo(20);
  });

  it('bends: the middle sample is not the midpoint', () => {
    const middle =
      frames.outputRange[Math.floor(frames.outputRange.length / 2)];
    expect(Math.abs(middle - 15)).toBeGreaterThan(1);
  });

  it('gives Animated the two ranges of equal length it requires', () => {
    expect(frames.inputRange).toHaveLength(frames.outputRange.length);
  });
});

describe('stops', () => {
  it('splits a table into the two ranges, in order', () => {
    const frames = stops([
      [0, 1],
      [0.5, 1.2],
      [1, 1],
    ]);
    expect(frames.inputRange).toEqual([0, 0.5, 1]);
    expect(frames.outputRange).toEqual([1, 1.2, 1]);
  });
});
