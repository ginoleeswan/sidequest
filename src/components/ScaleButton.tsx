import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  /** Scale while the pointer hovers (web/desktop). 1 disables. */
  hoverScale?: number;
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
}: Props) {
  const scale = useAnimatedValue(1);

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      tension: 60,
      friction: 6,
      useNativeDriver: true,
    }).start();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => to(activeScale)}
      onPressOut={() => to(hoverScale > 1 ? hoverScale : 1)}
      onHoverIn={() => hoverScale !== 1 && to(hoverScale)}
      onHoverOut={() => to(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
