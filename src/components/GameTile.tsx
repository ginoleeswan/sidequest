import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { Textured } from './Textured';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';

/** Grid tile: cover art above the title and metadata. Used in expanded layouts. */
export function GameTile({ game }: { game: Game }) {
  const router = useRouter();
  const year = game.released?.slice(0, 4);

  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      style={styles.tile}
      activeScale={0.97}
    >
      <View style={styles.art}>
        <Image
          source={{ uri: game.background_image ?? undefined }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <Textured fill />
        <LinearGradient
          colors={['#00000000', '#000000cc']}
          locations={[0.55, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {game.name}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="star" size={13} color="#FFD300" />
        <Text style={styles.meta}>{game.rating.toFixed(1)}</Text>
        {year ? <Text style={styles.meta}>· {year}</Text> : null}
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: SPACING.xs + 2 },
  art: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    ...SHADOW.card,
  },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  title: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    color: COLORS.lightGrey,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  meta: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
});
