import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesktopShell } from '@/components/DesktopShell';
import { BackButton } from '@/components/BackButton';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { Mark } from '@/components/Mark';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { useHydrated } from '@/hooks/useHydrated';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useAuth } from '@/lib/auth';
import { CAN_COPY, handOff } from '@/lib/clipboard';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { readDrops, totalDrops } from '@/lib/drops';
import { useLibrary } from '@/lib/library';
import { libraryStats } from '@/lib/libraryStats';
import { useSync, type SyncStatus } from '@/lib/sync/SyncProvider';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * You — the shelf turned around.
 *
 * Two versions of this screen failed the same way. The first was three
 * stat boxes over two identical lists of chevrons: every number on it
 * was borrowed from another screen, and the whole page was hairline
 * rectangles on navy in an app otherwise made of cover art. The second
 * kept the structure and made it worse, because giving the sign-in
 * buttons a solid white fill made the one OPTIONAL thing on the page
 * the loudest thing on it — an app whose hero promises "no account"
 * cannot have two white slabs of sign-in as its account screen.
 *
 * So: the reader's own library is the material. It sits behind the
 * masthead, graded to the app's navy and dissolved into the page, and
 * it is the only place a profile screen can honestly get a face from
 * when there is no account and no photograph. Under it the three
 * figures are not a scoreboard but three doors — what is ahead, what
 * you finished, what you let go — which are the three things a
 * deliberate player does with a game and the three screens that hold
 * them. A stat that navigates is not a duplicate of the screen it
 * counts; it is the way in.
 *
 * Signing in is one quiet row near the bottom that opens when asked.
 * That is the honest weight for something that buys sync and never a
 * feature.
 */

/**
 * The masthead's ground: one of your own covers, out of focus.
 *
 * This was a three-by-three mosaic first, which is the obvious way to
 * put a whole library behind a heading and the wrong one — nine tiles
 * blur individually, so every tile keeps a hard edge and the band reads
 * as a gallery that failed to load rather than as a backdrop. One
 * picture has no seams.
 *
 * The most recent save, because that is the one thing about a shelf
 * that is true today, and because a profile screen with no account and
 * no photograph has to get its face from somewhere. It is never legible
 * as a game: forty points of blur, a navy veil to give whatever the
 * publisher graded a black point of ours, and a gradient that ends at
 * the page colour exactly, so the band has no bottom edge — it simply
 * stops being artwork.
 */
function Wall({ cover }: { cover: string }) {
  return (
    <View style={styles.wall} pointerEvents="none">
      <CoverImage
        uri={cover}
        size="hero"
        blurRadius={40}
        style={styles.wallImage}
        iconSize={0}
      />
    </View>
  );
}

