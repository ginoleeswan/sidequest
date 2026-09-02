import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { HorizonStrip } from '@/components/HorizonStrip';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { WeekView } from '@/components/WeekView';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHydrated } from '@/hooks/useHydrated';
import { formatHours } from '@/lib/duration';
import { planColour } from '@/lib/planColours';
import { decodePlan, sharedSummary, type SharedPlan } from '@/lib/planLink';
import { planSchedule, type ScheduledItem } from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Somebody else's plan, drawn as a plan.
 *
 * Read-only, and read entirely out of the URL — there is no account
 * behind it and no copy of it on any server, which is what makes it
 * shareable at all.
 *
 * It used to be a numbered list of names and hours, which is the one
 * thing this app is not: a backlog. The link carries the games and the
 * pace, and those are the only two inputs the engine has ever needed —
 * so the friend who opens it sees what the sender sees, the same week
 * of evenings and the same horizon of credits, off the same code. This
 * is the app's whole argument, made with games somebody they know
 * chose, and it is the only screen a stranger reaches by being given
 * something.
 *
 * What the link does NOT carry is dates: no "now", no deadlines, no
 * progress. So the week and the horizon are drawn from the READER'S
 * today rather than the sender's, and the page says so once rather
 * than quietly presenting invented dates as a promise somebody made.
 */

/**
 * A shared plan, run back through the engine that produced it.
 *
 * The rows arrive already in schedule order — the sender encoded
 * `schedule.scheduled` — so this recovers what the link could not
 * carry rather than deciding anything: each game's landing date at
 * this pace, counting from now. Ids are positional because a link
 * carries no ids, and positional is all the colours and keys need.
 */
export function sharedSchedule(plan: SharedPlan, now: number): ScheduledItem[] {
  return planSchedule(
    plan.games.map((game, index) => ({
      id: index + 1,
      name: game.name,
      hours: game.hours,
    })),
    { hoursPerWeek: plan.pace, now }
  ).scheduled;
}

const finishDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function SharedPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const params = useLocalSearchParams<{ p?: string }>();

  // The plan is on the URL, and the pre-rendered HTML was built without
  // one; reading it during the hydration render is a mismatch.
  const hydrated = useHydrated();
  const plan = hydrated ? decodePlan(params.p ?? '') : null;

  // Captured once per visit, so the dates hold still while you read.
  const [now] = useState(() => Date.now());
  const scheduled = plan ? sharedSchedule(plan, now) : [];

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
              {/* Said once, plainly. The alternative is a page of dates
                  nobody promised, presented as though they had. */}
              <Text style={styles.fromToday}>
                The link carries the games and the pace, not the dates — so this
                is drawn from today.
              </Text>

              <View style={styles.section}>
                <SectionHeader
                  title="The week"
                  eyebrow="Their evenings — the free ones count"
                />
                <WeekView scheduled={scheduled} now={now} readOnly />
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="The month"
                  eyebrow="Where the credits land"
                />
                <View style={styles.monthCard}>
                  <HorizonStrip scheduled={scheduled} now={now} />
                  <View style={styles.monthRule} />
                  <View>
                    {scheduled.map((item, index) => (
                      <View
                        key={item.id}
                        style={[
                          styles.row,
                          index === scheduled.length - 1 && styles.rowLast,
                        ]}
                      >
                        <View
                          style={[
                            styles.node,
                            { borderColor: planColour(index) },
                          ]}
                        >
                          <Text
                            style={[
                              styles.nodeText,
                              { color: planColour(index) },
                            ]}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        <View style={styles.body}>
                          <Text style={styles.name} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.hours}>
                            {formatHours(item.hours)}
                          </Text>
                        </View>
                        <Text style={styles.date}>
                          {finishDate(item.finishAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.note}>
                Nothing here is stored anywhere — this plan lives in the link.
                Build your own and Sidequest will tell you what you can actually
                finish.
              </Text>

              {/*
                The sentence above has invited the reader to build one
                since this screen shipped, and there was nothing to
                press. The broken-link branch had a button and this one
                did not, so the path that fails converted and the path
                somebody's friend actually sends dead-ended on a
                compliment.

                This is the only screen a stranger reaches by being
                given something, which makes it the one place the app
                has earned the right to ask.
              */}
              <Pressable
                onPress={() => router.push('/plan')}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.build,
                  pressed && styles.buildPressed,
                ]}
              >
                <Text style={styles.buildText}>Build your own</Text>
              </Pressable>
            </>
          )}
        </View>
        <SiteFooter />
      </Screen>
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
  fromToday: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.sm,
    maxWidth: 520,
  },
  /** The same rhythm the plan page uses: blocks, not a column of things. */
  section: { gap: SPACING.sm + 2, marginTop: SPACING.lg },

  monthCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    ...SHADOW.card,
  },
  monthRule: { height: 1, backgroundColor: COLORS.stroke },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  rowLast: { borderBottomWidth: 0 },
  /** The route's node, in this game's colour — same as the strip's flag. */
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeText: { ...TYPE.h4 },
  body: { flex: 1, gap: 1 },
  name: { ...TYPE.label, color: COLORS.lightGrey },
  hours: { ...TYPE.caption, color: COLORS.mediumGrey },
  date: { ...TYPE.h4, color: COLORS.lightGrey },

  build: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  buildPressed: { opacity: 0.85 },
  buildText: {
    ...TYPE.label,
    // Dark on the amber face, like every other amber control here.
    color: COLORS.navy,
  },
  note: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xl,
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
