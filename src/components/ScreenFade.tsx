import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASING } from '@/styles/motion';

/**
 * A screen arrives rather than replaces.
 *
 * Navigation was a hard cut: one screen simply became another, which is
 * the single most common tell that a web app was assembled rather than
 * designed. The obvious fix — the navigator's own `animation: 'fade'` —
 * turned out to do nothing at all on expo-router's web navigator. Not
 * one element's opacity moved across forty sampled frames, and every
 * check in the suite passed while the feature did not exist, which is
 * what a screen option that silently no-ops looks like from the outside.
 *
 * So it is done here, where it can be seen to work. Deliberately short
 * and shallow: this is a tool people open to answer one question, and a
 * transition that makes anyone wait for it has taken more than it gave.
 * The first render is left alone — the app arriving should not fade in
 * over its own load — and anyone who has asked for less animation gets
 * the cut back.
 */
export function ScreenFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const opacity = useAnimatedValue(1);
  const settled = useRef(false);

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    if (!settled.current) {
      // First paint: the page is already arriving on its own.
      settled.current = true;
      return;
    }
    opacity.setValue(0.55);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: DURATION.base,
      easing: EASING.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pathname, opacity, reduced]);

  return (
    <Animated.View style={[styles.fill, { opacity }]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
