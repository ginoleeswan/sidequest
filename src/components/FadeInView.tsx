import { useEffect } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASING } from '@/styles/motion';

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
  const reduced = useReducedMotion();
  const progress = useAnimatedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION.fast,
      delay,
      easing: EASING.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, reduced]);

  return (
    <Animated.View style={[style, { opacity: progress }]}>
      {children}
    </Animated.View>
  );
}
