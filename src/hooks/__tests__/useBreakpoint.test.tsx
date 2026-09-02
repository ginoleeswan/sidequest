import { renderHook } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';

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

const NATIVE_OS = Platform.OS;
const onWeb = () =>
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', {
    value: NATIVE_OS,
    configurable: true,
  });
});

describe('useBreakpoint', () => {
  it.each([
    [390, 2, false],
    [520, 3, false],
    [899, 3, false],
    [900, 4, true],
    [1400, 5, true],
  ])(
    'on the web, %spx → %s columns, expanded=%s',
    async (width, columns, expanded) => {
      onWeb();
      const bp = await at(width);
      expect(bp.columns).toBe(columns);
      expect(bp.isExpanded).toBe(expanded);
      expect(bp.isCompact).toBe(!expanded);
    }
  );

  /**
   * The desk is a web layout. A tablet gets the phone's layout at the
   * tablet's column count — never the sidebar shell, which duplicates
   * the native tab bar and has no safe-area clearance.
   */
  it('never expands on native, however wide the screen', async () => {
    const bp = await at(1024);
    expect(bp.isExpanded).toBe(false);
    expect(bp.isCompact).toBe(true);
    expect(bp.columns).toBe(4);
  });
});
