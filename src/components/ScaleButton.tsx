import {
  Animated,
  Pressable,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic as feel, type Haptic } from '@/lib/haptics';
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
  /** What the finger feels when the press lands. */
  haptic?: Haptic;
  accessibilityHint?: string;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
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
  haptic,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
}: Props) {
  const scale = useAnimatedValue(1);
  const dim = useAnimatedValue(1);
  const reduced = useReducedMotion();

  const to = (value: number) => {
    if (reduced) {
      // Reduce Motion asks for less movement, not for no answer. With
      // the spring switched off this used to give no feedback at all,
      // so every card went dead under the finger for exactly the people
      // who had asked the phone to be calmer. A dim is not motion.
      dim.setValue(value < 1 ? 0.7 : 1);
      return;
    }
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
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={() => {
        feel(haptic);
        onPress();
      }}
      onPressIn={() => {
        onPressIn?.();
        to(activeScale);
      }}
      onPressOut={() => to(hoverScale > 1 ? hoverScale : 1)}
      onHoverIn={() => hoverScale !== 1 && to(hoverScale)}
      onHoverOut={() => to(1)}
      style={[style, { opacity: dim, transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
