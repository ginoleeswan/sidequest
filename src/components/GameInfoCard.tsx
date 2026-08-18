import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';

/** Row-style result card: thumbnail, title, rating, release year. */
export function GameInfoCard({ game }: { game: Game }) {
  const router = useRouter();
  const year = game.released?.slice(0, 4);

  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      style={styles.card}
      activeScale={0.96}
    >
      <CoverImage
        uri={game.background_image}
        style={styles.thumb}
        iconSize={26}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {game.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={14} color="#FFD300" />
          <Text style={styles.meta}>{game.rating.toFixed(1)}</Text>
          {year ? <Text style={styles.meta}>· {year}</Text> : null}
        </View>
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    margin: SPACING.sm + 2,
  },
  info: { flex: 1, paddingRight: SPACING.md, gap: SPACING.xs + 2 },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 16,
    color: COLORS.lightGrey,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  meta: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
});
