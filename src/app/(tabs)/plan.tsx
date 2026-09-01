import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';

import type { Game } from '@/api/types';
import { Alerts } from '@/components/Alerts';
import { RouteError } from '@/components/RouteError';
import { BackButton } from '@/components/BackButton';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { DesktopShell } from '@/components/DesktopShell';
import { SiteFooter } from '@/components/SiteFooter';
import { Message } from '@/components/Message';
import { Mark } from '@/components/Mark';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Segmented, type SegmentedOption } from '@/components/Segmented';
import { SteamConnect } from '@/components/SteamConnect';
import { WeekView } from '@/components/WeekView';
import { HorizonStrip } from '@/components/HorizonStrip';
import { Textured } from '@/components/Textured';
import { usePersistedState } from '@/hooks/usePersistedState';
import { DurationSheet } from '@/components/DurationSheet';
import { formatHours, type DurationSource } from '@/lib/duration';
import { useToast } from '@/components/Toast';
import { useDurations } from '@/lib/durations';
import { buildAlerts } from '@/lib/alerts';
import { planColour } from '@/lib/planColours';
import { CAN_COPY, handOff } from '@/lib/clipboard';
import { SITE_ORIGIN } from '@/constants/site';
import { useHydrated } from '@/hooks/useHydrated';
import { encodePlan } from '@/lib/planLink';
import { useLibrary } from '@/lib/library';
import { readSessions, sessionMinutesFor } from '@/lib/sessions';
import { measuredPace, worthSaying } from '@/lib/measuredPace';
import { hoursLeft, planItems } from '@/lib/planning';
import { pickTonight, planSchedule, type ScheduledItem } from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How much of the route the month card draws.
 *
 * A 500-game library scheduled with no window put four hundred and
 * twenty-nine numbered rows under a heading that says "This month",
 * which is neither a month nor a plan — it is the library again, sorted
 * differently, and the library is one tap away and better at it.
 *
 * Twelve is past what anyone can hold in their head and comfortably
 * past a real month at any sane pace, so nobody with an ordinary
 * backlog ever meets this. Past it, the page stops pretending to be a
 * list and says how many more there are.
 */
const ROUTE_SHOWN = 12;

/**
 * The plan's two dials, and the evening's one.
 *
 * These used to live inside the sentence that described them, one tap
 * advancing to the next value. See components/Segmented for why that
 * had to go: six options behind a single blind control is a slot
 * machine, not a setting.
 */
const PACE_OPTIONS: SegmentedOption<number>[] = [2, 4, 6, 8, 12, 20].map(
  (hours) => ({ value: hours, label: `${hours}h` })
);
const WINDOW_OPTIONS: SegmentedOption<number | null>[] = [
  { label: 'whenever', value: null },
  { label: '2 weeks', value: 2 },
  { label: 'a month', value: 4.35 },
  { label: '3 months', value: 13 },
];
const SESSION_OPTIONS: SegmentedOption<number>[] = [
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1½h' },
  // 2h earns its chip because Sunday's day-aware default IS 120: without
  // it the control opened with nothing highlighted one day in seven.
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
];

const finishDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

