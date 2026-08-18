import { act, renderHook } from '@testing-library/react-native';

import { useDebounced } from '../useDebounced';

describe('useDebounced', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebounced('a', 400));
    expect(result.current).toBe('a');
  });

  it('withholds updates until the delay elapses', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebounced(value, 400),
      { initialProps: { value: 'a' } }
    );

    await rerender({ value: 'b' });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(399);
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('only emits the final value in a burst of changes', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebounced(value, 400),
      { initialProps: { value: '' } }
    );

    for (const value of ['h', 'ha', 'hal', 'half']) {
      await rerender({ value });
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }

    expect(result.current).toBe('');

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe('half');
  });
});
