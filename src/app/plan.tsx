import { Ionicons } from '@expo/vector-icons';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';

import type { Game } from '@/api/types';
import { BackButton } from '@/components/BackButton';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Message } from '@/components/Message';
import { SectionHeader } from '@/components/SectionHeader';
import { SteamConnect } from '@/components/SteamConnect';
import { Textured } from '@/components/Textured';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useLibrary } from '@/lib/library';
import {
  pickTonight,
  planSchedule,
  type PlanItem,
  type ScheduledItem,
} from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const PACE_OPTIONS = [2, 4, 6, 8, 12, 20];
const WINDOW_OPTIONS = [
  { label: 'whenever', weeks: null },
  { label: 'in 2 weeks', weeks: 2 },
  { label: 'in a month', weeks: 4.35 },
  { label: 'in 3 months', weeks: 13 },
];
const SESSION_OPTIONS = [30, 60, 90, 180];

/** Step to the next option, wrapping — one tap, no grid of chips. */
function cycle<T>(options: readonly T[], current: T): T {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length] ?? options[0];
}

/**
 * A value you can tap, living inside a sentence. Each tap steps to the
 * next option — the plan reads as a sentence you finish, not a form you
 * fill in.
 */
function InlineValue({
  label,
  hint,
  onPress,
}: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Text
      style={styles.inlineValue}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${hint}: ${label}. Tap to change.`}
      suppressHighlighting
    >
      {' '}
      {label} <Text style={styles.inlineCaret}>▾</Text>{' '}
    </Text>
  );
}

const finishDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface Entry {
  game: Game;
  hours: number;
  playing: boolean;
}

function QuestRow({
  item,
  index,
  isLast,
  game,
  onPress,
}: {
  item: ScheduledItem;
  index: number;
  isLast: boolean;
  game?: Game;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quest} onPress={onPress}>
      {/* the path: a node per game, a thread connecting them */}
      <View style={styles.questRail}>
        {index > 0 && <View style={styles.questThreadTop} />}
        {!isLast && <View style={styles.questThreadBottom} />}
        <View style={styles.questNode}>
          <Text style={styles.questNodeText}>{index + 1}</Text>
        </View>
      </View>
      <CoverImage
        uri={game?.background_image}
        style={styles.questThumb}
        iconSize={16}
      />
      <View style={styles.questBody}>
        <Text style={styles.questTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.questMeta}>~{Math.round(item.hours)}h</Text>
      </View>
      <View style={styles.questWhen}>
        <Text style={styles.questDate}>{finishDate(item.finishAt)}</Text>
        <Text style={styles.questDateLabel}>done by</Text>
      </View>
    </Pressable>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const { byStatus } = useLibrary();

  const [pace, setPace] = usePersistedState('sidequest.plan.pace', 6);
  const [windowWeeks, setWindowWeeks] = usePersistedState<number | null>(
    'sidequest.plan.window',
    null
  );
  const [session, setSession] = useState(60);
  const [steamOpen, setSteamOpen] = useState(false);

  // Playing games count at half their estimate - you're partway in.
  const entries: Entry[] = useMemo(
    () => [
      ...byStatus('playing').map((e) => ({
        game: e.game,
        hours: (e.game.playtime ?? 0) * 0.5,
        playing: true,
      })),
      ...byStatus('wishlist').map((e) => ({
        game: e.game,
        hours: e.game.playtime ?? 0,
        playing: false,
      })),
    ],
    [byStatus]
  );

  const gamesById = useMemo(
    () => new Map(entries.map((e) => [e.game.id, e.game])),
    [entries]
  );

  // Captured once per visit: a stable "now" keeps render pure and the
  // projected dates steady while you fiddle with the controls.
  const [now] = useState(() => Date.now());

  const schedule = useMemo(() => {
    const items: PlanItem[] = entries
      .filter((e) => e.hours > 0)
      .map((e) => ({ id: e.game.id, name: e.game.name, hours: e.hours }));
    return planSchedule(items, {
      hoursPerWeek: pace,
      now,
      deadline: windowWeeks != null ? now + windowWeeks * WEEK_MS : undefined,
    });
  }, [entries, pace, windowWeeks, now]);

  const unknown = entries.filter((e) => e.hours <= 0);

  const tonight = useMemo(
    () =>
      pickTonight(
        entries.map((e) => ({
          id: e.game.id,
          name: e.game.name,
          hours: e.hours,
          playing: e.playing,
        })),
        session
      ),
    [entries, session]
  );

  const tonightPick =
    tonight.finishable ?? tonight.continueGame ?? tonight.shortest;
  const tonightVerb = tonight.finishable
    ? 'Finish'
    : tonight.continueGame
      ? 'Continue'
      : 'Start';

  const empty = entries.length === 0;
  const allFit = schedule.dropped.length === 0 && schedule.scheduled.length > 0;
  const lastFinish =
    schedule.scheduled[schedule.scheduled.length - 1]?.finishAt;

  return (
    <Textured style={styles.background}>
      <Head>
        <title>The Plan — Sidequest</title>
      </Head>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

      <View style={{ paddingBottom: SPACING.xl * 1.5 }}>
        <FadeInView>
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
            <SectionHeader
              title="The Plan"
              eyebrow={empty ? undefined : `${entries.length} in your queue`}
            />

            {empty ? (
              <Message
                icon="map-outline"
                title="Nothing to plan yet"
                detail="Save games to your library — Want to play or Playing — and the plan builds itself."
                actionLabel="Find games"
                onAction={() => router.push('/')}
              />
            ) : (
              <>
                {/* the answer, first */}
                <View style={styles.verdict}>
                  <View style={styles.verdictBar} />
                  <Text style={styles.verdictTitle}>
                    {schedule.scheduled.length === 0
                      ? 'This window is too tight'
                      : allFit
                        ? 'You can finish all of it'
                        : `${schedule.scheduled.length} of these will get done`}
                  </Text>
                  <Text style={styles.verdictDetail}>
                    {schedule.scheduled.length > 0 && lastFinish
                      ? `~${Math.round(schedule.totalHours)} hours of play — credits on the last one by ${finishDate(lastFinish)}.`
                      : 'Give it more time or a wider window — or let a few of these go. That’s allowed.'}
                  </Text>

                  {/* the whole setup is one sentence */}
                  <Text style={styles.sentence}>
                    I play about
                    <InlineValue
                      label={
                        PACE_OPTIONS.includes(pace)
                          ? `${pace}h`
                          : `${pace}h · Steam`
                      }
                      hint="Hours per week"
                      onPress={() => setPace(cycle(PACE_OPTIONS, pace))}
                    />
                    a week, and I want these done
                    <InlineValue
                      label={
                        WINDOW_OPTIONS.find((o) => o.weeks === windowWeeks)
                          ?.label ?? 'whenever'
                      }
                      hint="Finish window"
                      onPress={() =>
                        setWindowWeeks(
                          cycle(
                            WINDOW_OPTIONS.map((o) => o.weeks),
                            windowWeeks
                          )
                        )
                      }
                    />
                  </Text>

                  <Text
                    style={styles.steamLink}
                    onPress={() => setSteamOpen((open) => !open)}
                    accessibilityRole="button"
                    suppressHighlighting
                  >
                    {steamOpen
                      ? 'Hide Steam'
                      : 'Not sure? Measure your real pace with Steam →'}
                  </Text>
                </View>

                {steamOpen && (
                  <SteamConnect
                    onUsePace={(measured) => {
                      setPace(measured);
                      setSteamOpen(false);
                    }}
                  />
                )}

                {/* tonight */}
                {tonightPick && (
                  <Pressable
                    style={styles.tonight}
                    onPress={() => router.push(`/game/${tonightPick.id}`)}
                  >
                    <View style={styles.tonightBody}>
                      <View style={styles.tonightHead}>
                        <Ionicons
                          name="moon"
                          size={13}
                          color={COLORS.mediumGrey}
                        />
                        <Text style={TYPE.micro}>Tonight</Text>
                      </View>
                      <Text style={styles.sentence}>
                        I have
                        <InlineValue
                          label={
                            session >= 60 ? `${session / 60}h` : `${session}m`
                          }
                          hint="Session length"
                          onPress={() =>
                            setSession(cycle(SESSION_OPTIONS, session))
                          }
                        />
                        → {tonightVerb}{' '}
                        <Text style={styles.tonightName}>
                          {tonightPick.name}
                        </Text>
                      </Text>
                      <Text style={styles.tonightWhy}>
                        {tonight.finishable
                          ? 'You can see the credits tonight.'
                          : tonight.continueGame
                            ? 'Chip away at it — progress counts.'
                            : 'The shortest thing you’ve saved.'}
                      </Text>
                    </View>
                    <CoverImage
                      uri={
                        gamesById.get(tonightPick.id)?.background_image
                      }
                      style={styles.tonightThumb}
                      iconSize={20}
                    />
                  </Pressable>
                )}

                {/* the route */}
                {schedule.scheduled.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader title="Your route" />
                    <View>
                      {schedule.scheduled.map((item, index) => (
                        <QuestRow
                          key={item.id}
                          item={item}
                          index={index}
                          isLast={index === schedule.scheduled.length - 1}
                          game={gamesById.get(item.id)}
                          onPress={() => router.push(`/game/${item.id}`)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* the honest part */}
                {schedule.dropped.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Side quests — for later"
                      eyebrow={`${schedule.dropped.length} games`}
                    />
                    <Text style={styles.droppedNote}>
                      At {pace}h a week these need more room than the window
                      has. They’ll still be here.
                    </Text>
                    <View style={styles.rows}>
                      {schedule.dropped.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[styles.row, styles.rowMuted]}
                          onPress={() => router.push(`/game/${item.id}`)}
                        >
                          <CoverImage
                            uri={gamesById.get(item.id)?.background_image}
                            style={styles.rowThumb}
                            iconSize={16}
                          />
                          <View style={styles.rowBody}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.rowMeta}>
                              {item.hours > 0
                                ? `needs ~${Math.round(item.hours)}h`
                                : 'length unknown'}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {unknown.length > 0 && (
                  <View style={styles.section}>
                    <SectionHeader
                      title="Length unknown"
                      eyebrow={`${unknown.length} games`}
                    />
                    <Text style={styles.droppedNote}>
                      RAWG has no playtime estimate for these yet, so the plan
                      can’t place them.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </FadeInView>
      </View>
      <SiteFooter />
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  verdict: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  verdictBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.plum,
  },
  verdictTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 19,
    color: COLORS.white,
  },
  verdictDetail: {
    fontFamily: 'Noah-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.mediumGrey,
  },
  sentence: {
    fontFamily: 'Noah-Regular',
    fontSize: 15,
    lineHeight: 30,
    color: COLORS.lightGrey,
  },
  inlineValue: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    color: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  inlineCaret: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    color: COLORS.plum,
  },
  steamLink: {
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.mediumGrey,
    marginTop: 2,
  },

  tonight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tonightBody: { flex: 1, gap: SPACING.xs + 2 },
  tonightHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tonightWhy: {
    fontFamily: 'Noah-Regular',
    fontSize: 12.5,
    color: COLORS.mediumGrey,
  },
  tonightName: { fontFamily: 'Noah-Black', color: COLORS.white },
  tonightThumb: { width: 96, height: 60, borderRadius: RADIUS.sm },

  section: { gap: SPACING.sm + 2 },
  rows: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
  },
  rowMuted: { opacity: 0.65 },
  rowThumb: { width: 56, height: 35, borderRadius: 6 },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    color: COLORS.lightGrey,
  },
  rowMeta: {
    fontFamily: 'Noah-Regular',
    fontSize: 11.5,
    color: COLORS.mediumGrey,
  },

  // the route: nodes on a thread
  quest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  questRail: {
    width: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questThreadTop: {
    position: 'absolute',
    top: 0,
    bottom: '50%',
    width: 2,
    backgroundColor: COLORS.strokeStrong,
  },
  questThreadBottom: {
    position: 'absolute',
    top: '50%',
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.strokeStrong,
  },
  questNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questNodeText: {
    fontFamily: 'Noah-Black',
    fontSize: 12,
    color: COLORS.white,
  },
  questThumb: { width: 64, height: 40, borderRadius: 6 },
  questBody: { flex: 1, gap: 1 },
  questTitle: {
    fontFamily: 'Noah-Bold',
    fontSize: 14.5,
    color: COLORS.lightGrey,
  },
  questMeta: {
    fontFamily: 'Noah-Regular',
    fontSize: 11.5,
    color: COLORS.mediumGrey,
  },
  questWhen: { alignItems: 'flex-end', gap: 1 },
  questDate: {
    fontFamily: 'Noah-Black',
    fontSize: 13,
    color: COLORS.lightGrey,
  },
  questDateLabel: {
    fontFamily: 'Noah-Regular',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.mediumGrey,
  },
  droppedNote: {
    fontFamily: 'Noah-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.mediumGrey,
  },
});
