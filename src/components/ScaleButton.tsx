import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING } from '@/styles/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  /** Scale while the pointer hovers (web/desktop). 1 disables. */
  hoverScale?: number;
  accessibilityLabel?: string;
  /**
   * Fired the moment a finger lands, before the press completes.
   *
   * The point is prefetching. Hover is the usual trigger for warming the
   * next screen, and hover does not exist on a touch device — so phones,
   * which need the head start most, were the only ones not getting it.
   * Press-in to press-out is a couple of hundred milliseconds of free
   * network time, and by then the user has committed.
   */
  onPressIn?: () => void;
}

/**
 * Pressable that springs down on touch and lifts on pointer hover.
 *
 * Style lands on the Pressable itself (not a wrapper) so that flex values
 * from a parent layout apply correctly.
 */
export function ScaleButton({
  onPress,
  children,
  style,
  activeScale = 0.9,
  hoverScale = 1,
  accessibilityLabel,
  onPressIn,
}: Props) {
  const scale = useAnimatedValue(1);
  const reduced = useReducedMotion();

  const to = (value: number) => {
    if (reduced) return;
    Animated.spring(scale, {
      toValue: value,
      ...SPRING.press,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        onPressIn?.();
        to(activeScale);
      }}
      onPressOut={() => to(hoverScale > 1 ? hoverScale : 1)}
      onHoverIn={() => hoverScale !== 1 && to(hoverScale)}
      onHoverOut={() => to(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
