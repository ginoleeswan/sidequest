import { Platform, useWindowDimensions } from 'react-native';

import { BREAKPOINTS, LAYOUT } from '@/styles/theme';

import { useHydrated } from './useHydrated';

export interface Breakpoint {
  width: number;
  /** Phone-shaped: stacked layout, horizontal category chips. */
  isCompact: boolean;
  /**
   * The wide layout: a multi-column grid, the game page's rail beside
   * its column, the plan's dials side by side. True on a desk and on a
   * tablet alike — it describes the page, not the chrome around it.
   */
  isExpanded: boolean;
  /**
   * The web's sidebar shell, and only that.
   *
   * Two different questions used to share one answer. "Is there room
   * for two columns" and "is there a sidebar with the navigation in
   * it" agree on a monitor and disagree on an iPad, which has the room
   * and has a native tab bar instead of the sidebar. Chrome decisions —
   * the top bar, the back button, the clearance a page leaves for
   * either — read this; layout decisions read `isExpanded`.
   */
  isDesk: boolean;
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
   * A tablet gets the wide layout, not the phone's centred in a field.
   *
   * For a while width alone put an iPad into the sidebar shell — a
   * second set of tabs beside the real `NativeTabs` bar, a top bar with
   * no safe-area clearance — and the fix was to deny native the wide
   * layout altogether, which left a 13-inch screen drawing a phone page
   * in a 720-point column. The shell was the problem, never the
   * layout. `DesktopShell` now knows what to draw on each platform, so
   * the layout follows the width everywhere and only the chrome asks
   * which platform it is on.
   */
  /**
   * `EXPO_PUBLIC_PREVIEW_TABLET` makes a web export stand in for a
   * native tablet — the wide layout with no desk chrome — so the iPad
   * can be looked at in a browser (`npm run shots:ipad`). Inlined at
   * export time; unset, this whole branch is a constant.
   */
  const previewTablet = process.env.EXPO_PUBLIC_PREVIEW_TABLET === '1';
  const isExpanded =
    width >=
    (Platform.OS === 'web' && !previewTablet
      ? BREAKPOINTS.expanded
      : BREAKPOINTS.tablet);
  const isDesk = Platform.OS === 'web' && !previewTablet && isExpanded;
  /**
   * Columns follow the room a grid actually has.
   *
   * The thresholds were tuned for browser windows, where the sidebar
   * takes its share of the width before the grid gets any. A tablet
   * gives the grid the whole screen, so it is measured as the window
   * a desk would need to offer the same room: a 13-inch iPad on its
   * side (1366) is a 1600-point browser as far as a shelf is concerned,
   * and gets the five columns one would.
   */
  const tablet = Platform.OS !== 'web' || previewTablet;
  const room = tablet ? width + LAYOUT.sidebarWidth : width;
  const columns =
    room >= BREAKPOINTS.wide
      ? 5
      : room >= BREAKPOINTS.expanded
        ? 4
        : width >= 520
          ? 3
          : 2;

  return { width, isCompact: !isExpanded, isExpanded, isDesk, columns };
}
