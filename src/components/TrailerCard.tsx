import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, Text, View } from 'react-native';

import { mediaUri } from '@/api/rawg';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import type { Movie } from '@/api/types';
import { TYPE } from '@/styles/typography';

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
  container: { width: 320, gap: SPACING.sm },
  name: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
  },
  video: {
    width: 320,
    height: 180,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.ink,
  },
});