interface Entry {
  game: Game;
  /** Hours left, not hours long — see lib/planning hoursLeft. */
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

/**
 * One stop on the route.
 *
 * The bar that used to sit here measured this game against the longest
 * one in the plan — a comparison nobody asked for, unlabelled, and easy
 * to read as progress through the game itself. In its place: the colour
 * this game wears in the week above, so the block on Tuesday and this
 * row are visibly the same thing.
 */
function QuestRow({
  item,
  index,
  isLast,
  game,
  entry,
  onPress,
  onEditLength,
}: {
  item: ScheduledItem;
  index: number;
  isLast: boolean;
  game?: Game;
  entry?: Entry;
  onPress: () => void;
  onEditLength: () => void;
}) {
  const colour = planColour(index);
  return (
    <Pressable
      style={[styles.quest, isLast && styles.questLast]}
      onPress={onPress}
    >
      {/* the path: a node per game, a thread connecting them */}
      <View style={styles.questRail}>
        {index > 0 && <View style={styles.questThreadTop} />}
        {!isLast && <View style={styles.questThreadBottom} />}
        <View style={[styles.questNode, { borderColor: colour }]}>
          <Text style={[styles.questNodeText, { color: colour }]}>
            {index + 1}
          </Text>
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
          {entry?.source === 'yours' || entry?.source === 'reported' ? '' : '~'}
          {formatHours(item.hours)}
          {entry?.played != null && entry.totalHours > 0
            ? ` left of ${formatHours(entry.totalHours)}`
            : ' left'}
          {entry?.rough ? ' ?' : ''}
          <Text style={styles.questPencil}> ✎</Text>
        </Text>
      </View>
      <View style={styles.questWhen}>
        <Text style={styles.questDate}>{finishDate(item.finishAt)}</Text>
        {/* "on track", not "done by": this date is the plan's
            projection of when the credits roll, and "done by" is
            deadline language — an obligation this app promised never
            to invent. Deadlines the person set themselves are a
            different thing, and they live on the alerts. */}
        <Text style={styles.questDateLabel}>on track</Text>
      </View>
    </Pressable>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const topPad = useTopPad(false);

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
  // null = no explicit choice; the day-aware default fills in. The
  // sentinel used to be 60 — a value that is also a chip — so tapping
  // "1h" on a Friday read as "no choice" and snapped straight back to
  // three hours. A choice must be distinguishable from its absence.
  const [session, setSession] = useState<number | null>(null);
  const sessionMinutes = session ?? (hydrated ? weekendSession : 60);
  const [steamOpen, setSteamOpen] = useState(false);
  const toast = useToast();

  // Playing games count at half their length - you're partway in.
  const entries: Entry[] = useMemo(
    () => [
      ...byStatus('playing').map((e) => {
        const duration = durationOf(e.game);
        return {
          game: e.game,
          hours: hoursLeft(e, () => duration.hours),
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
          hours: hoursLeft(e, () => duration.hours),
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
    learnDurations(entries.map((entry) => entry.game));
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

  const schedule = useMemo(
    () =>
      /*
       * Built from the library through `planItems`, not from the
       * enriched list above — because the widgets build it the same
       * way, and the two have to agree. Order is a silent input:
       * `planSchedule` sorts by deadline then length and the sort is
       * stable, so two games matching on both are separated by
       * arrival order alone. See lib/planning.
       */
      planSchedule(
        planItems(
          Object.values(libraryEntries),
          (entry) => durationOf(entry.game).hours
        ),
        {
          hoursPerWeek: pace,
          now,
          deadline:
            windowWeeks != null ? now + windowWeeks * WEEK_MS : undefined,
        }
      ),
    [libraryEntries, durationOf, pace, windowWeeks, now]
  );

  /**
   * The plan travels in the link: no account, no server, no copy of
   * anyone's library anywhere. Native has no document to read an origin
   * from, so it names the site instead — a link is only worth copying
   * if the person you send it to can open it.
   */
  const sharePlan = async () => {
    const origin = globalThis.location?.origin ?? SITE_ORIGIN;
    const link = `${origin}/shared?p=${encodePlan({
      pace,
      games: schedule.scheduled.map((item) => ({
        name: item.name,
        hours: item.hours,
      })),
    })}`;
    const done = await handOff(link);
    toast(
      done
        ? CAN_COPY
          ? 'Plan link copied'
          : 'Plan link sent'
        : 'Nothing left the app — try again',
      done ? 'link' : 'alert-circle'
    );
  };
  const canShare = schedule.scheduled.length > 0;

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
  /**
   * What the "doesn't fit" section will hold, counted here so the
   * header can be honest about it. A game can miss its own date AND
   * overflow the window; it gets one row, which is the whole point of
   * merging the two old sections — it used to get two.
   */
  const atRiskIds = new Set(
    alerts.filter((a) => a.kind === 'at-risk').map((a) => a.gameId)
  );
  const misfitCount =
    atRiskIds.size +
    schedule.dropped.filter((item) => !atRiskIds.has(item.id)).length;
  /**
   * The dates the month view draws as coral weather: deadlines the
   * plan cannot meet, on the day they name. The month shows the
   * geometry of the problem; the sentences and the ways out stay in
   * "What doesn't fit".
   */
  const troubled = entries
    .filter((e) => atRiskIds.has(e.game.id) && e.deadline != null)
    .map((e) => ({ id: e.game.id, name: e.game.name, deadline: e.deadline! }));

  /**
   * What already landed — the credits that rolled recently.
   *
   * The strip filters and caps these itself, so the plan page and the
   * widget cannot disagree about how much past a month carries. All
   * this has to do is offer everything finished, with its date.
   */
  const landed = useMemo(
    () =>
      Object.values(libraryEntries)
        .filter((entry) => entry.status === 'finished' && entry.finishedAt)
        .map((entry) => ({
          id: entry.game.id,
          name: entry.game.name,
          finishedAt: entry.finishedAt as number,
        })),
    [libraryEntries]
  );

  /**
   * The route, and how much of it the card draws. See ROUTE_SHOWN: a
   * heading that says "This month" may not be followed by four hundred
   * rows spanning a decade.
   */
  const routeShown = schedule.scheduled.slice(0, ROUTE_SHOWN);
  const routeRest = schedule.scheduled.length - routeShown.length;

  /**
   * What the app has actually watched, against what it was told.
   *
   * The session clock has been recording real evenings all along and
   * only the Memcard ever looked, while every date on this page rests
   * on a number somebody picked in ten seconds during onboarding. Read
   * once per visit, like `now`, so the page holds still.
   *
   * Offered, never applied: it counts logged sessions and nobody logs
   * every evening, so it is a floor rather than a measurement. See
   * lib/measuredPace.
   */
  const [measured] = useState(() => measuredPace(readSessions()));
  const paceNews =
    measured && worthSaying(pace, measured.hoursPerWeek) ? measured : null;

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

  const empty = entries.length === 0;
  const allFit = schedule.dropped.length === 0 && schedule.scheduled.length > 0;
  const lastFinish =
    schedule.scheduled[schedule.scheduled.length - 1]?.finishAt;

  /**
   * The verdict, said twice and in two registers.
   *
   * It used to be a bordered card at the top holding three statistics —
   * "2/2 games fit", "~9h of play", "Aug 31 last credits" — every one of
   * which was repeated further down the page by the week or the route.
   * A verdict is one fact: whether this works. Up top it is the page's
   * eyebrow, costing no height at all; beside the dials that produce it
   * it is a sentence, so changing a dial visibly changes the answer.
   */
  const fits = schedule.scheduled.length;
  /**
   * The window's own name, for a verdict that can point at its cause.
   */
  /**
   * Guarded on the window existing, not merely on finding a label:
   * "whenever" IS one of the options and its value is null, so a plan
   * with no window at all matched it and produced "whenever holds 5 of
   * them". Games can still be dropped without a global window — a
   * deadline somebody set on one game does it — so that branch is
   * reachable, and it has no window to blame.
   */
  const windowLabel =
    windowWeeks != null
      ? WINDOW_OPTIONS.find((option) => option.value === windowWeeks)?.label
      : undefined;

  /**
   * "N of these M" counts the failures, and it scales horribly.
   *
   * At four games "3 of these 4 will get done" is encouragement. At
   * five hundred it reads "5 of these 500 will get done" — an
   * indictment of somebody's entire shelf, in the largest sentence on
   * the page, opening a screen whose whole doctrine is relief. The
   * arithmetic was right and the framing put 495 failures in front of
   * a reader who had done nothing wrong.
   *
   * Where a window is what excluded them, the window is what the
   * sentence names. "2 weeks holds 5 of them" is the same fact told as
   * a property of the dial they just moved rather than a property of
   * them — and it answers the question that dial otherwise raises
   * silently, which is why one chip changed the whole page.
   */
  const verdictSentence =
    fits === 0
      ? 'Nothing fits. Give it more time or a wider window — or let a few of these go. That’s allowed.'
      : allFit && lastFinish
        ? fits === 1
          ? `You can finish it by ${finishDate(lastFinish)}.`
          : `You can finish ${fits === 2 ? 'both' : `all ${fits}`}, the last by ${finishDate(lastFinish)}.`
        : windowLabel && lastFinish
          ? `${windowLabel} holds ${fits} of them, the last by ${finishDate(lastFinish)}.`
          : lastFinish
            ? `${fits} of these ${entries.length} will get done, the last by ${finishDate(lastFinish)}.`
            : `${fits} of these ${entries.length} will get done.`;

  /**
   * A pace measured off Steam is a real number, not one of the six on
   * the dial, and a control with nothing selected looks broken. It
   * earns a seventh option, named for where it came from.
   */
  const paceOptions = PACE_OPTIONS.some((option) => option.value === pace)
    ? PACE_OPTIONS
    : [...PACE_OPTIONS, { value: pace, label: `${pace}h · Steam` }];

  /**
   * The desk's one shell. Home stands in the sidebar layout and so
   * does this page now; a top bar of text links over a centred column
   * made walking from Home to here feel like leaving for another site.
   */
  const page = (
    <>
      <PageTitle>The Plan — Sidequest</PageTitle>
      {/* Wide gets the header; compact WEB gets a back button; compact
          native gets neither, because it has the tab bar.
          This screen is a tab root now. A back chevron on a tab root is
          a control with nowhere to go — `BackButton` falls back to
          replacing the route with home when there is no history, so
          tapping it would silently throw you onto Home from a tab you
          had deliberately opened. iOS tab roots never carry one. Web
          keeps the brand lockup in this corner - the same anchor the
          game page has - now that a phone on the web has the tab bar
          for getting between the three roots. */}
      {isExpanded ? null : Platform.OS === 'web' ? (
        <>
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton />
          </View>
          {/* You, in the chrome row where every page keeps it - the same
              height as the lockup on the left and as the icon on Home.
              It used to sit a hundred points lower, in the section
              header's eyebrow row, which is where the page's title
              lives, not the app's identity. */}
          <Pressable
            onPress={() => router.push('/you')}
            style={[styles.youButton, { top: insets.top + SPACING.sm }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="You"
          >
            <Ionicons
              name="person-circle-outline"
              size={23}
              color={COLORS.lightGrey}
            />
          </Pressable>
        </>
      ) : (
        /* Native, compact: the wordmark row Home has, so the three tab
           roots open on the same chrome - the brand on the left, You on
           the right, at one height - instead of You appearing lower in
           the section header on two of them. */
        <View
          style={[styles.nativeChrome, { paddingTop: insets.top + SPACING.sm }]}
        >
          <View style={styles.nativeBrand}>
            <Mark size={20} />
            <Text style={styles.nativeWordmark}>SIDEQUEST</Text>
          </View>
          <Pressable
            onPress={() => router.push('/you')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="You"
          >
            <Ionicons
              name="person-circle-outline"
              size={23}
              color={COLORS.lightGrey}
            />
          </Pressable>
        </View>
      )}

      <Screen>
        <View style={{ paddingBottom: SPACING.xl * 1.5 }}>
          <FadeInView>
            <View
              style={[
                styles.inner,
                isExpanded && styles.innerWide,
                isExpanded && styles.innerDesk,
                {
                  paddingTop: topPad,
                },
              ]}
            >
              {/* Share lives up here now.
                  It sat inside the card that carries the verdict and the
                  pace sentence — a card about what your plan IS and how
                  to change it. Sharing is an output, and it was the
                  second link stacked in there: two unrelated actions
                  dressed as a pair, which is the same shape the library
                  footer had. The Steam link stayed, because it sits
                  directly under "I play about 8h a week" and offers to
                  measure exactly that. */}
              <SectionHeader
                title="The Plan"
                // The chrome row carries You on a compact web page; the
                // eyebrow row keeps it only where there is no chrome row -
                // native tab roots, and the desk.
                onAccount={undefined}
                actionLabel={canShare ? 'Share →' : undefined}
                actionAccessibilityLabel="Copy a link to this plan"
                onAction={canShare ? sharePlan : undefined}
              />
              {/* The verdict, in words, before anything else.
                  It was the eyebrow — "3 OF 5 FIT" — which reads as
                  nothing until you have already understood the page,
                  and the sentence that explains it sat at the very
                  bottom inside the pace card. The page's one thesis
                  was its last line. It is the first now; the copy by
                  the dials stays, because there it is live feedback —
                  the same verdict in two registers, on purpose. */}
              {!empty && (
                <Text style={styles.standfirst}>{verdictSentence}</Text>
              )}

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
                    {/* 1 — TONIGHT.
                        The page opens on the question somebody actually
                        has at eight o'clock on a Tuesday. The comment
                        above this card has said so from the start —
                        and then the alerts were mounted on top of it,
                        so the first thing a reader met was two
                        warnings about games they saved. The answer
                        leads; what needs deciding follows it. */}
                    {tonightPick && (
                      <Pressable
                        style={styles.tonight}
                        onPress={() => router.push(`/game/${tonightPick.id}`)}
                      >
                        {/* The picture, not a stamp of one. This card is
                            the answer the page exists to give. */}
                        <CoverImage
                          uri={gamesById.get(tonightPick.id)?.background_image}
                          style={StyleSheet.absoluteFill}
                          size="hero"
                          iconSize={32}
                        />
                        <LinearGradient
                          colors={[
                            'rgba(39,47,63,0.15)',
                            'rgba(39,47,63,0.72)',
                            'rgba(39,47,63,0.95)',
                          ]}
                          locations={[0, 0.55, 1]}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                        <View style={styles.tonightBody}>
                          <View style={styles.tonightHead}>
                            <Ionicons
                              name="moon"
                              size={13}
                              color={COLORS.violet}
                            />
                            <Text style={styles.tonightEyebrow}>TONIGHT</Text>
                          </View>
                          <Text style={styles.tonightTitle} numberOfLines={2}>
                            {tonightVerb} {tonightPick.name}
                          </Text>
                          <Text style={styles.tonightWhy}>
                            {tonight.finishable
                              ? 'You can see the credits tonight.'
                              : tonight.continueGame
                                ? 'Chip away at it — progress counts.'
                                : 'The shortest thing you’ve saved.'}
                          </Text>

                          {/* Inside the card, not under it.
                              This is the one control on the page that
                              belongs to tonight rather than to the
                              plan, and floating loose between the card
                              and the week it made three objects out of
                              two. On the artwork it takes a plate of
                              its own — see Segmented's onImage. */}
                          <View
                            style={styles.tonightControl}
                            // The card navigates; the control does not.
                            onStartShouldSetResponder={() => true}
                          >
                            <Segmented
                              label="I have"
                              options={SESSION_OPTIONS}
                              value={sessionMinutes}
                              onChange={setSession}
                              onImage
                            />
                          </View>
                        </View>
                      </Pressable>
                    )}

                    {/* 2 — WHAT DOESN'T FIT.
                        One calm section where there used to be two loud
                        ones: unnamed warning cards floating at the top
                        of the page, and a "Side quests" list far below
                        repeating the same games. One fact, one place,
                        one row per game, each with its ways out. After
                        Tonight, because the answer leads and the
                        exceptions follow it. */}
                    {misfitCount > 0 && (
                      <View style={styles.section}>
                        <SectionHeader
                          title="What doesn’t fit"
                          eyebrow={`${misfitCount} ${
                            misfitCount === 1 ? 'game' : 'games'
                          } — and that’s allowed`}
                        />
                        <Alerts
                          alerts={alerts}
                          overflow={schedule.dropped}
                          gamesById={gamesById}
                        />
                      </View>
                    )}
                  </View>

                  <View style={isExpanded ? styles.colRight : styles.stack}>
                    {/* 3 — THIS WEEK.
                        The plan at the scale a person lives at: one
                        row per evening, with its real date, what it
                        goes on and for how long — free evenings drawn
                        as free, because a night given back has to look
                        given back. The agenda answers "what am I doing
                        Thursday?" literally, which is the question a
                        week view exists for. */}
                    {schedule.scheduled.length > 0 && (
                      <View style={styles.section}>
                        <SectionHeader
                          title="This week"
                          eyebrow="Your evenings — the free ones count"
                        />
                        <WeekView
                          scheduled={schedule.scheduled}
                          now={now}
                          leadId={tonightPick?.id}
                        />
                      </View>
                    )}

                    {/* 4 — THIS MONTH.
                        The same schedule at the scale of the horizon:
                        a timeline, never a 30-box grid, because the
                        month's only facts are when the credits land
                        and whether everything fits — and 26 empty
                        boxes would bury both under obligation. The
                        strip is the picture; the route beneath it is
                        the sentences, one per game, shortest first. */}
                    {schedule.scheduled.length > 0 && (
                      <View style={styles.section}>
                        <SectionHeader
                          title="This month"
                          eyebrow={
                            landed.length > 0
                              ? 'Where the credits land — and where they landed'
                              : 'Where the credits land'
                          }
                        />
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
                        <View style={styles.monthCard}>
                          <HorizonStrip
                            scheduled={schedule.scheduled}
                            now={now}
                            troubled={troubled}
                            landed={landed}
                          />
                          <View style={styles.monthRule} />
                          <View>
                            {routeShown.map((item, index) => (
                              <QuestRow
                                key={item.id}
                                item={item}
                                index={index}
                                isLast={index === routeShown.length - 1}
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
                          {routeRest > 0 && (
                            <Text
                              style={styles.routeRest}
                              onPress={() => router.push('/library')}
                              suppressHighlighting
                              accessibilityRole="link"
                              accessibilityLabel={`${routeRest} more games in your plan — open your library`}
                            >
                              + {routeRest} more after these, shortest first.{' '}
                              <Text style={styles.routeRestLink}>
                                See them all in your library →
                              </Text>
                            </Text>
                          )}
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

                    {/* 5 — THE DIAL, and the verdict it produces.
                        Last, because it is the least-touched thing on
                        the page and the most consequential: everything
                        above is what these two numbers decided. Putting
                        the answer next to the controls is the whole
                        point — move a dial and watch the sentence
                        change. */}
                    <View style={styles.section}>
                      <SectionHeader
                        title="Your pace"
                        eyebrow="The two numbers behind all of this"
                      />
                      <View style={styles.dial}>
                        <Segmented
                          label="Hours a week"
                          options={paceOptions}
                          value={pace}
                          onChange={setPace}
                        />
                        <Segmented
                          label="Finish them"
                          options={WINDOW_OPTIONS}
                          value={windowWeeks}
                          onChange={setWindowWeeks}
                        />
                        <View style={styles.dialResult}>
                          <Text style={styles.dialVerdict}>
                            {verdictSentence}
                          </Text>
                          {/* Between the verdict and the price of
                              pins, because it is about whether the
                              verdict can be believed. Never a telling
                              off: a plan built on an optimistic pace
                              promises what the week cannot keep, and
                              missing your own plan every week is a far
                              worse thing to feel than reading one
                              honest sentence about it. */}
                          {paceNews && (
                            <View style={styles.paceNews}>
                              <Text style={styles.paceNewsText}>
                                Your timed evenings come to at least{' '}
                                {formatHours(paceNews.hoursPerWeek)} a week.
                                This plan assumes {pace}h, so it is holding back
                                games you have room for.
                              </Text>
                              <Text
                                style={styles.paceNewsAction}
                                onPress={() =>
                                  setPace(
                                    Math.max(
                                      1,
                                      Math.round(paceNews.hoursPerWeek)
                                    )
                                  )
                                }
                                suppressHighlighting
                                accessibilityRole="button"
                                accessibilityLabel={`Use ${Math.round(paceNews.hoursPerWeek)} hours a week`}
                              >
                                Use {Math.round(paceNews.hoursPerWeek)}h a week
                                →
                              </Text>
                              <Text style={styles.paceNewsCaveat}>
                                Counts only the evenings you timed, across{' '}
                                {paceNews.sessions} of them.
                              </Text>
                            </View>
                          )}

                          {schedule.costOfPins > 0 && (
                            <Text style={styles.pinCost}>
                              Keeping what you marked must-play costs you{' '}
                              {schedule.costOfPins} other{' '}
                              {schedule.costOfPins === 1 ? 'game' : 'games'} in
                              this window. Worth it, probably.
                            </Text>
                          )}
                        </View>
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
                    </View>
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
      </Screen>
    </>
  );
  return isExpanded ? (
    <DesktopShell activeKey="plan">{page}</DesktopShell>
  ) : (
    <Textured style={styles.background}>{page}</Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  nativeChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    height: 40 + SPACING.sm,
  },
  nativeBrand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nativeWordmark: { ...TYPE.h1, color: COLORS.lightGrey },
  innerDesk: { paddingHorizontal: 0 },
  youButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 30,
    height: 40,
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    /**
     * Sections need room to read as sections.
     *
     * At twenty points every block on this page was the same distance
     * from the next as a heading is from its own body, so the page had
     * no groups in it — just a column of things. Thirty-two between
     * blocks against ten inside one is the difference between a list
     * and a structure.
     */
    gap: SPACING.xl,
  },
  innerWide: { maxWidth: 1120, paddingHorizontal: SPACING.xl },
  stack: { gap: SPACING.xl },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xl * 1.5,
  },
  /**
   * The rail, pinned once there is room for one.
   *
   * The two columns were designed at a width where both carried
   * weight; measured at 1280 the left one runs 434px against the
   * right's 1278, so two thirds of it is empty and a reader scrolls
   * fifteen hundred pixels past a blank half-page.
   *
   * Pinning it rather than moving a block into it, because the order
   * these appear in is the same list on a phone — colLeft's children
   * render before colRight's when the columns collapse — and the
   * mobile order is deliberate: tonight, the week, the route, the
   * dials, most-used first. Reordering to balance a desktop column
   * would rewrite the page everyone actually reads on.
   *
   * So the empty space becomes the point. Tonight's answer stays on
   * screen while the week and the month scroll past it, which is the
   * one thing on this page worth keeping in view.
   */
  colLeft: {
    /*
     * Proportional, with a ceiling — the same fault the game page had.
     * Pinned at 400 whatever the window did, the rail took 39% of the
     * content at a wide desktop and 44% at 1024, where the main column
     * shrank to 512 and the two read as a pair rather than a rail and
     * a column. 39/61 holds the relationship at every width; the
     * ceiling stops a wide monitor stretching a card that has one
     * evening in it.
     */
    flex: 39,
    maxWidth: 400,
    minWidth: 0,
    gap: SPACING.xl,
    ...(Platform.OS === 'web'
      ? {
          // Not in RN's type surface; the same cast the app already
          // makes in `import`, `tidy` and `ScrollStage`.
          position: 'sticky' as unknown as 'absolute',
          // Clear of the header bar that is itself pinned up there.
          top: 96 + SPACING.xl,
        }
      : null),
  },
  colRight: { flex: 61, minWidth: 0, gap: SPACING.xl },
  routeNote: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  /**
   * The month card: the horizon strip on top, the route beneath it —
   * the picture, then its sentences, on the same plane the week uses.
   */
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
  /** The line that replaces four hundred rows — see ROUTE_SHOWN. */
  routeRest: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  routeRestLink: { color: COLORS.accent },

  /**
   * The dial, and the sentence it produces.
   *
   * A panel rather than loose controls, because these two are the only
   * things on the page that CHANGE the plan — everything above them
   * reports it. Keeping the verdict inside the same box is the point:
   * move a segment, watch the sentence rewrite itself.
   *
   * `raised`, not `surface`. Surface is a step DOWN from the page's
   * navy, so a card drawn on it reads as a hole rather than as a card —
   * which is why the old verdict box looked recessed. Three per cent of
   * white and a shadow is what lifting looks like on this ground.
   */
  dial: {
    backgroundColor: COLORS.raised,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.lg,
    ...SHADOW.card,
  },
  dialResult: {
    gap: SPACING.xs,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  dialVerdict: {
    ...TYPE.h2,
    color: COLORS.white,
  },
  pinCost: {
    ...TYPE.caption,
    color: COLORS.accent,
  },
  /**
   * The one thing on this page that reports on the reader rather than
   * on their games, so it is kept quiet and factual — no warning
   * colour, no icon. It states two numbers and offers a tap.
   */
  paceNews: {
    gap: 3,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  paceNewsText: { ...TYPE.caption, color: COLORS.lightGrey },
  paceNewsAction: { ...TYPE.labelTiny, color: COLORS.accent },
  paceNewsCaveat: { ...TYPE.micro, color: COLORS.mediumGrey },
  steamLink: {
    ...TYPE.labelTiny,
    color: COLORS.mediumGrey,
  },

  tonight: {
    minHeight: 260,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.navy,
  },
  tonightBody: { gap: SPACING.xs + 2, padding: SPACING.lg },
  tonightControl: { marginTop: SPACING.md },
  tonightHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tonightEyebrow: {
    ...TYPE.tag,
    // The evening's colour, the same one the landing page uses for it.
    color: COLORS.violet,
  },
  /* Over artwork, so the copy carries its own contrast. */
  tonightWhy: {
    ...TYPE.p,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
  },
  /**
   * The verb and the game, at display size.
   *
   * This was a sentence with the session length embedded in it — "I
   * have [2h] → Start Oxenfree" — which made the answer the quiet half
   * of a line about a setting. The answer is "Start Oxenfree"; how long
   * you have is the control underneath it.
   */
  tonightTitle: {
    ...TYPE.title,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
  },

  standfirst: {
    ...TYPE.body,
    color: COLORS.mediumGrey,
    // Pulled up under the header it belongs to, and held to a measure
    // a sentence is comfortable at.
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    maxWidth: 520,
  },
  section: { gap: SPACING.sm + 2 },
  /**
   * The shared plane.
   *
   * Three of the four blocks on this page sit on one — the week, the
   * route and the dial — and the fourth is a photograph, which is
   * contrast enough. Consistent material is not monotony: what varies
   * between them is what is inside, and a page whose every block used a
   * different treatment would read as four pages.
   */
  panel: {
    padding: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    ...SHADOW.card,
  },
  rows: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.raised,
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
  /**
   * A stop, ruled off from the next one.
   *
   * The rail threads the nodes together, which says "these are in
   * order" and nothing about where one row ends. Without a rule the
   * list was four floating pairs of lines; with one it is a list.
   */
  quest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  questLast: { borderBottomWidth: 0 },
  questRail: {
    width: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    /**
     * Out through the row's padding, so the thread actually joins.
     *
     * `stretch` fills the content box, which stops sixteen points short
     * at each end — leaving a thirty-two point gap at every join and a
     * route that looked severed at exactly the places it claims to
     * connect.
     */
    marginVertical: -SPACING.md,
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
