import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Mark } from './Mark';
import { useInView } from './Rise';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { LANDING_WELL } from '@/styles/landing';
import { TYPE } from '@/styles/typography';

/**
 * The end of the page, drawn as a place.
 *
 * Every band above this one ends in a straight line, which is what
 * makes them bands; a page that ended on one more straight line would
 * just stop. Instead the footer's ground rises as a hill against the
 * deep band above it, and the Mark climbs up from behind the crest to
 * stand on it — the flag planted at the end of the trail the quest
 * line has been drawing all the way down. The one word under it says
 * what finishing a page of this app ought to say.
 *
 * The rise works by paint order, not clipping: the Mark sits behind
 * the hill's fill and translates up, so the hill itself hides it until
 * it clears the crest — the same trick as a sunrise, which is what it
 * should feel like.
 */
export function Horizon() {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-8%');
  const rise = useAnimatedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || !seen) return;
    const animation = Animated.timing(rise, {
      toValue: 1,
      duration: DURATION.entrance,
      easing: EASING.standard,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [rise, seen, reduced]);

  return (
    <View ref={ref} style={styles.scene} pointerEvents="none">
      {/* Behind the hill: rises into view over its crest. */}
      <Animated.View
        style={[
          styles.mark,
          {
            transform: [
              {
                translateY: rise.interpolate({
                  inputRange: [0, 1],
                  outputRange: [64, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Mark size={54} />
      </Animated.View>

      {/* The hill, painted over the Mark's feet. */}
      <Svg
        width="100%"
        height={90}
        viewBox="0 0 1000 90"
        preserveAspectRatio="none"
        style={styles.hill}
      >
        <Path
          d="M0 90 V64 C 280 14, 720 14, 1000 64 V90 Z"
          fill={COLORS.navy}
        />
        {/* The trail, carrying on over the hill. Dashed like the
            unwalked road in the quest line, so the page's last drawing
            says the obvious warm thing: there is more past the edge. */}
        <Path
          d="M0 64 C 280 14, 720 14, 1000 64"
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={2}
          strokeDasharray="1 9"
          strokeLinecap="round"
          opacity={0.75}
        />
      </Svg>

      <Animated.Text
        style={[
          styles.word,
          {
            opacity: rise.interpolate({
              inputRange: [0.6, 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        QUEST COMPLETE
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    // The deep band above continues behind the hill, so the crest reads
    // against it rather than against a seam.
    backgroundColor: LANDING_WELL,
    paddingTop: 44,
    overflow: 'hidden',
  },
  mark: { alignItems: 'center', marginBottom: -14 },
  hill: { marginTop: 0 },
  word: {
    ...TYPE.micro,
    color: COLORS.accent,
    textAlign: 'center',
    backgroundColor: COLORS.navy,
    paddingBottom: 10,
  },
});
