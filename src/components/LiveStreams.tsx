import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { SectionHeader } from './SectionHeader';
import { channelUrl, fetchLiveStreams } from '@/api/twitch';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Somebody playing it, right now.
 *
 * Every other number on this page is a claim about a game — a rating, a
 * length, a Metacritic score. This is the game itself, running, which
 * is the only evidence that settles "would I actually enjoy forty hours
 * of this" in the ninety seconds somebody is willing to spend deciding.
 * It sits below the facts for that reason: the facts narrow the choice,
 * this one closes it.
 *
 * Renders nothing at all when nobody is live, when Twitch has no such
 * category, or when the deployment has no Twitch credentials. An empty
 * shelf with an apology in it is worse than a page that simply does not
 * mention streams — and this must never be the reason a game page looks
 * broken, because it is the least important thing on it.
 */
export function LiveStreams({ game }: { game: string }) {
  const { data } = useQuery({
    queryKey: ['twitch', 'streams', game],
    queryFn: () => fetchLiveStreams(game),
    // Who is live turns over constantly; this is the shortest stale time
    // on the page and still spares the endpoint a fetch per revisit.
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(game),
  });

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Playing it now" />
      <View style={styles.row}>
        {data.map((stream) => (
          <Pressable
            key={stream.id}
            onPress={() => Linking.openURL(channelUrl(stream.login))}
            accessibilityRole="link"
            accessibilityLabel={`Watch ${stream.channel} play, ${stream.viewers} watching, on Twitch`}
            style={styles.card}
          >
            <View style={styles.shotFrame}>
              <CoverImage uri={stream.thumbnail} style={styles.shot} />
              {/* The one thing that has to be unmistakable: this is not
                  a video somebody uploaded, it is happening. */}
              <View style={styles.liveTag}>
                <View style={styles.dot} />
                <Text style={styles.liveWord}>LIVE</Text>
              </View>
              <View style={styles.viewers}>
                <Ionicons name="person" size={11} color={COLORS.white} />
                <Text style={styles.viewerCount}>
                  {stream.viewers.toLocaleString()}
                </Text>
              </View>
            </View>
            <Text style={styles.channel} numberOfLines={1}>
              {stream.channel}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {stream.title}
            </Text>
          </Pressable>
        ))}
      </View>
      {/* Said once, quietly, because it is the reason this can exist at
          all: no account was connected to build this row. */}
      <Text style={styles.footnote}>
        Public streams from Twitch. Nothing about you is sent to them.
      </Text>
    </View>
  );
}

const CARD = 220;

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  card: { width: CARD, gap: 6 },
  shotFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  shot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  liveTag: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(248,113,104,0.92)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },
  liveWord: {
    ...TYPE.micro,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.white,
  },
  viewers: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(9,12,19,0.72)',
  },
  viewerCount: { ...TYPE.micro, fontSize: 10, color: COLORS.white },
  channel: { ...TYPE.label, color: COLORS.white },
  title: { ...TYPE.caption, fontSize: 13, color: COLORS.mediumGrey },
  footnote: { ...TYPE.micro, color: COLORS.mediumGrey },
});
