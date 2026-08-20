import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, View, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASING } from '@/styles/motion';

/**
 * Whether a thing has been looked at yet.
 *
 * Fires once and then stops watching: a section that re-animates every
 * time it scrolls past is a section arguing with the reader. Native
 * answers true immediately, because IntersectionObserver is a web API
 * and there is nothing to defer to.
 */
export function useInView(
  /**
   * The band of the viewport a thing has to enter to count as looked at,
   * as a negative inset on each edge.
   *
   * A proportion-of-the-element threshold was the obvious choice and the
   * wrong one: it depends on the element's height, and on a page whose
   * hero grows as its artwork arrives, the observer fires during layout
   * settling and the animation plays before anybody has scrolled. A
   * band is a fact about the viewport, so it does not care how tall the
   * thing is or what the page was doing a moment ago.
   */
  band = '-12%'
): [React.RefObject<View | null>, boolean] {
  const [seen, setSeen] = useState(Platform.OS !== 'web');
  const ref = useRef<View | null>(null);

  useEffect(() => {
    if (seen) return;
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { rootMargin: `${band} 0px ${band} 0px` }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, band]);

  return [ref, seen];
}

/**
 * A section arriving as it is reached.
 *
 * The landing page opened with a staggered masthead and then went
 * completely still, which is worse than never having moved: it promises
 * a page that is alive and then delivers a document. This is the same
 * curve the rest of the app decelerates on, so a reveal here and a
 * screen arriving elsewhere feel like one hand.
 *
 * `from` exists because a page whose every section rises from the
 * bottom is a page with one idea about motion. Content that sits on the
 * left should enter from the left — the direction carries the layout's
 * own logic rather than fighting it.
 */
export function Rise({
  children,
  from = 'below',
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  from?: 'below' | 'left' | 'right';
  delay?: number;
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView();
  const enter = useAnimatedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || !seen) return;
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: DURATION.entrance,
      delay,
      easing: EASING.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, seen, delay, reduced]);

  const travel = enter.interpolate({
    inputRange: [0, 1],
    outputRange:
      from === 'below' ? [22, 0] : from === 'left' ? [-26, 0] : [26, 0],
  });

  return (
    <View ref={ref} style={style}>
      <Animated.View
        style={{
          opacity: enter,
          transform: [
            from === 'below' ? { translateY: travel } : { translateX: travel },
          ],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
