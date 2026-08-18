import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
}

/** Pressable that springs down on touch — replaces react-native-touchable-scale. */
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
    <Pressable
      onPress={onPress}
      onPressIn={() => to(activeScale)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
