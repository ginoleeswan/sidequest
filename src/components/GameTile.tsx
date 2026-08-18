import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { Textured } from './Textured';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';

interface Props {
  game: Game;
  /** Fixed width for horizontal shelves; omit to flex into a grid cell. */
  width?: number;
}

/** Cover-art tile with pointer-hover feedback. Used in expanded layouts. */
export function GameTile({ game, width }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const year = game.released?.slice(0, 4);

  return (
    <View
      style={width != null ? { width } : styles.flexCell}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <ScaleButton
        onPress={() => router.push(`/game/${game.id}`)}
        style={styles.tile}
        activeScale={0.97}
        hoverScale={1.03}
      >
        <View style={[styles.art, hovered && styles.artHovered]}>
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
        <Text
          style={[styles.title, hovered && styles.titleHovered]}
          numberOfLines={2}
        >
          {game.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color="#FFD300" />
          <Text style={styles.meta}>{game.rating.toFixed(1)}</Text>
          {year ? <Text style={styles.meta}>· {year}</Text> : null}
        </View>
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  flexCell: { flex: 1 },
  tile: { gap: SPACING.xs + 2 },
  art: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOW.card,
  },
  artHovered: { borderColor: 'rgba(255,255,255,0.35)' },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  title: {
    fontFamily: 'Noah-Bold',
    fontSize: 13,
    color: COLORS.lightGrey,
  },
  titleHovered: { color: COLORS.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  meta: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
  },
});