/** One of the three doors. A number, what it counts, where it goes. */
function Door({
  value,
  label,
  colour,
  onPress,
  first = false,
}: {
  value: string;
  label: string;
  colour: string;
  onPress: () => void;
  first?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      style={({ pressed }) => [
        styles.door,
        !first && styles.doorDivided,
        pressed && styles.doorPressed,
      ]}
    >
      <Text style={[styles.doorValue, { color: colour }]}>{value}</Text>
      <Text style={styles.doorLabel}>{label}</Text>
    </Pressable>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      <Ionicons name={icon} size={17} color={COLORS.mediumGrey} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={15} color={COLORS.mediumGrey} />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? styles.rowPressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const LEGAL = [
  { label: 'About', href: '/about' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
] as const;

const SYNC_LABEL: Record<SyncStatus['state'], string> = {
  idle: 'Signed in',
  syncing: 'Syncing…',
  synced: 'Synced',
  failed: 'Not synced',
};

export default function YouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = useTopPad(true);
  const { isExpanded } = useBreakpoint();
  const { entries, count, exportJson } = useLibrary();
  const { session, available } = useAuth();
  const { status: syncStatus } = useSync();
  const { durationOf } = useDurations();
  const hydrated = useHydrated();
  const [pace] = usePersistedState('sidequest.plan.pace', 6);
  const toast = useToast();

  /**
   * Out of the app, and it says whether that worked.
   *
   * The web copies; native opens the share sheet, where copying is one
   * of the choices. The row and the message both say which, because a
   * control called "Copy" that opens a share sheet is a small lie.
   */
  const sendLibrary = async () => {
    const done = await handOff(exportJson());
    if (!done) {
      toast('Nothing left the app — try again', 'alert-circle');
      return;
    }
    toast(
      CAN_COPY
        ? 'Library copied — paste it on another device'
        : 'Library sent — open it on your other device',
      CAN_COPY ? 'copy' : 'share-outline'
    );
  };

  const all = useMemo(() => Object.values(entries), [entries]);
  const stats = useMemo(
    () => libraryStats(all, (game) => durationOf(game).hours),
    [all, durationOf]
  );
  /** The most recently saved cover, which is what the masthead wears. */
  const cover = useMemo(
    () =>
      [...all]
        .sort((a, b) => b.addedAt - a.addedAt)
        .map((entry) => entry.game.background_image)
        .find(Boolean) ?? null,
    [all]
  );
  // Drops live in their own store and are only readable once storage has
  // been hydrated — before that the honest answer is none, not a guess.
  const dropped = hydrated ? totalDrops(readDrops()) : 0;

  const email = session?.user.email ?? null;
  /** The name a screen can use when there is no name: the local part. */
  const who = email ? (email.split('@')[0] ?? 'You') : 'You';

  /**
   * The desk's one shell, the same one Home, Library and Plan stand in.
   * You had the old top bar of text links, which made the account
   * page look like a different site from the three it is reached from.
   */
  const page = (
    <>
      <PageTitle>You — Sidequest</PageTitle>
      {/* A pushed screen, so it keeps its back button on BOTH platforms.
          This used to render one on web only, which left the native
          version with no header, no tab bar and no way out — while
          still reserving the clearance the missing button would have
          needed. A hundred and twenty points of nothing, above a dead
          end. */}
      {isExpanded ? null : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton onImage={Boolean(cover)} />
        </View>
      )}

      <Screen>
        <FadeInView>
          <View
            style={[
              styles.masthead,
              isExpanded && styles.mastheadExpanded,
              { paddingTop: topPad },
            ]}
          >
            {cover ? <Wall cover={cover} /> : null}
            {/* The veil and the dissolve. Two layers, because they do
                different jobs: the veil gives a few thousand publishers'
                key art one black point to share, and the gradient ends
                the band without drawing a line under it. */}
            <View style={styles.wallVeil} pointerEvents="none" />
            <LinearGradient
              colors={['transparent', COLORS.darkGrey]}
              locations={[0, 0.94]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* And one downwards, because the status bar and the back
                button sit on whatever the publisher graded. */}
            <LinearGradient
              colors={['rgba(39,47,63,0.8)', 'transparent']}
              locations={[0, 0.45]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.identity, isExpanded && styles.identityWide]}>
              <View style={[styles.avatar, session && styles.avatarSynced]}>
                {session ? (
                  <Text style={styles.monogram}>
                    {who.slice(0, 1).toUpperCase()}
                  </Text>
                ) : (
                  <Mark size={30} />
                )}
              </View>
              <View style={styles.identityText}>
                <Text style={styles.who} numberOfLines={1}>
                  {who}
                </Text>
                <Text style={styles.where}>
                  {email ?? 'No account. Nothing has left this device.'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.inner, isExpanded && styles.innerExpanded]}>
            {/* Three doors, not three stats. */}
            <View style={styles.doors}>
              <Door
                first
                value={formatHours(stats.hoursAhead)}
                label="AHEAD"
                colour={
                  stats.hoursAhead > 0 ? COLORS.accent : COLORS.mediumGrey
                }
                onPress={() => router.push('/library')}
              />
              <Door
                value={String(stats.finished)}
                label="FINISHED"
                colour={stats.finished > 0 ? COLORS.mint : COLORS.mediumGrey}
                onPress={() => router.push('/memcard')}
              />
              <Door
                value={String(dropped)}
                label="LET GO"
                colour={dropped > 0 ? COLORS.coral : COLORS.mediumGrey}
                onPress={() => router.push('/tidy')}
              />
            </View>

            <Text style={styles.groupLabel}>YOUR SETUP</Text>
            <View style={styles.group}>
              <Row
                icon="speedometer"
                label="Your pace"
                value={`${pace}h a week`}
                onPress={() => router.push('/plan')}
              />
              <Row
                icon="download"
                label="Import from Steam"
                onPress={() => router.push('/import')}
              />
              {/* Moved off the Library page, where it sat at the foot
                  below every game you own — fine at two, unreachable at
                  two hundred. Exporting is a settings action, and this
                  is where the settings are. */}
              <Row
                icon={CAN_COPY ? 'copy' : 'share-outline'}
                label={CAN_COPY ? 'Copy library' : 'Send my library'}
                value={count > 0 ? `${count} games` : undefined}
                onPress={count > 0 ? sendLibrary : undefined}
              />
            </View>

            {available ? (
              <>
                <Text style={styles.groupLabel}>ACCOUNT</Text>
                <View style={styles.group}>
                  {/* A chevron to a screen, like every other row here.
                      This opened in place for a while, which has no URL
                      to link to on the web, nowhere to put the states
                      that come after a magic link, and no room for the
                      account deletion an app with accounts has to
                      offer. See app/account. */}
                  {/* The state, not the intention. This row said
                      "Synced" the moment somebody signed in, whether or
                      not a round had ever finished — and a row that
                      always says yes tells you nothing on the day it
                      matters. */}
                  <Row
                    icon={
                      !session
                        ? 'cloud-outline'
                        : syncStatus.state === 'failed'
                          ? 'cloud-offline-outline'
                          : syncStatus.state === 'synced'
                            ? 'cloud-done'
                            : 'cloud-outline'
                    }
                    label={
                      session
                        ? SYNC_LABEL[syncStatus.state]
                        : 'Sync to another device'
                    }
                    value={session ? (email ?? undefined) : 'Not signed in'}
                    onPress={() => router.push('/account')}
                  />
                </View>
              </>
            ) : null}

            <View style={styles.legal}>
              {LEGAL.map((page, i) => (
                <View key={page.href} style={styles.legalItem}>
                  {i > 0 ? <Text style={styles.legalDot}>·</Text> : null}
                  <Pressable
                    onPress={() => router.push(page.href)}
                    accessibilityRole="link"
                    hitSlop={8}
                  >
                    <Text style={styles.legalLink}>{page.label}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </FadeInView>

        {/* Web keeps its footer; native does not — see SiteFooter. */}
        {/* Out past the shell column's padding on a desk, so the shore
            runs the column's full width the way Home's does; on a phone
            the footer is already the page's width. */}
        <SiteFooter inset={isExpanded ? SPACING.xl : 0} />
      </Screen>
    </>
  );
  return isExpanded ? (
    <DesktopShell activeKey="you">{page}</DesktopShell>
  ) : (
    <Textured style={styles.background}>{page}</Textured>
  );
}

/**
 * How tall the band is. Three hundred left a third of the screen empty
 * above the avatar on a phone — a masthead is a ground for the identity
 * to stand on, not a void to fall through.
 */
const WALL_HEIGHT = 260;

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: GUTTER, zIndex: 10 },

  masthead: {
    minHeight: WALL_HEIGHT,
    justifyContent: 'flex-end',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.md,
    overflow: 'hidden',
  },
  /**
   * On a desk the wall runs the column's full width, flush to the
   * sidebar and the top, the way Home's stage does - not a 720-point
   * rounded card floated in the middle of a 1200-point column, which
   * was a phone screen centred on a monitor. The identity sits at the
   * column's inset, on the same left edge as every heading below it.
   */
  mastheadExpanded: {
    marginHorizontal: -SPACING.xl,
    marginTop: -SPACING.lg,
    minHeight: 320,
    paddingHorizontal: SPACING.xl * 1.5,
    paddingBottom: SPACING.xl,
  },
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wallImage: { width: '100%', height: '100%' },
  wallVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(39,47,63,0.42)',
  },

  identity: { gap: SPACING.xs },
  /** Avatar beside the name, on the baseline, where the width allows. */
  identityWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.lg,
  },
  identityText: { gap: SPACING.xs, flexShrink: 1 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    marginBottom: SPACING.sm,
  },
  avatarSynced: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monogram: { fontFamily: 'Geom-ExtraBold', fontSize: 24, color: COLORS.navy },
  who: { ...TYPE.display, color: COLORS.white },
  where: { ...TYPE.caption, color: COLORS.lightGrey },

  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xl,
  },

  /**
   * The three doors.
   *
   * Set on the page rather than in a box: a bordered card around three
   * numbers is the stat-grid this screen has already failed at twice.
   * The colours are the app's own semantics — amber is time, mint is
   * finishing, coral is letting go — and they go grey at zero, because
   * a bright nought is a reprimand.
   */
  innerExpanded: {
    maxWidth: 880,
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
    paddingTop: SPACING.lg,
  },
  doors: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  door: { flex: 1, gap: 3, paddingVertical: SPACING.xs },
  doorDivided: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.stroke,
    paddingLeft: SPACING.md,
  },
  doorPressed: { opacity: 0.6 },
  doorValue: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 30,
    letterSpacing: -0.8,
  },
  doorLabel: { ...TYPE.micro, color: COLORS.mediumGrey },

  groupLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  /**
   * Hairline rows on the page, not a bordered box.
   *
   * Every container on this screen used to be the same 8%-white
   * rectangle, so the page read as three grey slabs regardless of what
   * was in them. Rules between rows say the same thing and draw a
   * quarter as much.
   */
  group: { borderTopWidth: 1, borderTopColor: COLORS.stroke },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: { ...TYPE.body, color: COLORS.lightGrey, flex: 1 },
  rowValue: { ...TYPE.body, color: COLORS.mediumGrey },

  legal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  legalItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  legalDot: { ...TYPE.caption, color: COLORS.mediumGrey },
  legalLink: { ...TYPE.caption, color: COLORS.mediumGrey, paddingVertical: 12 },
});
