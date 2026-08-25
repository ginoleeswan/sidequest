import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { PlatformIcons } from './PlatformIcons';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';
import { useQueryClient } from '@tanstack/react-query';
import { gameDetailQuery } from '@/api/gameDetail';

/** Row-style result card: thumbnail, identity, facts. */
export function GameInfoCard({ game }: { game: Game }) {
  const router = useRouter();
  const year = game.released?.slice(0, 4);
  const genre = game.genres?.[0]?.name;

  // Warm the detail query the moment a finger lands; see ScaleButton.
  const queryClient = useQueryClient();
  const prefetch = () =>
    queryClient.prefetchQuery({
      ...gameDetailQuery(game.id),
      staleTime: 5 * 60 * 1000,
    });

  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      onPressIn={prefetch}
      style={styles.card}
      activeScale={0.97}
    >
      <CoverImage
        uri={game.background_image}
        style={styles.thumb}
        size="thumb"
        iconSize={26}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {game.name}
        </Text>
        <View style={styles.metaRow}>
          {game.rating > 0 && (
            <>
              <Ionicons name="star" size={13} color={COLORS.starGold} />
              <Text style={styles.meta}>{game.rating.toFixed(1)}</Text>
            </>
          )}
          {year ? <Text style={styles.meta}>· {year}</Text> : null}
          {genre ? <Text style={styles.meta}>· {genre}</Text> : null}
        </View>
        {game.parent_platforms && game.parent_platforms.length > 0 && (
          <PlatformIcons
            platforms={game.parent_platforms.slice(0, 5)}
            size={12}
            color={COLORS.mediumGrey}
          />
        )}
      </View>
      {game.metacritic != null && (
        <View style={styles.score}>
          <ScorePill score={game.metacritic} size="sm" />
        </View>
      )}
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.md,
    margin: SPACING.sm + 2,
  },
  info: { flex: 1, paddingRight: SPACING.sm, gap: SPACING.xs + 1 },
  title: {
    ...TYPE.h3,
    color: COLORS.lightGrey,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  meta: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  score: { paddingRight: SPACING.md },
});
