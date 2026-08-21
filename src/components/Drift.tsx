import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

import { drift, useScrollTravel } from '@/hooks/useScrollTravel';

/**
 * Something that moves at a different rate to the page it is on.
 *
 * Two things in a row travelling at exactly the same speed are a
 * picture; the same two at slightly different speeds are a space with
 * depth in it, and the reader recognises the difference without ever
 * being able to name it. Because the offset is tied to scroll position
 * rather than to a trigger, it is still doing something on the way back
 * up — which is the part a one-shot reveal can never manage.
 *
 * Small numbers only. Past about forty points this stops reading as
 * depth and starts reading as an element that has come loose.
 */
export function Drift({
  distance = 24,
  style,
  testID,
  children,
}: {
  /** Positive lags the page, negative leads it. */
  distance?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Names the moving element, which is worth more than it looks.
   *
   * Scrubbed motion can only be checked by watching one element across
   * several scroll positions, and finding that element by walking the
   * tree costs a wrong answer every time the layout changes — four of
   * them, in this component's case, all of them confidently reported.
   * A name makes the measurement about an identity instead of about
   * whatever matched a pattern first.
   */
  testID?: string;
  children: React.ReactNode;
}) {
  const [ref, travel] = useScrollTravel();

  return (
    <View ref={ref} style={style}>
      <Animated.View
        testID={testID}
        style={{ transform: [{ translateY: drift(travel, distance) }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
