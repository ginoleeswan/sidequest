import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';
import type { Game } from '@/api/types';

interface Props {
  game: Game;
  wide?: boolean;
}

export function GameCard({ game, wide = false }: Props) {
  const router = useRouter();
  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      style={styles.shadow}
    >
      <View style={[styles.card, wide && styles.wide]}>
        <Image
          source={{ uri: game.background_image ?? undefined }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <ImageBackground
          source={require('../../assets/images/noise.png')}
          resizeMode="repeat"
          style={styles.overlay}
        >
          <LinearGradient
            colors={['#00000000', 'black']}
            locations={[0.5, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={2}>
              {game.name}
            </Text>
          </View>
        </ImageBackground>
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    height: 200,
    borderRadius: 35,
    marginHorizontal: 8,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  wide: { width: 300, borderRadius: 40 },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  titleBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 16,
    color: COLORS.lightGrey,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
