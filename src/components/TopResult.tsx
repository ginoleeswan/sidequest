import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import { TitleLogo } from './TitleLogo';
import { artQuery } from '@/api/art';
import { prefetchGame } from '@/api/gameDetail';
import type { Game } from '@/api/types';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

/** The frame's shape: the storefront's hero cut, a little squarer for a phone. */
const ASPECT = 16 / 9;

interface Props {
  game: Game;
  /** Called as the game opens — the screen uses it to remember the search. */
  onOpen?: () => void;
}

/**
 * The first match, given the whole frame.
 *
 * Search on every music and film app leads with one: the thing you
 * almost certainly meant, drawn large, then the rest as rows. It is
 * the difference between a list you scan and an answer you recognise.
 * The card wears the game's own hero art and title treatment where
 * they exist, so "zelda" answers with the Hyrule crest over a
 * landscape rather than a row that happens to be first.
 */
export function TopResult({ game, onOpen }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { durationOf } = useDurations();
  const { data: art } = useQuery({
    ...artQuery(game),
    enabled: Boolean(game.slug),
  });

  const frameWidth = Math.min(width, LAYOUT.maxContentWidth) - GUTTER * 2;
  const year = game.released?.slice(0, 4);
  const genre = game.genres?.[0]?.name;
  const { hours } = durationOf(game);
  const facts = [
    hours > 0 ? formatHours(hours) : null,
    genre,
    year,
    hours <= 0 && game.rating > 0 ? `★ ${game.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const open = () => {
    onOpen?.();
    router.push(`/game/${game.id}`);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.eyebrow}>Top result</Text>
      <ScaleButton
        onPress={open}
        onPressIn={() => prefetchGame(queryClient, game)}
        style={styles.card}
        activeScale={0.98}
        accessibilityLabel={`${game.name}, top result`}
      >
        <View style={styles.frame}>
          <CoverImage
            uri={art?.hero?.thumb ?? game.background_image}
            fallbackUri={game.background_image}
            style={StyleSheet.absoluteFill}
            size="hero"
            priority="high"
            iconSize={40}
          />
          <LinearGradient
            colors={[
              'rgba(14,18,25,0)',
              'rgba(14,18,25,0.48)',
              'rgba(14,18,25,0.92)',
            ]}
            locations={[0.3, 0.66, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.copy}>
            <TitleLogo
              logo={art?.logo}
              name={game.name}
              maxWidth={frameWidth - SPACING.md * 2 - 48}
              maxHeight={64}
            >
              <Text style={[styles.name, OVER_IMAGE.heading]} numberOfLines={2}>
                {game.name}
              </Text>
            </TitleLogo>
            <View style={styles.factsRow}>
              {facts ? (
                <Text style={[styles.facts, OVER_IMAGE.body]}>{facts}</Text>
              ) : null}
              {game.metacritic != null ? (
                <ScorePill score={game.metacritic} size="sm" />
              ) : null}
            </View>
          </View>
        </View>
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACING.sm },
  eyebrow: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  // The shadow on the button, the clip on the frame inside it: one view
  // cannot both cast a shadow and cut its own corners.
  card: {
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  frame: {
    aspectRatio: ASPECT,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    justifyContent: 'flex-end',
  },
  copy: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  name: {
    ...TYPE.title,
    color: COLORS.white,
  },
  factsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  facts: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
});
