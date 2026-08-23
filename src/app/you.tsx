import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { SignInRows } from '@/components/SignInRows';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHydrated } from '@/hooks/useHydrated';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useDurations } from '@/lib/durations';
import { formatHours } from '@/lib/duration';
import { useLibrary } from '@/lib/library';
import { libraryStats } from '@/lib/libraryStats';
import { readDrops, totalDrops } from '@/lib/drops';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * You — the one place the app is about the reader rather than the games.
 *
 * It exists because two things had nowhere to live. The legal pages were
 * reachable only through the site footer, which is a web device this app
 * repeats on thirteen native screens where a tab bar already does the
 * navigating; and the reader's own numbers were scattered across three
 * screens that each computed a slice of them.
 *
 * Profile and settings are one screen here, and that is not a shortcut.
 * With no account there is nothing to a profile except your pace, your
 * numbers and your data — which is exactly what a settings screen holds.
 * Splitting them would be one screen cut in half.
 *
 * It is also where signing in will appear, and the shape is chosen for
 * that: every row here works with no account, and an account adds one
 * more row rather than unlocking any of these. The app's own hero says
 * "no account" in capitals, and the only honest way to add sign-in under
 * that promise is for it to buy sync and never features.
 */

function Row({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, last && styles.rowLast]}>
      <Ionicons name={icon} size={18} color={COLORS.mediumGrey} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={COLORS.mediumGrey} />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

/** One number and what it counts. The screen's only ornament. */
function Figure({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureNumber}>{n}</Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

export default function YouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const { entries, count, exportJson } = useLibrary();
  const toast = useToast();

  /** Straight to the clipboard, and it says whether that worked. */
  const copyLibrary = async () => {
    try {
      await navigator.clipboard?.writeText(exportJson());
      toast('Library copied — paste it on another device', 'copy');
    } catch {
      toast(
        'Copy failed — your browser blocked clipboard access',
        'alert-circle'
      );
    }
  };
  const { durationOf } = useDurations();
  const hydrated = useHydrated();
  const [pace] = usePersistedState('sidequest.plan.pace', 6);

  const all = useMemo(() => Object.values(entries), [entries]);
  const stats = useMemo(
    () => libraryStats(all, (game) => durationOf(game).hours),
    [all, durationOf]
  );
  // Drops live in their own store and are only readable once storage has
  // been hydrated — before that the honest answer is none, not a guess.
  const dropped = hydrated ? totalDrops(readDrops()) : 0;

  return (
    <Textured style={styles.background}>
      <PageTitle>You — Sidequest</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : Platform.OS === 'web' ? (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      ) : null}

      <Screen>
        <View
          style={[
            styles.inner,
            {
              paddingTop: isExpanded
                ? SPACING.xl * 1.5
                : insets.top + SPACING.xl * 2,
            },
          ]}
        >
          <Text style={styles.eyebrow}>NO ACCOUNT NEEDED</Text>
          <Text style={styles.title}>You</Text>

          {/* The numbers first, because they are the only part of this
              screen anybody opens it to see. Everything below is a
              control, and controls can wait their turn. */}
          <View style={styles.figures}>
            <Figure n={String(stats.waiting + stats.playing)} label="SAVED" />
            <Figure n={String(stats.finishedThisYear)} label="FINISHED" />
            <Figure n={formatHours(stats.hoursAhead)} label="AHEAD" />
          </View>

          {dropped > 0 ? (
            <Text style={styles.dropLine}>
              And {dropped} you decided against — which is the point of the app,
              not a failure of it.
            </Text>
          ) : null}

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
                two hundred. Exporting is a settings action, and this is
                where the settings are. */}
            <Row
              icon="copy"
              label="Copy library"
              value={count > 0 ? `${count} games` : undefined}
              onPress={count > 0 ? copyLibrary : undefined}
              last
            />
          </View>

          <View style={styles.group}>
            <Row
              icon="information-circle"
              label="About Sidequest"
              onPress={() => router.push('/about')}
            />
            <Row
              icon="document-text"
              label="Terms"
              onPress={() => router.push('/terms')}
            />
            {/* The reason this screen exists at all: on native these two
                were reachable only through the footer, and a privacy
                policy nobody can open is a submission problem as well as
                a bad answer. */}
            <Row
              icon="lock-closed"
              label="Privacy"
              onPress={() => router.push('/privacy')}
              last
            />
          </View>

          <SignInRows />

          <Text style={styles.promise}>
            Everything here is on this device unless you sign in — and signing
            in only syncs it, it never unlocks anything.
          </Text>
        </View>

        {/* Web keeps its footer; native does not — see SiteFooter. */}
        <SiteFooter />
      </Screen>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: GUTTER, zIndex: 10 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  title: { ...TYPE.h1, color: COLORS.white, marginBottom: SPACING.sm },

  figures: { flexDirection: 'row', gap: SPACING.sm },
  figure: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    gap: 2,
  },
  figureNumber: {
    fontFamily: 'Noah-Black',
    fontSize: 26,
    color: COLORS.white,
  },
  figureLabel: { ...TYPE.micro, color: COLORS.mediumGrey },
  dropLine: { ...TYPE.caption, color: COLORS.mediumGrey },

  group: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...TYPE.body, color: COLORS.lightGrey, flex: 1 },
  rowValue: { ...TYPE.body, color: COLORS.mediumGrey },

  promise: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: SPACING.md,
  },
});
