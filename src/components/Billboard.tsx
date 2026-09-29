import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import { prefetchGame } from '@/api/gameDetail';
import type { Game } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { billboardReason } from '@/lib/homeFeed';
import { alpha, COLORS } from '@/styles/colors';
import { GUTTER, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { FONT_SCALE, OVER_IMAGE, TYPE } from '@/styles/typography';

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
  eyebrow: given,
}: {
  game: Game;
  /** Overrides the reason derived from the game's own facts. */
  eyebrow?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isCompact } = useBreakpoint();
  const { durationOf } = useDurations();
  const { hours } = durationOf(game);
  const genre = game.genres?.[0]?.name;
  const [now] = useState(() => Date.now());
  const eyebrow = given ?? billboardReason(game, hours, now);

  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      onPressIn={() => prefetchGame(queryClient, game)}
      style={[styles.frame, isCompact && styles.frameCompact]}
      activeScale={0.99}
      hoverScale={1.005}
      accessibilityLabel={[
        `Have a look at ${game.name}`,
        eyebrow,
        hours > 0 ? `${formatHours(hours)} to finish` : null,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <CoverImage
        uri={game.background_image}
        style={StyleSheet.absoluteFill}
        size="hero"
        iconSize={40}
      />
      <LinearGradient
        colors={[
          alpha(COLORS.navy, 0),
          alpha(COLORS.navy, 0.55),
          alpha(COLORS.navy, 0.92),
        ]}
        locations={[0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.copy, isCompact && styles.copyCompact]}>
        <Text
          style={[styles.eyebrow, OVER_IMAGE.body]}
          numberOfLines={1}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
          {eyebrow.toUpperCase()}
        </Text>
        <Text
          style={[styles.name, OVER_IMAGE.heading]}
          numberOfLines={2}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={FONT_SCALE.display}
        >
          {game.name}
        </Text>
        <Text
          style={[styles.meta, OVER_IMAGE.body]}
          numberOfLines={1}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
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
  /**
   * A band on the phone, not a card.
   *
   * Inside the feed's gutter this was the one element on the page
   * narrower than the shelves above it - a card stopping two gutters
   * short of both edges while every rail beside it ran off them. It
   * takes the full width now, and a thing that touches both edges of
   * a phone does not wear a rounded frame: the radius and the side
   * borders go, the copy keeps the page's gutter.
   */
  frameCompact: {
    height: 240,
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  copyCompact: { padding: GUTTER },
  copy: {
    padding: SPACING.lg,
    gap: SPACING.xs,
    maxWidth: 560,
  },
  eyebrow: { ...TYPE.tag, color: COLORS.lightGrey },
  name: {
    ...TYPE.title,
    color: COLORS.white,
  },
  meta: { ...TYPE.label, color: COLORS.lightGrey },
  hours: { ...TYPE.label, color: COLORS.accent },
});
