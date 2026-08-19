import { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { COLORS } from '@/styles/colors';

/**
 * A hairline that sweeps while new results are on the way.
 *
 * Used where the answer is being replaced rather than loaded from
 * nothing — the results you already have stay on screen and readable,
 * and this says "there's more coming" without throwing the page away.
 */
export function ProgressLine() {
  const progress = useAnimatedValue(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.bar,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-100%', '400%'],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  bar: {
    width: '25%',
    height: '100%',
    borderRadius: 1,
    backgroundColor: COLORS.plum,
  },
});
