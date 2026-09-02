import { Platform, useWindowDimensions } from 'react-native';

import { BREAKPOINTS } from '@/styles/theme';

import { useHydrated } from './useHydrated';

export interface Breakpoint {
  width: number;
  /** Phone-shaped: stacked layout, horizontal category chips. */
  isCompact: boolean;
  /** Sidebar navigation and a multi-column grid. */
  isExpanded: boolean;
  /** Grid columns for the current width. */
  columns: number;
}

/** Width assumed during static rendering, before the client knows better. */
const SSR_WIDTH = 0;

export function useBreakpoint(): Breakpoint {
  const { width: measured } = useWindowDimensions();

  // On web the first client render must match the server's HTML. Real
  // dimensions are adopted on the next commit, once hydration is done.
  const hydrated = useHydrated();
  const width = Platform.OS !== 'web' || hydrated ? measured : SSR_WIDTH;
  /**
   * The desk is a web layout.
   *
   * Width alone put an iPad in portrait — 1024 points — into the
   * sidebar shell: a second set of tabs beside the real `NativeTabs`
   * bar, a top bar with no safe-area clearance under the status bar,
   * and a floating header the native stack was already drawing. The
   * phone layout on a tablet is a centred column with margins; the
   * desk layout on a tablet is broken chrome. Columns still follow the
   * width, so a tablet's grids fill it.
   */
  const isExpanded = Platform.OS === 'web' && width >= BREAKPOINTS.expanded;
  const columns =
    width >= BREAKPOINTS.wide
      ? 5
      : width >= BREAKPOINTS.expanded
        ? 4
        : width >= 520
          ? 3
          : 2;

  return { width, isCompact: !isExpanded, isExpanded, columns };
}
