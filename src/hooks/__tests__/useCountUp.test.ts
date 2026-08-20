import { act, renderHook } from '@testing-library/react-native';

import { useCountUp } from '../useCountUp';
import { useReducedMotion } from '../useReducedMotion';

jest.mock('../useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

/** A number that arrives by counting, where the number is the point. */
describe('useCountUp', () => {
  beforeEach(() => jest.mocked(useReducedMotion).mockReturnValue(false));

  it('starts where it was, not where it is going', async () => {
    const { result } = await renderHook(() => useCountUp(10, 4));
    expect(result.current).toBe(4);
  });

  it('gets there', async () => {
    const { result } = await renderHook(() => useCountUp(10, 4));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900));
    });
    expect(result.current).toBe(10);
  });

  /** Unrequested movement is a symptom for some people, not a flourish. */
  it('arrives immediately when less animation was asked for', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { result } = await renderHook(() => useCountUp(10, 4));
    expect(result.current).toBe(10);
  });

  /**
   * The whole point of a counter that waits for the reader to reach it
   * is that the number is not there beforehand.
   */
  it('waits at the starting number until it is told to run', async () => {
    const { result } = await renderHook(() => useCountUp(10, 4, false));
    expect(result.current).toBe(4);
  });

  it('still shows the final figure when animation is unwanted', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const { result } = await renderHook(() => useCountUp(10, 4, false));
    expect(result.current).toBe(10);
  });

  it('has nothing to do when the number did not change', async () => {
    const { result } = await renderHook(() => useCountUp(7, 7));
    expect(result.current).toBe(7);
  });
});
