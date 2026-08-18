import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { PlatformIcons } from './PlatformIcons';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import { Textured } from './Textured';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';

interface Props {
  game: Game;
  /** Fixed width for horizontal shelves; omit to flex into a grid cell. */
  width?: number;
}

/**
 * Cover-art tile. The art carries glanceable facts — Metacritic in the top
 * corner, platform glyphs along the bottom — and the caption carries
 * identity: title, then genre · year · rating in one quiet line.
 */
export function GameTile({ game, width }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const year = game.released?.slice(0, 4);
  const genre = game.genres?.[0]?.name;
  const meta = [
    genre,
    year,
    game.rating > 0 ? `★ ${game.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
          <CoverImage uri={game.background_image} style={styles.image} />
          <Textured fill />
          <LinearGradient
            colors={['#00000000', '#00000059', '#000000a6']}
            locations={[0.55, 0.8, 1]}
            style={styles.gradient}
            pointerEvents="none"
          />
          {game.metacritic != null && (
            <View style={styles.scoreCorner}>
              <ScorePill score={game.metacritic} size="sm" />
            </View>
          )}
          {game.parent_platforms && game.parent_platforms.length > 0 && (
            <View style={styles.platforms}>
              <PlatformIcons
                platforms={game.parent_platforms.slice(0, 4)}
                size={12}
                color="rgba(255,255,255,0.85)"
              />
            </View>
          )}
        </View>
        <Text
          style={[styles.title, hovered && styles.titleHovered]}
          numberOfLines={2}
        >
          {game.name}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  flexCell: { flex: 1 },
  tile: { gap: SPACING.xs + 1 },
  art: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    ...SHADOW.card,
  },
  artHovered: { borderColor: COLORS.strokeStrong },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  scoreCorner: { position: 'absolute', top: SPACING.sm, right: SPACING.sm },
  platforms: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm + 2,
  },
  title: {
    fontFamily: 'Noah-Bold',
    fontSize: 13,
    lineHeight: 17,
    color: COLORS.lightGrey,
    marginTop: 2,
  },
  titleHovered: { color: COLORS.white },
  meta: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
  },
});
