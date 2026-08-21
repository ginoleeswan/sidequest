import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
      /**
       * Generous above, held back below.
       *
       * A band in the middle of the viewport is skippable: flick or jump
       * past a section in one frame and it never reports intersecting,
       * so it stays invisible for the rest of the visit. Content that
       * never appears is far worse than content that does not animate.
       * Extending the top margin means anything at or above the fold
       * counts as reached, whether it was scrolled to or scrolled past,
       * while the held bottom edge still makes it wait its turn on the
       * way down.
       */
      { rootMargin: `400% 0px ${band} 0px` }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen, band]);

  return [ref, seen];
}

/**
 * How a thing arrives.
 *
 * A page where every section fades up by twenty-two pixels has one idea
 * about motion, repeated until it stops registering as motion at all —
 * which is exactly what a reader means when they say the animations are
 * all the same. These are six, and they are assigned by what the thing
 * *is*, not for variety's sake:
 *
 * - `below`   body copy and lists: the neutral one, still the default.
 * - `left` / `right` content that already sits on that side of a split,
 *           so the direction carries the layout's own logic.
 * - `mask`   a curtain, for headlines. No fade — the words climb out of
 *            a clipped edge, which is how type is meant to arrive and is
 *            the one entrance nobody mistakes for a fade.
 * - `lift`   artwork and cards: a shallow scale up, as if picked off the
 *            page. Wrong for text (it blurs during the tween) and right
 *            for anything with a frame.
 * - `tilt`   the one showpiece object per page, straightening as it
 *            lands. Used once. Twice would be a gimmick.
 */
export type Entrance = 'below' | 'left' | 'right' | 'mask' | 'lift' | 'tilt';

/** A curtain travels further and slower than a nudge does. */
const SPAN: Record<Entrance, number> = {
  below: DURATION.entrance * 0.62,
  left: DURATION.entrance * 0.62,
  right: DURATION.entrance * 0.62,
  mask: DURATION.entrance * 0.85,
  lift: DURATION.entrance * 0.72,
  tilt: DURATION.entrance,
};

/**
 * A section arriving as it is reached.
 *
 * The landing page opened with a staggered masthead and then went
 * completely still, which is worse than never having moved: it promises
 * a page that is alive and then delivers a document. This is the same
 * curve the rest of the app decelerates on, so a reveal here and a
 * screen arriving elsewhere feel like one hand.
 */
export function Rise({
  children,
  from = 'below',
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  from?: Entrance;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView();
  const enter = useAnimatedValue(reduced ? 1 : 0);
  /**
   * The curtain needs to know how tall the thing behind it is. Nothing
   * else does, so nothing else pays for the layout pass.
   */
  const [height, setHeight] = useState(0);
  const measure = useCallback(
    (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
    []
  );
  const masking = from === 'mask';

  useEffect(() => {
    if (reduced || !seen) return;
    // A curtain with nothing measured behind it would slide zero pixels
    // and read as a hard cut, so it waits for its one layout pass.
    if (masking && height === 0) return;
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: SPAN[from],
      delay,
      easing: EASING.standard,
      /**
       * The JS driver, deliberately.
       *
       * With the native driver react-native-web does not write the
       * value's starting style to the DOM — it only begins writing once
       * an animation runs. So a section waiting to be revealed sat at
       * full opacity until it was reached and then flashed from nothing
       * to everything, which is worse than never having animated. The
       * JS driver writes every frame, including the first.
       */
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, seen, delay, reduced, from, masking, height]);

  const to = (outputRange: number[]) =>
    enter.interpolate({ inputRange: [0, 1], outputRange });

  if (masking) {
    return (
      <View ref={ref} style={style}>
        <View style={{ overflow: 'hidden' }}>
          <Animated.View
            onLayout={measure}
            style={{
              transform: [{ translateY: to([height || 40, 0]) }],
            }}
          >
            {children}
          </Animated.View>
        </View>
      </View>
    );
  }

  const transform =
    from === 'left'
      ? [{ translateX: to([-26, 0]) }]
      : from === 'right'
        ? [{ translateX: to([26, 0]) }]
        : from === 'lift'
          ? [{ translateY: to([18, 0]) }, { scale: to([0.94, 1]) }]
          : from === 'tilt'
            ? [
                { translateY: to([26, 0]) },
                { scale: to([0.96, 1]) },
                {
                  rotate: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-3.5deg', '0deg'],
                  }),
                },
              ]
            : [{ translateY: to([22, 0]) }];

  return (
    <View ref={ref} style={style}>
      <Animated.View style={{ opacity: enter, transform }}>
        {children}
      </Animated.View>
    </View>
  );
}
