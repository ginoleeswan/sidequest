import { useEffect } from 'react';
import { Animated, Platform } from 'react-native';

import { useAnimatedValue } from './useAnimatedValue';
import { useReducedMotion } from './useReducedMotion';

/**
 * How far the artwork lags the page as you scroll away from it.
 *
 * A hero that scrolls at exactly the speed of the text below it is a
 * picture on a page. One that holds back a fifth of the distance reads as
 * something the page is moving across — the cheapest depth cue there is,
 * and the one people recognise without being able to name it.
 *
 * Small on purpose. Every point of lag is height the artwork layer has
 * to carry above the frame, and that height comes off the top of the
 * source — which is exactly where key art puts heads, titles and sky. At
 * a third the hooded figure on the launch slide lost its head; at an
 * eighth the effect still reads and the composition survives.
 */
export const PARALLAX_RATE = 0.12;

/**
 * A translateY that trails the window's scroll position.
 *
 * Web only: on a native scroll view the same effect belongs on the
 * scroller's own event, and there is no window to listen to. Returns a
 * value pinned at 0 where the effect does not apply or is not wanted, so
 * callers can interpolate it unconditionally.
 */
export function useStageParallax(height: number): Animated.Value {
  const reduced = useReducedMotion();
  const offset = useAnimatedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || reduced) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      // One write per frame. A scroll event can fire several times
      // between paints, and each extra setValue is a layout the browser
      // throws away.
      frame = requestAnimationFrame(() => {
        frame = 0;
        // Past its own height the stage is gone; holding the value there
        // keeps the artwork from sliding out of its frame.
        const y = Math.min(window.scrollY, height);
        offset.setValue(y * PARALLAX_RATE);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [offset, height, reduced]);

  return offset;
}
