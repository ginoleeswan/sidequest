import { useState } from 'react';
import { Animated } from 'react-native';

/**
 * Stable Animated.Value without touching a ref during render.
 * React Native core ships a useAnimatedValue hook, but react-native-web
 * does not implement it — this covers all platforms.
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
