import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { CoverImage } from './CoverImage';
import { Rail } from './Rail';
import { SectionHeader } from './SectionHeader';
import { channelUrl, fetchLiveStreams } from '@/api/twitch';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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
export function LiveStreams({
  game,
  style,
  inset = 0,
}: {
  game: string;
  /**
   * The parent's horizontal padding, so the row runs to the screen's
   * edge like every other row of things on this page. See `Rail`.
   */
  inset?: number;
  /**
   * The block's own spacing, applied only when there is something to
   * show. Wrapped from outside, an empty section still left its margin
   * on the page - a void above the series rail for a game nobody was
   * streaming.
   */
  style?: StyleProp<ViewStyle>;
}) {
  const { isExpanded } = useBreakpoint();
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
    <View style={[styles.wrap, style]}>
      {/* The eyebrow carries the fact that makes the row worth a look -
          people are playing this right now - and the title says what the
          reader can do about it. "Playing it now" belongs to the buttons
          further up the page, where it means the reader is the one
          playing; a heading cannot borrow it to mean strangers are. */}
      <SectionHeader
        title="Watch someone play"
        eyebrow={`${data.length} live on Twitch`}
      />
      {/* A rail, like every other row of things on this page.
          Wrapping, a 220-point card in a phone's column fitted one per
          line, so the least important section on the page was also the
          tallest — three stacked cards between the reader and the games
          below. Sideways it is one screen's worth however many are
          live, and the next card peeking is what says there are more. */}
      <Rail
        data={data}
        keyExtractor={(stream) => stream.id}
        inset={inset}
        gap={SPACING.sm + 2}
        // Flat frames, no shadow, so the rail needs no room under the
        // cards - and taking it would open a gap before the footnote.
        shadowRoom={0}
        renderItem={(stream) => (
          <Pressable
            onPress={() => Linking.openURL(channelUrl(stream.login))}
            accessibilityRole="link"
            accessibilityLabel={`Watch ${stream.channel} play, ${stream.viewers} watching, on Twitch`}
            style={[styles.card, { width: isExpanded ? WIDE_CARD : CARD }]}
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
            {/* One line, not two. A stream's title is written to be
                clicked on, and a second line of it pushed the row's
                height past the pictures it is there to show. */}
            <Text style={styles.title} numberOfLines={1}>
              {stream.title}
            </Text>
          </Pressable>
        )}
      />
      {/* Said once, quietly, because it is the reason this can exist at
          all: no account was connected to build this row. The eyebrow
          above already names Twitch, so this says the part that is
          actually a promise - and it says it in the smallest voice on
          the page, not in the display caps a heading wears. */}
      <Text style={[styles.footnote, inset > 0 && { paddingHorizontal: 0 }]}>
        Public streams. Nothing about you is sent to Twitch.
      </Text>
    </View>
  );
}

/** Wide enough to read a channel name, narrow enough that a second peeks. */
const CARD = 224;

/**
 * On the desk the phone's card sat in a row of four with a third of the
 * page left over, half the size of the shelf beneath it. Same picture,
 * more of it.
 */
const WIDE_CARD = 300;

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm + 2 },
  card: { gap: 6 },
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
  footnote: { ...TYPE.fine, color: COLORS.mediumGrey },
});
