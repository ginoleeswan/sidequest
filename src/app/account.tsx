import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { FadeInView } from '@/components/FadeInView';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { Screen } from '@/components/Screen';
import { SignInRows } from '@/components/SignInRows';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { useAuth } from '@/lib/auth';
import { useSync, type SyncStatus } from '@/lib/sync/SyncProvider';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The account, as a screen of its own.
 *
 * It began as a row on You that expanded in place, which is the
 * lightest thing that could work and the wrong shape for three reasons.
 * A disclosure has no URL, and on the web this is the one page you want
 * to be able to link to — from an email, from the landing page, from
 * the redirect a provider sends somebody back on. It has nowhere to put
 * the states that come next: the inbox wait after a magic link, a
 * provider's error, the consent line, and the account deletion the App
 * Store requires of anything that offers accounts. And on a screen
 * where every other row is a chevron to somewhere, it was the one
 * control that behaved differently.
 *
 * The provider buttons are solid here, and that is the point of moving
 * them. On You they were the loudest thing on a page about a product
 * that promises no account is needed; on the screen whose entire job is
 * signing in, being the loudest thing is correct.
 */

/** What an account actually carries. Named, because "sync" is a claim. */
const TRAVELS = [
  'Your library, and the shelves you sorted it into',
  'Your plan, your pace and the lengths you corrected',
  'Your notes, tags, deadlines and ratings',
];

/**
 * And what does not — which is the harder half to write and the half
 * worth writing.
 *
 * Play sessions and drop reasons are counts and minutes kept in a shape
 * that would lose detail crossing a table, so they are honestly
 * device-local rather than dishonestly half-synced. Somebody who reads
 * this list and then wipes their phone should not be surprised by what
 * came back.
 */
const STAYS = [
  'Play sessions, and the time they logged',
  'Why you dropped what you dropped',
  'Recently viewed, and anything you searched',
];

/** The status line, said plainly rather than reassuringly. */
function syncLine(status: SyncStatus, email: string | null): string {
  switch (status.state) {
    case 'syncing':
      return 'Catching up with your other devices now.';
    case 'synced':
      return `Everything below is on ${email ?? 'your account'} as well as this device. It syncs when you sign in and shortly after anything changes.`;
    case 'failed':
      return `Could not reach the server just now (${status.reason}). Nothing was lost — this device has all of it, and the next change will try again.`;
    default:
      return 'Signed in. Your library and plan will sync the next time anything changes.';
  }
}

const EYEBROW: Record<SyncStatus['state'], string> = {
  idle: 'SIGNED IN',
  syncing: 'SYNCING',
  synced: 'SYNCED',
  failed: 'NOT SYNCED',
};

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const topPad = useTopPad(true);
  const { session, available } = useAuth();
  const { status, syncNow } = useSync();

  const email = session?.user.email ?? null;

  return (
    <Textured style={styles.background}>
      <PageTitle>Account — Sidequest</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

      <Screen>
        <FadeInView>
          <View style={[styles.inner, { paddingTop: topPad }]}>
            {!available ? (
              /* A build made without Supabase keys has no account to
                 offer. Saying so beats a screen of buttons that cannot
                 do anything. */
              <Message
                icon="cloud-offline-outline"
                title="No account in this build"
                detail="Everything works on this device. Use Copy library on You to move your shelf across."
              />
            ) : (
              <>
                <Text
                  style={[
                    styles.eyebrow,
                    status.state === 'failed' && styles.eyebrowOff,
                  ]}
                >
                  {session ? EYEBROW[status.state] : 'OPTIONAL'}
                </Text>
                <Text style={styles.title}>
                  {session
                    ? (email ?? 'Signed in')
                    : 'Use Sidequest on another device'}
                </Text>
                <Text style={styles.blurb}>
                  {session
                    ? syncLine(status, email)
                    : 'Signing in syncs your library and your plan. It doesn’t unlock anything — everything in the app already works without it, and it always will.'}
                </Text>
                {session && status.state !== 'syncing' && (
                  <Pressable
                    onPress={syncNow}
                    accessibilityRole="button"
                    style={styles.retry}
                  >
                    <Text style={styles.retryText}>Sync now</Text>
                  </Pressable>
                )}

                {/* SignInRows draws its own spinner while the stored
                    session is being worked out — a second gate here
                    only made the screen blank instead of busy. */}
                <View style={styles.rows}>
                  <SignInRows />
                </View>

                <Text style={styles.groupLabel}>WHAT TRAVELS</Text>
                <View style={styles.list}>
                  {TRAVELS.map((line) => (
                    <View key={line} style={styles.listRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.listText}>{line}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.groupLabel}>STAYS ON THIS DEVICE</Text>
                <View style={styles.list}>
                  {STAYS.map((line) => (
                    <View key={line} style={styles.listRow}>
                      <View style={[styles.bullet, styles.bulletOff]} />
                      <Text style={styles.listText}>{line}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.fine}>
                  Nothing else leaves the device. No reading, no address book,
                  and no email from us that you didn’t ask for. Signing out
                  leaves every one of these lists here.
                </Text>

                {!session && (
                  <Text style={styles.fine}>
                    Signing in means you accept the{' '}
                    <Text
                      style={styles.link}
                      onPress={() => router.push('/terms')}
                      accessibilityRole="link"
                    >
                      Terms
                    </Text>{' '}
                    and the{' '}
                    <Text
                      style={styles.link}
                      onPress={() => router.push('/privacy')}
                      accessibilityRole="link"
                    >
                      Privacy policy
                    </Text>
                    .
                  </Text>
                )}
              </>
            )}
          </View>
        </FadeInView>
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
  },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  eyebrowOff: { color: COLORS.mediumGrey },
  title: { ...TYPE.title, color: COLORS.white, marginTop: SPACING.xs },
  blurb: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    marginTop: SPACING.sm,
  },
  retry: {
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  retryText: {
    ...TYPE.caption,
    color: COLORS.lightGrey,
    textDecorationLine: 'underline',
  },
  rows: { marginTop: SPACING.xl },

  groupLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  list: { gap: SPACING.sm },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    // Nudged onto the first line's optical centre rather than its top.
    marginTop: 8,
  },
  // Hollow, so the two lists read as opposites at a glance.
  bulletOff: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.mediumGrey,
  },
  listText: { ...TYPE.body, color: COLORS.lightGrey, flex: 1 },
  fine: { ...TYPE.caption, color: COLORS.mediumGrey, marginTop: SPACING.md },
  link: {
    color: COLORS.lightGrey,
    textDecorationLine: 'underline',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
});

/** One bad screen degrades locally rather than blanking the app. */
export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
