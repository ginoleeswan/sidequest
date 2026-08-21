import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { useInView } from './Rise';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DROP_REASONS } from '@/lib/drops';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

/**
 * The evidence beside each beat, as three staged objects.
 *
 * The bar is the memcard: a real object, at scale, made of real
 * content, performing its own concept. Measured against that, what
 * these were is embarrassing — a stock tile, a small row card, and a
 * bordered box with four grey chips in it. The chips in particular
 * explained nothing: "it lets you put things down" illustrated by a
 * picker somebody would see AFTER deciding, drawn at a third the size
 * of the sentence.
 *
 * So all three are the same object now — one real cover at the column's
 * width — differing only in what happens TO it, in the beat's own
 * colour:
 *
 *   length   the hours it takes, stamped over the art in amber, which
 *            is exactly the claim ("in amber, on every tile").
 *   tonight  the evening's verdict laid across it in violet.
 *   drop     the game being let go: greyed, tilted, and stamped LET GO
 *            in coral — the act, not the menu that follows it.
 *
 * Each lands on a spring when the beat is reached, so the evidence
 * performs rather than sits, and each is drawn from the same primitives
 * the memcard's stamp uses. The reasons still appear under the third,
 * small, where a footnote belongs.
 */
export function LandingProof({
  kind,
  game,
  width,
  hue = COLORS.accent,
}: {
  kind: 'length' | 'tonight' | 'drop';
  game?: Game;
  width: number;
  /** The beat's own colour; the evidence speaks in it too. */
  hue?: string;
}) {
  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-10%');
  const land = useAnimatedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || !seen) return;
    const spring = Animated.spring(land, {
      toValue: 1,
      tension: 90,
      friction: 9,
      useNativeDriver: false,
    });
    // A beat after the card itself arrives, so the stamp reads as
    // landing ON something rather than with it.
    const timer = setTimeout(() => spring.start(), 320);
    return () => {
      clearTimeout(timer);
      spring.stop();
    };
  }, [land, seen, reduced]);

  if (!game) return null;

  const dropped = kind === 'drop';
  const stamp = {
    opacity: land.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 1, 1],
    }),
    transform: [
      { rotate: dropped ? '-7deg' : '-3deg' },
      {
        scale: land.interpolate({
          inputRange: [0, 1],
          outputRange: [dropped ? 2.2 : 1.6, 1],
        }),
      },
    ],
  };

  const hours = Math.max(1, Math.round(game.playtime || 12));

  return (
    <View ref={ref} style={[styles.frame, { width }]}>
      <View style={[styles.card, dropped && styles.cardDropped]}>
        {/* Hero-sized, because this IS a hero: the card runs the full
            column. It requested the 100px row-thumbnail derivative and
            stretched it eight times over — measured on a phone as the
            blur it was. */}
        <CoverImage
          uri={game.background_image}
          style={styles.art}
          size="hero"
        />
        {/* Letting go is drawn, not described: the art goes out. */}
        {dropped && <View style={styles.grey} />}
        {/* A gradient, not a block: a flat scrim at 62% draws a hard
            rule across the artwork, which is the one thing a scrim
            exists to avoid. */}
        <LinearGradient
          colors={[
            'rgba(9,12,19,0)',
            'rgba(9,12,19,0.45)',
            'rgba(9,12,19,0.88)',
          ]}
          locations={[0, 0.55, 1]}
          style={styles.veil}
          pointerEvents="none"
        />

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {game.name}
          </Text>
          {kind === 'tonight' && (
            <View style={styles.row}>
              <Ionicons name="moon" size={13} color={hue} />
              <Text style={[styles.line, { color: hue }]}>
                Fits tonight — credits before bed
              </Text>
            </View>
          )}
          {kind === 'length' && (
            <Text style={styles.line}>Reported by people who finished it</Text>
          )}
          {dropped && (
            <Text style={styles.line}>Off the shelf, guilt-free</Text>
          )}
        </View>

        {/* The one bold thing, in the beat's colour. */}
        {kind === 'length' && (
          <Animated.View style={[styles.figureSlot, stamp]}>
            <Text style={[styles.figure, { color: hue }]}>{hours}</Text>
            <Text style={styles.figureUnit}>HOURS</Text>
          </Animated.View>
        )}
        {kind === 'tonight' && (
          <Animated.View style={[styles.figureSlot, stamp]}>
            <Text style={[styles.figure, { color: hue }]}>90</Text>
            <Text style={styles.figureUnit}>MINUTES</Text>
          </Animated.View>
        )}
        {dropped && (
          <Animated.View
            style={[styles.stamp, { borderColor: hue }, stamp]}
            pointerEvents="none"
          >
            <Text style={[styles.stampWord, { color: hue }]}>LET GO</Text>
          </Animated.View>
        )}
      </View>

      {dropped && (
        <View style={styles.reasons}>
          {DROP_REASONS.map((reason) => (
            <Text key={reason.key} style={styles.reason}>
              {reason.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'flex-start', gap: SPACING.md },
  card: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    boxShadow: '0 22px 48px rgba(0,0,0,0.45)',
  },
  cardDropped: { transform: [{ rotate: '-2.5deg' }] },
  art: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  /** No `filter` — react-native-web drops it; a scrim does the job. */
  grey: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,25,35,0.72)',
  },
  veil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
  },
  body: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.lg,
    gap: 3,
  },
  name: { ...TYPE.title, fontSize: 24, color: COLORS.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  line: { ...TYPE.caption, fontSize: 14 },

  figureSlot: { position: 'absolute', top: SPACING.lg, right: SPACING.lg + 2 },
  figure: {
    fontFamily: 'Noah-Black',
    fontSize: 68,
    lineHeight: 68,
    letterSpacing: -3,
    textAlign: 'right',
    // The number sits on whatever the artwork happens to be; the
    // app's over-image shadow is what keeps it legible on a pale sky.
    ...OVER_IMAGE.heading,
  },
  figureUnit: {
    ...TYPE.tag,
    fontSize: 12,
    letterSpacing: 3,
    textAlign: 'right',
    marginTop: 3,
    color: COLORS.white,
    ...OVER_IMAGE.body,
  },

  stamp: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    borderWidth: 4,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(20,25,35,0.6)',
  },
  stampWord: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    letterSpacing: 4,
  },

  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  reason: { ...TYPE.caption, fontSize: 13 },
});
