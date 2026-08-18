import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { ScaleButton } from './ScaleButton';
import { Textured } from './Textured';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';

interface Props {
  game: Game;
  wide?: boolean;
}

export function GameCard({ game, wide = false }: Props) {
  const router = useRouter();
  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      style={SHADOW.card}
    >
      <View style={[styles.card, wide && styles.wide]}>
        <CoverImage
          uri={game.background_image}
          style={styles.image}
          iconSize={40}
        />
        <Textured fill />
        <LinearGradient
          colors={['#00000000', 'black']}
          locations={[0.45, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={2}>
            {game.name}
          </Text>
        </View>
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  card: {
    width: LAYOUT.cardWidth,
    height: LAYOUT.cardHeight,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
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
  titleBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
});
