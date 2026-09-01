import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Whether a piece of chrome should get out of the way of reading.
 *
 * True while the page is being scrolled down past the top; false again
 * the moment it comes back up. The streaming apps hide their filter
 * pills exactly this way - a row that is useful when you arrive and
 * in the way while you read - and restoring on the first upward
 * scroll is what makes it feel like the row was never taken, only
 * tucked. Web only: on native the header is a different object.
 *
 * A small threshold before hiding, none before showing: a row that
 * flickers at the top of a page is worse than one that never moves.
 */
export function useScrollHides(threshold = 96): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const down = y > last;
      last = y;
      if (down && y > threshold) setHidden(true);
      else if (!down) setHidden(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return hidden;
}
