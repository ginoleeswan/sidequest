import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';

import type { Game } from '@/api/types';
import { Alerts } from '@/components/Alerts';
import { RouteError } from '@/components/RouteError';
import { BackButton } from '@/components/BackButton';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { SectionHeader } from '@/components/SectionHeader';
import { SteamConnect } from '@/components/SteamConnect';
import { WeekView } from '@/components/WeekView';
import { Textured } from '@/components/Textured';
import { usePersistedState } from '@/hooks/usePersistedState';
import { DurationSheet } from '@/components/DurationSheet';
import {
  formatHours,
  remainingHours,
  type DurationSource,
} from '@/lib/duration';
import { useToast } from '@/components/Toast';
import { useDurations } from '@/lib/durations';
import { buildAlerts } from '@/lib/alerts';
import { useHydrated } from '@/hooks/useHydrated';
import { encodePlan } from '@/lib/planLink';
import { useLibrary } from '@/lib/library';
import { sessionMinutesFor } from '@/lib/sessions';
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
    <Text>
      {'  '}
      <Text
        style={styles.inlineValue}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${hint}: ${label}. Tap to change.`}
        suppressHighlighting
      >
        {'\u00A0'}
        {label} <Text style={styles.inlineCaret}>▾</Text>
        {'\u00A0'}
      </Text>
      {'  '}
    </Text>
  );
}

const finishDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface Entry {
  game: Game;
  /** Hours left, not hours long — see lib/duration remainingHours. */
  hours: number;
  /** The whole game's length, for saying "10h left of 40h". */
  totalHours: number;
  /** Measured, when Steam knows it. */
  played?: number;
  playing: boolean;
  /** The length is an estimate we don't fully trust. */
  rough: boolean;
  /** This one has to be finished, whatever the arithmetic prefers. */
  must: boolean;
  /** Its own deadline, epoch ms, if it has one. */
  deadline?: number;
  source: DurationSource;
}

function QuestRow({
  item,
  index,
  isLast,
  maxHours,
  game,
  entry,
  onPress,
  onEditLength,
}: {
  item: ScheduledItem;
  index: number;
  isLast: boolean;
  maxHours: number;
  game?: Game;
  entry?: Entry;
  onPress: () => void;
  onEditLength: () => void;
}) {
  const barPct = Math.max(6, Math.round((item.hours / maxHours) * 100));
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
        size="thumb"
        iconSize={16}
      />
      <View style={styles.questBody}>
        <View style={styles.questTitleRow}>
          {entry?.must && (
            <Ionicons name="star" size={11} color={COLORS.accent} />
          )}
          <Text style={styles.questTitle} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.questMetaRow}>
          <View style={styles.questBarTrack}>
            <View style={[styles.questBarFill, { width: `${barPct}%` }]} />
          </View>
          <Text
            style={[
              styles.questMeta,
              (entry?.source === 'yours' || entry?.source === 'reported') &&
                styles.questMetaYours,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              onEditLength();
            }}
            suppressHighlighting
            accessibilityRole="button"
            accessibilityLabel={`Change how long ${item.name} takes`}
          >
            {entry?.source === 'yours' || entry?.source === 'reported'
              ? ''
              : '~'}
            {formatHours(item.hours)}
            {entry?.played != null && entry.totalHours > 0
              ? ` left of ${formatHours(entry.totalHours)}`
              : ''}
            {entry?.rough ? ' ?' : ''}
            <Text style={styles.questPencil}> ✎</Text>
          </Text>
        </View>
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
  const { byStatus, entries: libraryEntries } = useLibrary();
  const { durationOf, learnDurations, count: correctionCount } = useDurations();
  const [editing, setEditing] = useState<Game | null>(null);

  const [pace, setPace] = usePersistedState('sidequest.plan.pace', 6);
  const [windowWeeks, setWindowWeeks] = usePersistedState<number | null>(
    'sidequest.plan.window',
    null
  );
  // The session the plan opens on knows what day it is: a Saturday is
  // not a Tuesday, and answering ninety minutes on both is answering the
  // wrong question two days in seven. Captured once, after hydration.
  const hydrated = useHydrated();
  const [weekendSession] = useState(() => sessionMinutesFor());
  const [session, setSession] = useState(60);
  const sessionMinutes = hydrated && session === 60 ? weekendSession : session;
  const [steamOpen, setSteamOpen] = useState(false);
  const toast = useToast();

  // Playing games count at half their length - you're partway in.
  const entries: Entry[] = useMemo(
    () => [
      ...byStatus('playing').map((e) => {
        const duration = durationOf(e.game);
        return {
          game: e.game,
          hours: remainingHours(duration.hours, {
            hoursPlayed: e.hoursPlayed,
            playing: true,
          }),
          totalHours: duration.hours,
          played: e.hoursPlayed,
          playing: true,
          rough: duration.rough,
          must: (e.want ?? 2) >= 3,
          deadline: e.deadline,
          source: duration.source,
        };
      }),
      ...byStatus('wishlist').map((e) => {
        const duration = durationOf(e.game);
        return {
          game: e.game,
          hours: remainingHours(duration.hours, {
            hoursPlayed: e.hoursPlayed,
          }),
          totalHours: duration.hours,
          played: e.hoursPlayed,
          playing: false,
          rough: duration.rough,
          must: (e.want ?? 2) >= 3,
          deadline: e.deadline,
          source: duration.source,
        };
      }),
    ],
    [byStatus, durationOf]
  );

  // Ask what people actually reported for these, once per screen. The
  // answers replace RAWG's average everywhere in the app, not just here.
  useEffect(() => {
    learnDurations(entries.map((entry) => entry.game.slug));
  }, [entries, learnDurations]);

  const gamesById = useMemo(
    () => new Map(entries.map((e) => [e.game.id, e.game])),
    [entries]
  );
  const entriesById = useMemo(
    () => new Map(entries.map((e) => [e.game.id, e])),
    [entries]
  );

  // Captured once per visit: a stable "now" keeps render pure and the
  // projected dates steady while you fiddle with the controls.
  const [now] = useState(() => Date.now());

  const schedule = useMemo(() => {
    const items: PlanItem[] = entries
      .filter((e) => e.hours > 0)
      .map((e) => ({
        id: e.game.id,
        name: e.game.name,
        hours: e.hours,
        want: e.must ? 3 : 2,
        deadline: e.deadline,
      }));
    return planSchedule(items, {
      hoursPerWeek: pace,
      now,
      deadline: windowWeeks != null ? now + windowWeeks * WEEK_MS : undefined,
    });
  }, [entries, pace, windowWeeks, now]);

  const unknown = entries.filter((e) => e.hours <= 0);

  // What the app would have told you, if it could tell you anything —
  // worked out on open rather than pushed. See components/Alerts.
  const alerts = useMemo(
    () =>
      buildAlerts(
        Object.values(libraryEntries),
        (entry) => durationOf(entry.game).hours,
        pace,
        now
      ),
    [libraryEntries, durationOf, pace, now]
  );

  const tonight = useMemo(
    () =>
      pickTonight(
        entries.map((e) => ({
          id: e.game.id,
          name: e.game.name,
          hours: e.hours,
          playing: e.playing,
        })),
        sessionMinutes
      ),
    [entries, sessionMinutes]
  );

  const tonightPick =
    tonight.finishable ?? tonight.continueGame ?? tonight.shortest;
  const tonightVerb = tonight.finishable
    ? 'Finish'
    : tonight.continueGame
      ? 'Continue'
      : 'Start';

  const maxRouteHours = Math.max(
    1,
    ...schedule.scheduled.map((item) => item.hours)
  );

  const empty = entries.length === 0;
  const allFit = schedule.dropped.length === 0 && schedule.scheduled.length > 0;
  const lastFinish =
    schedule.scheduled[schedule.scheduled.length - 1]?.finishAt;

  return (
    <Textured style={styles.background}>
      <PageTitle>The Plan — Sidequest</PageTitle>
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
              isExpanded && styles.innerWide,
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
              <View style={isExpanded ? styles.columns : styles.stack}>
                <View style={isExpanded ? styles.colLeft : styles.stack}>
                  <Alerts alerts={alerts} />

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
                    {schedule.scheduled.length > 0 && lastFinish ? (
                      <View style={styles.verdictStats}>
                        <View style={styles.vStat}>
                          <Text style={styles.vStatValue}>
                            {schedule.scheduled.length}
                            <Text style={styles.vStatDim}>
                              /{entries.length}
                            </Text>
                          </Text>
                          <Text style={styles.vStatLabel}>games fit</Text>
                        </View>
                        <View style={styles.vStat}>
                          <Text style={styles.vStatValue}>
                            ~{Math.round(schedule.totalHours)}h
                          </Text>
                          <Text style={styles.vStatLabel}>of play</Text>
                        </View>
                        <View style={styles.vStat}>
                          <Text style={styles.vStatValue}>
                            {finishDate(lastFinish)}
                          </Text>
                          <Text style={styles.vStatLabel}>last credits</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.verdictDetail}>
                        Give it more time or a wider window — or let a few of
                        these go. That’s allowed.
                      </Text>
                    )}

                    {schedule.costOfPins > 0 && (
                      <Text style={styles.pinCost}>
                        Keeping what you marked must-play costs you{' '}
                        {schedule.costOfPins} other{' '}
                        {schedule.costOfPins === 1 ? 'game' : 'games'} in this
                        window. Worth it, probably.
                      </Text>
                    )}

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

                    {schedule.scheduled.length > 0 && (
                      <Text
                        style={styles.steamLink}
                        accessibilityRole="button"
                        accessibilityLabel="Copy a link to this plan"
                        suppressHighlighting
                        onPress={async () => {
                          // The plan travels in the link: no account, no
                          // server, no copy of anyone's library anywhere.
                          // Native has no location at all, so the
                          // link degrades to a path rather than throwing.
                          const origin = globalThis.location?.origin ?? '';
                          const link = `${origin}/shared?p=${encodePlan({
                            pace,
                            games: schedule.scheduled.map((item) => ({
                              name: item.name,
                              hours: item.hours,
                            })),
                          })}`;
                          try {
                            await navigator.clipboard?.writeText(link);
                            toast('Plan link copied', 'link');
                          } catch {
                            toast(
                              'Copy failed — your browser blocked clipboard access',
                              'alert-circle'
                            );
                          }
                        }}
                      >
                        Share this plan →
                      </Text>
                    )}

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
                      onImport={() => router.push('/import')}
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
                              sessionMinutes >= 60
                                ? `${sessionMinutes / 60}h`
                                : `${sessionMinutes}m`
                            }
                            hint="Session length"
                            onPress={() =>
                              setSession(cycle(SESSION_OPTIONS, sessionMinutes))
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
                        uri={gamesById.get(tonightPick.id)?.background_image}
                        style={styles.tonightThumb}
                        size="thumb"
                        iconSize={20}
                      />
                    </Pressable>
                  )}
                </View>

                <View style={isExpanded ? styles.colRight : styles.stack}>
                  {/* the route */}
                  {schedule.scheduled.length > 0 && (
                    <View style={styles.section}>
                      <SectionHeader
                        title="This week"
                        eyebrow="THE NEXT SEVEN EVENINGS"
                      />
                      <WeekView scheduled={schedule.scheduled} now={now} />
                    </View>
                  )}

                  {schedule.scheduled.length > 0 && (
                    <View style={styles.section}>
                      <SectionHeader title="Your route" />
                      <Text style={styles.routeNote}>
                        Quick wins first — momentum is the strategy.
                        {correctionCount > 0
                          ? `  ${correctionCount} ${
                              correctionCount === 1
                                ? 'length is'
                                : 'lengths are'
                            } yours, and the plan trusts those over the estimates.`
                          : '  Tap any length to correct it.'}
                      </Text>
                      <View>
                        {schedule.scheduled.map((item, index) => (
                          <QuestRow
                            key={item.id}
                            item={item}
                            index={index}
                            isLast={index === schedule.scheduled.length - 1}
                            maxHours={maxRouteHours}
                            game={gamesById.get(item.id)}
                            entry={entriesById.get(item.id)}
                            onPress={() => router.push(`/game/${item.id}`)}
                            onEditLength={() => {
                              const target = gamesById.get(item.id);
                              if (target) setEditing(target);
                            }}
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
                              size="thumb"
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
                        Nobody has reported how long these take. Tell the plan
                        and it can place them.
                      </Text>
                      <View style={styles.rows}>
                        {unknown.map((entry) => (
                          <Pressable
                            key={entry.game.id}
                            style={styles.row}
                            onPress={() => setEditing(entry.game)}
                          >
                            <CoverImage
                              uri={entry.game.background_image}
                              style={styles.rowThumb}
                              size="thumb"
                              iconSize={16}
                            />
                            <View style={styles.rowBody}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {entry.game.name}
                              </Text>
                              <Text style={styles.rowAction}>
                                Set how long it takes →
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </FadeInView>
      </View>
      <DurationSheet
        game={editing}
        duration={editing ? durationOf(editing) : null}
        onClose={() => setEditing(null)}
      />
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
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  innerWide: { maxWidth: 1120, paddingHorizontal: SPACING.xl },
  stack: { gap: SPACING.lg },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xl * 1.5,
  },
  colLeft: { width: 400, gap: SPACING.lg },
  colRight: { flex: 1, gap: SPACING.lg },
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
    backgroundColor: COLORS.accent,
  },
  verdictTitle: {
    ...TYPE.h2,
    color: COLORS.white,
  },
  verdictStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xl,
    marginTop: 2,
  },
  vStat: { gap: 2, alignItems: 'flex-start' },
  vStatValue: {
    ...TYPE.h3,
    color: COLORS.white,
  },
  vStatDim: { color: COLORS.mediumGrey, fontSize: 14 },
  vStatLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  routeNote: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  verdictDetail: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
  },
  pinCost: {
    ...TYPE.caption,
    color: COLORS.accent,
  },
  sentence: {
    ...TYPE.body,
    color: COLORS.lightGrey,
  },
  inlineValue: {
    ...TYPE.h3,
    color: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  inlineCaret: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
  steamLink: {
    ...TYPE.labelTiny,
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
    ...TYPE.p,
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
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
  rowMeta: {
    ...TYPE.caption,
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
    ...TYPE.h4,
    color: COLORS.white,
  },
  questThumb: { width: 64, height: 40, borderRadius: 6 },
  questBody: { flex: 1, gap: 1 },
  questTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  questTitle: {
    ...TYPE.label,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
  questMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 3,
  },
  questBarTrack: {
    flex: 1,
    maxWidth: 160,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  questBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  questMeta: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  questMetaYours: { color: COLORS.lightGrey, fontFamily: 'Noah-Bold' },
  questPencil: { fontSize: 10, color: COLORS.mediumGrey },
  rowAction: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
  questWhen: { alignItems: 'flex-end', gap: 1 },
  questDate: {
    ...TYPE.h4,
    color: COLORS.lightGrey,
  },
  questDateLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  droppedNote: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
  },
});

/**
 * expo-router renders this instead of the route when its render throws,
 * so one bad screen degrades locally rather than blanking the app.
 */
export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
