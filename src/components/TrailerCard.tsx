import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import type { Movie } from '@/api/types';

export function TrailerCard({ trailer }: { trailer: Movie }) {
  const player = useVideoPlayer(trailer.data.max);
  return (
    <View style={styles.container}>
      <Text style={styles.name} numberOfLines={1}>
        {trailer.name}
      </Text>
      <VideoView player={player} style={styles.video} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 320 },
  name: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.lightGrey,
    paddingBottom: 8,
  },
  video: {
    width: 300,
    height: 200,
    marginRight: 15,
    borderRadius: 10,
    backgroundColor: 'black',
  },
});
