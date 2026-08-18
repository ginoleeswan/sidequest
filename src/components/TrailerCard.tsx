import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, Text, View } from 'react-native';

import { mediaUri } from '@/api/rawg';
import { COLORS } from '@/styles/colors';
import type { Movie } from '@/api/types';

export function TrailerCard({ trailer }: { trailer: Movie }) {
  const player = useVideoPlayer(mediaUri(trailer.data.max) ?? '');
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
  container: { width: 320, gap: 8 },
  name: {
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.lightGrey,
  },
  video: {
    width: 320,
    height: 180,
    borderRadius: 12,
    backgroundColor: 'black',
  },
});
