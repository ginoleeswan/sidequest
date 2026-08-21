import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHydrated } from '@/hooks/useHydrated';
import { formatHours } from '@/lib/duration';
import { decodePlan, sharedSummary } from '@/lib/planLink';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Somebody else's plan.
 *
 * Read-only, and read entirely out of the URL — there is no account
 * behind it and no copy of it on any server, which is what makes it
 * shareable at all. Whoever opens it sees the same page for ever, even
 * if the person who made it changes their mind tomorrow.
 */
export default function SharedPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const params = useLocalSearchParams<{ p?: string }>();

  // The plan is on the URL, and the pre-rendered HTML was built without
  // one; reading it during the hydration render is a mismatch.
  const hydrated = useHydrated();
  const plan = hydrated ? decodePlan(params.p ?? '') : null;

  return (
    <Textured style={styles.background}>
      <PageTitle>A plan — Sidequest</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

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
        {!plan ? (
          <Message
            icon="link-outline"
            title={
              hydrated ? 'That link has no plan in it' : 'Reading the link…'
            }
            detail="Plans travel in the link itself, so a truncated one cannot be recovered. Ask for it again."
            actionLabel="Make your own"
            onAction={() => router.push('/plan')}
          />
        ) : (
          <>
            <SectionHeader title="A plan" eyebrow="SHARED WITH YOU" />
            <Text style={styles.summary}>{sharedSummary(plan)}</Text>

            <View style={styles.list}>
              {plan.games.map((game, index) => (
                <View key={`${game.name}-${index}`} style={styles.row}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {game.name}
                  </Text>
                  <Text style={styles.hours}>{formatHours(game.hours)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.note}>
              Nothing here is stored anywhere — this plan lives in the link.
              Build your own and Sidequest will tell you what you can actually
              finish.
            </Text>
          </>
        )}
      </View>
      <SiteFooter />
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.md,
  },
  summary: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  list: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  rank: {
    ...TYPE.h4,
    color: COLORS.mediumGrey,
    width: 20,
  },
  name: {
    ...TYPE.label,
    color: COLORS.lightGrey,
    flex: 1,
  },
  hours: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  note: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: SPACING.sm,
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
