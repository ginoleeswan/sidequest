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
}

/**
 * Pressable that springs down on touch.
 *
 * Style lands on the Pressable itself (not a wrapper) so that flex values
 * from a parent layout apply correctly.
 */
export function ScaleButton({
  onPress,
  children,
  style,
  activeScale = 0.9,
}: Props) {
  const scale = useAnimatedValue(1);

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      tension: 50,
      friction: 4,
      useNativeDriver: true,
    }).start();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => to(activeScale)}
      onPressOut={() => to(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
