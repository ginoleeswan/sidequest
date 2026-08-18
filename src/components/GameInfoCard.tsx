import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';
import type { Game } from '@/api/types';

/** Row-style result card: thumbnail, title, rating. */
export function GameInfoCard({ game }: { game: Game }) {
  const router = useRouter();
  return (
    <ScaleButton
      onPress={() => router.push(`/game/${game.id}`)}
      style={styles.card}
    >
      <Image
        source={{ uri: game.background_image ?? undefined }}
        style={styles.thumb}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {game.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#FFD300" />
          <Text style={styles.rating}>{game.rating}</Text>
        </View>
      </View>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 330,
    backgroundColor: '#383838',
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 22,
    margin: 10,
  },
  info: { flex: 1, paddingRight: 15, gap: 6 },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 16,
    color: COLORS.lightGrey,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.lightGrey,
  },
});
