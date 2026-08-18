import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { BREAKPOINTS } from '@/styles/theme';

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
  // dimensions are adopted on the next tick, once hydration is complete.
  const [hydrated, setHydrated] = useState(Platform.OS !== 'web');
  useEffect(() => {
    // Deliberate: this is the hydration handshake, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const width = hydrated ? measured : SSR_WIDTH;
  const isExpanded = width >= BREAKPOINTS.expanded;
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
