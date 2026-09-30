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
      expect(bp.isDesk).toBe(expanded);
      expect(bp.isCompact).toBe(!expanded);
    }
  );

  /**
   * A tablet is wide, and is not a desk.
   *
   * The layout follows the width on every platform; the sidebar shell
   * is the web's alone. An 11-inch iPad in portrait (834) is a tablet;
   * the mini in portrait (744) and a Split View pane are phones.
   */
  it.each([
    [390, false, 2],
    [744, false, 4],
    [834, true, 4],
    [1024, true, 4],
    [1194, true, 5],
    [1366, true, 5],
  ])(
    'on native, %spt → expanded=%s, %s columns',
    async (width, expanded, columns) => {
      const bp = await at(width);
      expect(bp.isExpanded).toBe(expanded);
      expect(bp.isCompact).toBe(!expanded);
      expect(bp.isDesk).toBe(false);
      expect(bp.columns).toBe(columns);
    }
  );
});
