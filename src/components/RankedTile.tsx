import { StyleSheet, Text, View } from 'react-native';

import { GameTile } from './GameTile';
import type { Game } from '@/api/types';

interface Props {
  game: Game;
  rank: number;
  width: number;
}

/**
 * Top-10 row item: an oversized watermark numeral shoulders the tile.
 * The number is furniture, not information hierarchy - it sits behind
 * and below, the art stays the subject.
 */
export function RankedTile({ game, rank, width }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.rank}>{rank}</Text>
      <View style={{ width, marginLeft: -14 }}>
        <GameTile game={game} width={width} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  rank: {
    fontFamily: 'Noah-Black',
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -6,
    color: 'rgba(255,255,255,0.13)',
    marginBottom: 22,
  },
});
