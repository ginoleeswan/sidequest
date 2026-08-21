import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { MarkDraw } from './MarkDraw';
import { Rise, useInView } from './Rise';
import { ScaleButton } from './ScaleButton';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { LANDING_WELL } from '@/styles/landing';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The end of the page, drawn as a place — and now as a time of day.
 *
 * The first version was a hill with a mark on it, which is a diagram of
 * this idea. The scene it wanted to be is dusk at the end of a walk:
 * a handful of stars out in the deep band, a warm glow coming up from
 * behind the crest, and the Mark rising into it — its amber ball
 * reading as the last of the light. QUEST COMPLETE where the trail
 * ends, and the one thing left to do sitting right on the hill:
 * start your own.
 *
 * The stars are placed by hand rather than scattered by a random
 * number, because a static export renders once and a page must not
 * disagree with itself between server and client. Three of them
 * breathe on slow, offset clocks — the only ambient motion in the
 * scene, and enough to make the sky a sky.
 */

/** [x, y, r, opacity] in the sky's 1000x150 space. */
const STARS: [number, number, number, number][] = [
  [88, 38, 1.6, 0.5],
  [176, 96, 1.1, 0.3],
  [268, 22, 1.4, 0.4],
  [370, 70, 1.1, 0.28],
  [498, 30, 1.8, 0.55],
  [590, 88, 1.1, 0.3],
  [668, 48, 1.4, 0.4],
  [760, 18, 1.1, 0.32],
  [842, 76, 1.6, 0.45],
  [930, 40, 1.1, 0.3],
];

/** Which stars breathe, and how far apart their clocks start. */
const TWINKLE = [0, 4, 8];

export function Horizon({ onStart }: { onStart?: () => void }) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-8%');
  const rise = useAnimatedValue(reduced ? 1 : 0);
  const breathe = useAnimatedValue(0);

  useEffect(() => {
    if (reduced || !seen) return;
    const animation = Animated.timing(rise, {
      toValue: 1,
      duration: DURATION.entrance,
      easing: EASING.standard,
      useNativeDriver: false,
    });
    animation.start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2600,
          easing: EASING.linear,
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2600,
          easing: EASING.linear,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => {
      animation.stop();
      loop.stop();
    };
  }, [rise, breathe, seen, reduced]);

  return (
    <View ref={ref} style={styles.scene} pointerEvents="box-none">
      {/* The sky and the hill share one measured zone, so the Mark can
          be placed against the crest by coordinate rather than by
          margin luck. Paint order inside: sky, hill, Mark — the Mark
          last, so the plinth overtly sits ON the lip with the ridge
          running behind its feet. */}
      <View style={styles.skyzone} pointerEvents="none">
        <Svg
          width="100%"
          height={260}
          viewBox="0 0 1000 260"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="dusk" cx="50%" cy="100%" rx="42%" ry="70%">
              <Stop offset="0" stopColor={COLORS.accent} stopOpacity="0.26" />
              <Stop offset="0.55" stopColor={COLORS.accent} stopOpacity="0.1" />
              <Stop offset="1" stopColor={COLORS.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="500" cy="260" rx="430" ry="200" fill="url(#dusk)" />
          {STARS.map(([x, y, r, o], index) => (
            <Circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={r}
              fill={index % 3 === 0 ? COLORS.accent : COLORS.white}
              opacity={o}
            />
          ))}
        </Svg>
        {/* Three of the stars, breathing over the static field. */}
        {!reduced &&
          TWINKLE.map((slot, index) => {
            const [x, y, r] = STARS[slot];
            return (
              <Animated.View
                key={slot}
                style={[
                  styles.twinkle,
                  {
                    left: `${x / 10}%`,
                    top: y,
                    width: r * 4,
                    height: r * 4,
                    borderRadius: r * 2,
                    opacity: breathe.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange:
                        index % 2 === 0 ? [0.1, 0.6, 0.1] : [0.55, 0.15, 0.55],
                    }),
                  },
                ]}
              />
            );
          })}

        <Svg
          width="100%"
          height={120}
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
          style={styles.hill}
        >
          <Path
            d="M0 120 V86 C 280 18, 720 18, 1000 86 V120 Z"
            fill={COLORS.navy}
          />
          {/* The trail, carrying on over the hill — dashed like the
              unwalked road in the quest line, because the page's last
              drawing should say the obvious warm thing: there is more
              past the edge. */}
          <Path
            d="M0 86 C 280 18, 720 18, 1000 86"
            fill="none"
            stroke={COLORS.accent}
            strokeWidth={2}
            strokeDasharray="1 9"
            strokeLinecap="round"
            opacity={0.75}
          />
        </Svg>

        {/* The contact shadow, on the hill and under the base. An
            object with nothing beneath it reads as floating however
            carefully it is placed; a soft dark ellipse where it meets
            the ground is what says "standing". */}
        <Animated.View
          style={[
            styles.contact,
            {
              opacity: rise.interpolate({
                inputRange: [0.45, 1],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />

        {/* Standing on the crest: base landing on the ridge line,
            painted after the hill, constructing itself as it settles. */}
        <Animated.View
          style={[
            styles.mark,
            {
              transform: [
                {
                  translateY: rise.interpolate({
                    inputRange: [0, 1],
                    outputRange: [26, 0],
                  }),
                },
              ],
              opacity: rise.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [0, 1, 1],
              }),
            },
          ]}
        >
          <MarkDraw size={148} play={seen} />
        </Animated.View>
      </View>

      {/* On the hill: the word, and the only thing left to do. */}
      <View style={styles.summit}>
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
        {onStart && (
          <Rise delay={200}>
            <ScaleButton
              onPress={onStart}
              style={styles.start}
              activeScale={0.97}
              hoverScale={1.03}
              accessibilityLabel="Start your own quest"
            >
              <Text style={styles.startLabel}>Start yours</Text>
            </ScaleButton>
          </Rise>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    // The deep band above continues behind the sky, so the crest reads
    // against it rather than against a seam.
    backgroundColor: LANDING_WELL,
    overflow: 'hidden',
  },
  skyzone: { height: 260 },
  twinkle: { position: 'absolute', backgroundColor: COLORS.white },
  hill: { position: 'absolute', bottom: 0, left: 0 },
  /**
   * Placed by coordinate: the hill's apex sits 18 units above its own
   * base, so a bottom of 88 puts the plinth's base about 14 pixels over
   * the ridge — standing on the lip, ridge behind the feet.
   */
  mark: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  contact: {
    position: 'absolute',
    bottom: 78,
    alignSelf: 'center',
    width: 96,
    height: 16,
    borderRadius: 8,
    // Softened with boxShadow, not filter: react-native-web drops
    // `filter` from a StyleSheet without a word, so a blur written
    // there is simply never applied. A spread shadow in the same
    // colour gives the ellipse the soft edge a contact shadow needs.
    backgroundColor: 'rgba(9,12,19,0.55)',
    boxShadow: '0 0 16px 10px rgba(9,12,19,0.55)',
  },
  summit: {
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  word: {
    ...TYPE.micro,
    // Set as the destination sign it is, not a footnote: finishing's
    // own colour, at a size the moment has earned.
    fontSize: 15,
    letterSpacing: 5,
    color: COLORS.mint,
  },
  start: {
    paddingVertical: 16,
    paddingHorizontal: SPACING.xl + 4,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    boxShadow: '0 4px 0 #B87A16',
  },
  startLabel: { ...TYPE.label, fontSize: 16, color: COLORS.navy },
});
