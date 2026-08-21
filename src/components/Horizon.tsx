import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
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
import { SEAM_GLYPHS } from './SeamGlyphs';
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
 * scene, and enough to make the sky a sky. The dot-stars this scene
 * opened with are gone: at two pixels they read as dust on the screen,
 * not as night, and the constellation of game shapes says "sky" better
 * with five objects than the dots said it with ten.
 */

/**
 * The constellation: the pile's own shapes, up in the sky.
 *
 * The dusk had ten dots and nothing else, and the space above the
 * ridge read as empty rather than as night. These are the same flat
 * game shapes that ride the wavy seam earlier on the page — small,
 * faint, and adrift among the stars, riding the scene's one breathing
 * clock at offset phases. The quiet joke is the page's whole argument:
 * the games you let go of become stars to look at, not weights to
 * carry. Kept clear of the centre, where the Mark stands, and sized
 * like a night sky is: two bright near things, a scatter of middle
 * ones, and small far ones — eight shapes across four sizes, where
 * five near-equals read as a pattern, not a depth.
 *
 * [glyph, left%, top, size, tilt, drift direction]
 */
const FLOATERS: [number, `${number}%`, number, number, number, 1 | -1][] = [
  [0, '6%', 44, 26, -10, 1],
  [4, '16%', 118, 13, 14, -1],
  [2, '25%', 96, 19, 8, -1],
  [5, '34%', 30, 14, -8, 1],
  [3, '52%', 12, 17, -6, 1],
  [1, '68%', 108, 15, 10, -1],
  [5, '78%', 44, 12, -12, -1],
  [0, '88%', 84, 22, 12, 1],
];

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
            {/* Lands on zero, not on a tenth. Ending at 0.1 left the
                hill's last row two and a half units darker than the
                summit directly beneath it — a hairline step exactly
                where the two are meant to be one ground. A shadow that
                fades to nothing is the only kind that can meet plain
                ground without a seam. */}
            <LinearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0E1219" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#0E1219" stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="dusk" cx="50%" cy="100%" rx="42%" ry="70%">
              <Stop offset="0" stopColor={COLORS.accent} stopOpacity="0.26" />
              <Stop offset="0.55" stopColor={COLORS.accent} stopOpacity="0.1" />
              <Stop offset="1" stopColor={COLORS.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="500" cy="260" rx="430" ry="200" fill="url(#dusk)" />
        </Svg>

        {FLOATERS.map(([glyph, left, top, size, tilt, dir], index) => (
          <Animated.View
            key={`float-${index}`}
            style={[
              styles.floater,
              {
                left,
                top,
                // Every third one also breathes in brightness, on the
                // same clock the drift rides — a sky that twinkles as
                // well as swims, without a second animation running.
                opacity:
                  reduced || index % 3 !== 0
                    ? 1
                    : breathe.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.55, 1, 0.55],
                      }),
                transform: [
                  { rotate: `${tilt}deg` },
                  {
                    translateY: reduced
                      ? 0
                      : breathe.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dir * 6],
                        }),
                  },
                ],
              },
            ]}
          >
            <Svg width={size} height={size} viewBox="0 0 24 24">
              <Path
                d={SEAM_GLYPHS[glyph]}
                fill={
                  index % 2 === 0
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(242,169,59,0.26)'
                }
                fillRule="evenodd"
              />
            </Svg>
          </Animated.View>
        ))}

        <Svg
          width="100%"
          height={120}
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
          style={styles.hill}
        >
          {/* Land, not a second ground. The same navy as the sky and
              the footer, darkened just under the ridge — which is what
              lets the whole descent be one colour while still reading
              as land at dusk. The footer below is that navy too, so
              iOS's bottom toolbar finally matches the band it sits
              under. */}
          <Path
            d="M0 120 V86 C 280 18, 720 18, 1000 86 V120 Z"
            fill={COLORS.navy}
          />
          <Path
            d="M0 120 V86 C 280 18, 720 18, 1000 86 V120 Z"
            fill="url(#land)"
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
    /**
     * No background at all: the sky IS the page's grained ground,
     * running uninterrupted from the section above. Painted navy it
     * was the right colour and the wrong surface — a flat patch in a
     * grained page, which is exactly the seam this scene exists not
     * to have. The land below the crest stays the deep well, which is
     * also the footer's ground: the ridge the Mark stands on is the
     * page's last transition, and everything past it is one deep
     * surface to the end of the document.
     */
    overflow: 'hidden',
  },
  skyzone: { height: 260 },
  floater: { position: 'absolute' },
  hill: { position: 'absolute', bottom: 0, left: 0 },
  /**
   * Placed by coordinate: the hill's apex sits 18 units above its own
   * base, so a bottom of 88 puts the plinth's base about 14 pixels over
   * the ridge — standing on the lip, ridge behind the feet.
   */
  /**
   * Twenty pixels below the crest line, not level with it.
   *
   * Base exactly on the apex touches at a single tangent point and
   * reads as perched: the plinth's ellipse curves up on both sides
   * while the hill curves down, so nothing appears to be in contact.
   * Sinking it lets the ridge cross the plinth's lower face — the
   * ground meeting the object on both sides, which is what standing
   * on a hilltop looks like. Twenty puts the ridge near the widest
   * part of the plinth's base — planted on the summit rather than
   * balanced on it. The mark paints after the hill, so everything
   * below the ridge is still drawn: sunk into the crest, never hidden
   * behind it.
   */
  mark: {
    position: 'absolute',
    bottom: 65,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  contact: {
    position: 'absolute',
    bottom: 58,
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
