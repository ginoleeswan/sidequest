import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { Rise } from './Rise';
import { Words } from './Words';
import { mediaUri } from '@/api/rawg';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { LANDING_WELL, type LandingScale } from '@/styles/landing';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Watch it before you commit.
 *
 * The page has spent five sections narrowing a pile down to one game.
 * The last doubt it cannot answer with data is whether the reader will
 * actually enjoy it — a rating is other people's verdict, a length is
 * arithmetic, and a trailer is what the publisher wanted it to look
 * like. Somebody playing it, live, is the game itself, and ninety
 * seconds of that settles the question the other five sections opened.
 *
 * Drawn rather than live, deliberately. The real feature is on the game
 * page and reads Twitch's public directory; putting it here would mean
 * this section rendering empty for any reader who arrives when nobody
 * happens to be streaming, or on a deployment with no Twitch keys. The
 * landing page has to make its case every time, so it makes it with a
 * picture — the same reason the calendar band draws a calendar rather
 * than reading one.
 *
 * The privacy note is not decoration. Twitch's app credentials answer a
 * public question — who is live for this category — with no login, no
 * scope, and nothing sent about the person asking. That is the only
 * shape of Twitch feature this app is permitted, for exactly the reason
 * the calendar hand-off is a file, and it is worth saying out loud
 * because every competitor's version of this needs an account.
 */

/** Plausible, unremarkable channel names — the point is the game, not them. */
const CHANNELS = [
  { name: 'quietkeep', viewers: '2.4K' },
  { name: 'lateshift', viewers: '861' },
];

function Chip({
  icon,
  hue,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  hue: string;
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={hue} />
      <Text style={styles.chipWord}>{label}</Text>
    </View>
  );
}

export function LandingWatch({
  scale,
  games,
}: {
  scale: LandingScale;
  games?: Game[];
}) {
  const shots = (games ?? []).slice(8, 10);

  return (
    <View style={scale.wide ? styles.wide : undefined}>
      <View style={scale.wide ? styles.copy : styles.copyStack}>
        <Words
          text="And watch it before you commit."
          style={[styles.lead, scale.lead]}
        />
        <Rise delay={90}>
          <Text style={[styles.body, scale.body]}>
            Every game page shows who is playing it, live, right now.
          </Text>
        </Rise>
        {/* Chips rather than two paragraphs of reasoning — see the note
            in LandingCalendar. Why Twitch can work without a login, and
            why Discord is a share rather than an integration, are both
            worth knowing and are kept at the top of this file. On the
            page they are two facts, not two essays. */}
        <Rise delay={150}>
          <View style={styles.chips}>
            <Chip icon="shield" hue={COLORS.accent} label="No Twitch login" />
            <Chip
              icon="share-outline"
              hue={COLORS.violet}
              label="Shares to Discord"
            />
          </View>
        </Rise>
      </View>

      <Rise
        from="lift"
        delay={120}
        style={scale.wide ? styles.artWide : undefined}
      >
        <View style={styles.stack}>
          {CHANNELS.map((channel, index) => (
            <View
              key={channel.name}
              style={[styles.card, index === 1 && styles.cardBehind]}
            >
              <View style={styles.shotFrame}>
                <CoverImage
                  uri={mediaUri(shots[index]?.background_image, 420)}
                  style={styles.shot}
                />
                {/* The one unmistakable thing: this is happening, not a
                    clip somebody uploaded last year. */}
                <View style={styles.liveTag}>
                  <View style={styles.dot} />
                  <Text style={styles.liveWord}>LIVE</Text>
                </View>
                <View style={styles.viewers}>
                  <Ionicons name="person" size={11} color={COLORS.white} />
                  <Text style={styles.viewerCount}>{channel.viewers}</Text>
                </View>
              </View>
              <View style={styles.meta}>
                <Text style={styles.channel} numberOfLines={1}>
                  {channel.name}
                </Text>
                <Text style={styles.playing} numberOfLines={1}>
                  {shots[index]?.name ?? 'Playing now'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  wide: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl * 2 },
  copy: { flex: 1, gap: SPACING.md },
  copyStack: { gap: SPACING.md, marginBottom: SPACING.xl },
  artWide: { flex: 1 },
  lead: { color: COLORS.white, maxWidth: 520 },
  body: { color: COLORS.mediumGrey, maxWidth: 480 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  chipWord: { ...TYPE.micro, color: COLORS.lightGrey },

  /** Two, overlapped: a directory implies choosing, and the point is
      that there is always somebody on. */
  stack: { gap: SPACING.md },
  card: {
    backgroundColor: LANDING_WELL,
    borderRadius: RADIUS.lg - 4,
    borderWidth: 1.5,
    borderColor: COLORS.strokeStrong,
    padding: SPACING.sm + 2,
    gap: SPACING.sm,
    boxShadow: '0 16px 36px rgba(9,12,19,0.4)',
  },
  /** The second sits back, so the pair reads as depth not as a list. */
  cardBehind: {
    marginLeft: SPACING.xl,
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  shotFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.md - 2,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.white },
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
  meta: { gap: 1 },
  channel: { ...TYPE.label, fontSize: 14, color: COLORS.white },
  playing: { ...TYPE.caption, fontSize: 12, color: COLORS.mediumGrey },
});
