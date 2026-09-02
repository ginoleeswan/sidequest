import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { OVER_IMAGE, TYPE } from '@/styles/typography';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchGame } from '@/api/gameDetail';

interface Props {
  game: Game;
  wide?: boolean;
}

export function GameCard({ game, wide = false }: Props) {
  const router = useRouter();
  const year = game.released?.slice(0, 4);

  // Warm the detail query the moment a finger lands; see ScaleButton.
  const queryClient = useQueryClient();
  const prefetch = () => prefetchGame(queryClient, game);

  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      onPressIn={prefetch}
      // Shadow and radius must live on the same element, or the web
      // box-shadow renders as a square box behind the rounded card.
      style={styles.shadowWrap}
    >
      <View style={[styles.card, wide && styles.wide]}>
        <CoverImage
          uri={game.background_image}
          style={styles.image}
          iconSize={40}
        />
        <LinearGradient
          // Three gentle stops: enough to hold the text, but the artwork
          // stays visible at the bottom - a hard black slab reads as a
          // separate plate with its own corners against the page.
          colors={['#00000000', '#00000066', '#000000cf']}
          locations={[0.4, 0.7, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />
        <View style={styles.ring} pointerEvents="none" />
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={2}>
            {game.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color={COLORS.starGold} />
            <Text style={styles.meta}>{game.rating.toFixed(1)}</Text>
            {year ? <Text style={styles.meta}>· {year}</Text> : null}
          </View>
        </View>
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: RADIUS.xl,
    ...SHADOW.card,
  },
  card: {
    width: LAYOUT.cardWidth,
    height: LAYOUT.cardHeight,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  wide: { width: LAYOUT.cardWideWidth },
  image: { width: '100%', height: '100%' },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  titleBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    ...TYPE.h4,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  meta: {
    ...TYPE.caption,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
  },
});
