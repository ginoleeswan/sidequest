import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { useBreakpoint } from '../useBreakpoint';

/**
 * The width-to-columns mapping every grid in the app hangs off. Home's
 * suite mocks this hook wholesale, so until now the real mapping had
 * never executed anywhere.
 */
const at = async (width: number) => {
  jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
  const { result } = await renderHook(() => useBreakpoint());
  return result.current;
};

afterEach(() => jest.restoreAllMocks());

describe('useBreakpoint', () => {
  it.each([
    [390, 2, false],
    [520, 3, false],
    [899, 3, false],
    [900, 4, true],
    [1400, 5, true],
  ])('%spx → %s columns, expanded=%s', async (width, columns, expanded) => {
    const bp = await at(width);
    expect(bp.columns).toBe(columns);
    expect(bp.isExpanded).toBe(expanded);
    expect(bp.isCompact).toBe(!expanded);
  });
});
