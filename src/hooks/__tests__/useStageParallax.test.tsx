import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { PARALLAX_RATE, useStageParallax } from '../useStageParallax';
import { useReducedMotion } from '../useReducedMotion';

/**
 * Depth, and the two ways it must decline to happen: where there is no
 * window to listen to, and where somebody has asked for less motion.
 * The coalescing matters too — a scroll event can fire several times
 * between paints, and every extra write is a layout the browser throws
 * away.
 */
jest.mock('../useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));
const mockedReduced = useReducedMotion as jest.Mock;

const listeners: Record<string, (() => void)[]> = {};
let frames: (() => void)[] = [];
const was = Platform.OS;

beforeEach(() => {
  mockedReduced.mockReturnValue(false);
  for (const key of Object.keys(listeners)) delete listeners[key];
  frames = [];
  (Platform as { OS: string }).OS = 'web';
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      scrollY: 0,
      addEventListener: (name: string, fn: () => void) => {
        (listeners[name] ??= []).push(fn);
      },
      removeEventListener: (name: string, fn: () => void) => {
        listeners[name] = (listeners[name] ?? []).filter((f) => f !== fn);
      },
    },
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (fn: () => void) => {
      frames.push(fn);
      return frames.length;
    },
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: () => {},
  });
});

afterEach(() => {
  (Platform as { OS: string }).OS = was;
  // @ts-expect-error test-installed
  delete globalThis.window;
});

const scrollTo = (y: number) => {
  (globalThis as { window: { scrollY: number } }).window.scrollY = y;
  for (const fn of listeners.scroll ?? []) fn();
};
const paint = () => {
  const queued = frames;
  frames = [];
  for (const fn of queued) fn();
};

/** Animated.Value keeps its number where the tests can read it. */
const valueOf = (v: { __getValue: () => number }) => v.__getValue();

describe('useStageParallax', () => {
  it('trails the scroll at the documented rate', async () => {
    const { result } = await renderHook(() => useStageParallax(600));
    await act(async () => {
      scrollTo(200);
      paint();
    });
    expect(
      valueOf(result.current as unknown as { __getValue: () => number })
    ).toBeCloseTo(200 * PARALLAX_RATE);
  });

  it('stops at its own height, so the artwork never leaves its frame', async () => {
    const { result } = await renderHook(() => useStageParallax(300));
    await act(async () => {
      scrollTo(5000);
      paint();
    });
    expect(
      valueOf(result.current as unknown as { __getValue: () => number })
    ).toBeCloseTo(300 * PARALLAX_RATE);
  });

  it('writes once per frame however many events arrive', async () => {
    await renderHook(() => useStageParallax(600));
    await act(async () => {
      scrollTo(10);
      scrollTo(20);
      scrollTo(30);
    });
    // Three events, one queued frame — the rest were coalesced away.
    expect(frames).toHaveLength(1);
  });

  it('lets go of the listener when the stage unmounts', async () => {
    const { unmount } = await renderHook(() => useStageParallax(600));
    expect(listeners.scroll).toHaveLength(1);
    await act(async () => unmount());
    expect(listeners.scroll).toHaveLength(0);
  });

  it('declines where less motion was asked for', async () => {
    mockedReduced.mockReturnValue(true);
    const { result } = await renderHook(() => useStageParallax(600));
    expect(listeners.scroll ?? []).toHaveLength(0);
    expect(
      valueOf(result.current as unknown as { __getValue: () => number })
    ).toBe(0);
  });

  it('declines off-web, where there is no window to listen to', async () => {
    (Platform as { OS: string }).OS = 'ios';
    await renderHook(() => useStageParallax(600));
    expect(listeners.scroll ?? []).toHaveLength(0);
  });
});
