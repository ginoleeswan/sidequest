import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import type { Game } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

/**
 * The mid-feed break: one game, the whole width, a reason and an hour.
 *
 * A feed of rails scrolls as a single texture however good the tiles
 * are; the streaming apps reset the eye every few rows by giving one
 * title the full frame. This is that break, in Sidequest's terms - the
 * artwork runs wide, the copy stays in the identity order the stage
 * set (eyebrow, name, the hours in the time colour), and there is one
 * action, because a billboard with a menu is a shelf again.
 */
export function Billboard({
  game,
  eyebrow = 'Worth the shelf space',
}: {
  game: Game;
  eyebrow?: string;
}) {
  const router = useRouter();
  const { isCompact } = useBreakpoint();
  const { durationOf } = useDurations();
  const { hours } = durationOf(game);
  const genre = game.genres?.[0]?.name;

  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      style={[styles.frame, isCompact && styles.frameCompact]}
      activeScale={0.99}
      hoverScale={1.005}
      accessibilityLabel={`Have a look at ${game.name}`}
    >
      <CoverImage
        uri={game.background_image}
        style={StyleSheet.absoluteFill}
        size="hero"
        iconSize={40}
      />
      <LinearGradient
        colors={[
          'rgba(39,47,63,0)',
          'rgba(39,47,63,0.55)',
          'rgba(39,47,63,0.92)',
        ]}
        locations={[0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, OVER_IMAGE.body]} numberOfLines={1}>
          {eyebrow.toUpperCase()}
        </Text>
        <Text
          style={[styles.name, OVER_IMAGE.heading]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {game.name}
        </Text>
        <Text style={[styles.meta, OVER_IMAGE.body]} numberOfLines={1}>
          {hours > 0 ? (
            <Text style={styles.hours}>{formatHours(hours)}</Text>
          ) : null}
          {hours > 0 && genre ? ' · ' : ''}
          {genre ?? ''}
        </Text>
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 300,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    justifyContent: 'flex-end',
    ...SHADOW.card,
  },
  frameCompact: { height: 220, borderRadius: RADIUS.md },
  copy: {
    padding: SPACING.lg,
    gap: SPACING.xs,
    maxWidth: 560,
  },
  eyebrow: { ...TYPE.tag, color: COLORS.lightGrey },
  name: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: COLORS.white,
  },
  meta: { ...TYPE.label, color: COLORS.lightGrey },
  hours: { ...TYPE.label, color: COLORS.accent },
});
