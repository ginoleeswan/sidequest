import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DesktopShell } from '@/components/DesktopShell';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { Mark } from '@/components/Mark';
import { PageTitle } from '@/components/PageTitle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Segmented, type SegmentedOption } from '@/components/Segmented';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
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
import { COLORS, alpha } from '@/styles/colors';
import { GUTTER, ICON, LAYOUT, RADIUS, SPACING, TOUCH } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/** The Plan's own pace dial — the same six, so the two cannot disagree. */
const PACE_OPTIONS: SegmentedOption<number>[] = [2, 4, 6, 8, 12, 20].map(
  (hours) => ({ value: hours, label: `${hours}h` })
);

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
    <Touchable
      onPress={onPress}
      accessibilityLabel={`${value} ${label}`}
      style={[styles.door, !first && styles.doorDivided]}
    >
      <Text
        style={[styles.doorValue, { color: colour }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={FONT_SCALE.figure}
      >
        {value}
      </Text>
      <Text style={styles.doorLabel} maxFontSizeMultiplier={FONT_SCALE.label}>
        {label}
      </Text>
    </Touchable>
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
    <>
      <Ionicons name={icon} size={ICON.md} color={COLORS.mediumGrey} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={ICON.sm}
          color={COLORS.mediumGrey}
        />
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Touchable onPress={onPress} feedback="tint" style={styles.row}>
      {body}
    </Touchable>
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
  const [pace, setPace] = usePersistedState('sidequest.plan.pace', 6);
  /** The pace, changed here rather than by a trip to the Plan. */
  const [paceOpen, setPaceOpen] = useState(false);
  const paceOptions = PACE_OPTIONS.some((option) => option.value === pace)
    ? PACE_OPTIONS
    : [...PACE_OPTIONS, { value: pace, label: `${pace}h · measured` }];
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
          {/* The band is as tall as its picture needs. With no cover
              there is no picture, and 260 points of ground held open for
              one was a void above the name; without it the band is the
              name's own height, on a ground that still reads as one. */}
          <View
            style={[
              styles.masthead,
              cover ? styles.mastheadWithCover : styles.mastheadBare,
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
              colors={[alpha(COLORS.navy, 0.8), 'transparent']}
              locations={[0, 0.45]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.identity, isExpanded && styles.identityWide]}>
              <View style={[styles.avatar, session && styles.avatarSynced]}>
                {session ? (
                  <Text
                    style={styles.monogram}
                    maxFontSizeMultiplier={FONT_SCALE.display}
                  >
                    {who.slice(0, 1).toUpperCase()}
                  </Text>
                ) : (
                  <Mark size={30} />
                )}
              </View>
              <View style={styles.identityText}>
                <Text
                  style={styles.eyebrow}
                  maxFontSizeMultiplier={FONT_SCALE.label}
                >
                  {session ? 'Signed in' : 'On this device'}
                </Text>
                <Text
                  style={styles.who}
                  numberOfLines={1}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={FONT_SCALE.display}
                >
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
                colour={dropped > 0 ? COLORS.coralText : COLORS.mediumGrey}
                onPress={() => router.push('/tidy')}
              />
            </View>

            <Text style={styles.groupLabel}>YOUR SETUP</Text>
            <View style={styles.group}>
              <Row
                icon="speedometer"
                label="Your pace"
                value={`${pace}h a week`}
                onPress={() => setPaceOpen(true)}
              />
              <Row
                icon="download-outline"
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
                  <Touchable
                    onPress={() => router.push(page.href)}
                    accessibilityRole="link"
                    hitSlop="text"
                  >
                    <Text style={styles.legalLink}>{page.label}</Text>
                  </Touchable>
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

      <BottomSheet
        visible={paceOpen}
        onClose={() => setPaceOpen(false)}
        accessibilityLabel="Your pace"
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            How much do you really play?
          </Text>
          <Text style={styles.sheetDetail}>
            The plan and every date in it are built on this.
          </Text>
          <Segmented
            label="Hours a week"
            options={paceOptions}
            value={pace}
            onChange={setPace}
          />
          <PrimaryButton
            label="Done"
            variant="secondary"
            haptic="tap"
            block
            onPress={() => setPaceOpen(false)}
          />
        </View>
      </BottomSheet>
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
    justifyContent: 'flex-end',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.md,
    overflow: 'hidden',
  },
  mastheadWithCover: { minHeight: WALL_HEIGHT },
  /** No picture: the name's own height, on the page's evening ground. */
  mastheadBare: { backgroundColor: COLORS.navy },
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
    paddingHorizontal: SPACING.xxl,
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
    backgroundColor: alpha(COLORS.navy, 0.42),
  },

  identity: { gap: SPACING.xs },
  /** Avatar beside the name, on the baseline, where the width allows. */
  identityWide: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.lg,
  },
  identityText: { gap: SPACING.xxs, flexShrink: 1 },
  eyebrow: { ...TYPE.micro, color: COLORS.lightGrey },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    marginBottom: SPACING.sm,
  },
  /** Signed in: a white disc. Amber is hours, and an account is not. */
  avatarSynced: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  monogram: { ...TYPE.h1, color: COLORS.navy },
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
  door: {
    flex: 1,
    gap: SPACING.xxs,
    minHeight: TOUCH.min,
    paddingVertical: SPACING.xs,
  },
  doorDivided: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.stroke,
    paddingLeft: SPACING.md,
  },
  /** A figure, from the scale — it was hand-set at 30 with no line height. */
  doorValue: { ...TYPE.figure },
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
    minHeight: 52,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
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
  legalLink: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    paddingVertical: SPACING.xs,
  },

  sheet: { gap: SPACING.md },
  sheetTitle: { ...TYPE.h2, color: COLORS.white },
  sheetDetail: { ...TYPE.p, color: COLORS.mediumGrey },
});
