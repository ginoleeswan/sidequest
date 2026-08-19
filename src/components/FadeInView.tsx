import { useEffect } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}

/**
 * A short cross-fade on mount. Deliberately opacity only: content sliding
 * into place on every load reads as busy once you use the app for more
 * than a minute, and it fights the skeletons, which already hold the
 * exact final position.
 */
export function FadeInView({ children, style, delay = 0 }: Props) {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 170,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[style, { opacity: progress }]}
    >
      {children}
    </Animated.View>
  );
}
