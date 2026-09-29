import { useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';

import type { Game } from '@/api/types';
import { Alerts } from '@/components/Alerts';
import { RouteError } from '@/components/RouteError';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { CoverImage } from '@/components/CoverImage';
import { FadeInView } from '@/components/FadeInView';
import { DesktopShell } from '@/components/DesktopShell';
import { SiteFooter } from '@/components/SiteFooter';
import { Mark } from '@/components/Mark';
import { PageHeading } from '@/components/PageHeading';
import { PageTitle } from '@/components/PageTitle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Segmented, type SegmentedOption } from '@/components/Segmented';
import { SteamConnect } from '@/components/SteamConnect';
import { WeekView } from '@/components/WeekView';
import { HorizonStrip } from '@/components/HorizonStrip';
import { Textured } from '@/components/Textured';
import { IconButton, Touchable } from '@/components/Touchable';
import { usePersistedState } from '@/hooks/usePersistedState';
import { DurationSheet } from '@/components/DurationSheet';
import { formatHours, type DurationSource } from '@/lib/duration';
import { useToast } from '@/components/Toast';
import { artQuery } from '@/api/art';
import { prefetchGame, warmGame } from '@/api/gameDetail';
import { useDurations } from '@/lib/durations';
import { useSync } from '@/lib/sync/SyncProvider';
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
import { DURATION } from '@/styles/motion';
import {
  GUTTER,
  ICON,
  LAYOUT,
  MATERIAL,
  RADIUS,
  SPACING,
  TOUCH,
  innerRadius,
} from '@/styles/theme';
import { FONT_SCALE, OVER_IMAGE, TYPE, WORDMARK } from '@/styles/typography';

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
/**
 * The game's mark beside its row.
 *
 * A 64×40 strip cut from a screenshot identifies a game about as well
 * as a strip cut from a photograph identifies a person. The square
 * icon SteamGridDB holds for most games is the thing drawn to be
 * recognised at this size, so it takes the slot where there is one;
 * the strip stays for the rest, in the same box, so the rows keep
 * their edge either way.
 */
function RowMark({ game }: { game?: Game }) {
  const { data: art } = useQuery({
    ...artQuery(game ?? { name: '', released: null, slug: '' }),
    enabled: Boolean(game?.slug),
  });
  if (art?.icon) {
    return (
      <View style={styles.rowArt}>
        <Image
          source={{ uri: art.icon.url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={DURATION.base}
          accessible={false}
        />
      </View>
    );
  }
  return (
    <CoverImage
      uri={game?.background_image}
      style={styles.rowArt}
      size="thumb"
      iconSize={ICON.md}
    />
  );
}

/**
 * One stop on the route, in the Plan's one row: a 40pt square of art, a
 * title, one line of fact, a trailing slot.
 *
 * The row used to be one big button with the edit-length action nested
 * inside it as a pressable piece of text — which iOS folds into the
 * outer button, so VoiceOver could open the game and never reach the
 * correction. The row is a plain view now: the game opens from its own
 * labelled target, and the pencil beside it is a sibling that can be
 * found on its own.
 */
function QuestRow({
  item,
  index,
  isLast,
  game,
  entry,
  onPress,
  onPressIn,
  onEditLength,
}: {
  item: ScheduledItem;
  index: number;
  isLast: boolean;
  game?: Game;
  entry?: Entry;
  onPress: () => void;
  /** A finger landing: the moment to warm the page it opens. */
  onPressIn?: () => void;
  onEditLength: () => void;
}) {
  const colour = planColour(index);
  const yours = entry?.source === 'yours' || entry?.source === 'reported';
  const meta =
    (yours ? '' : '~') +
    formatHours(item.hours) +
    (entry?.played != null && entry.totalHours > 0
      ? ` left of ${formatHours(entry.totalHours)}`
      : ' left') +
    (entry?.rough ? ' ?' : '');
  /**
   * The projected credits land after a date the person set themselves.
   *
   * This row used to say "on track" under every date — twelve times on
   * a full route, which is the same as saying nothing. The date alone
   * is the projection; only a row that will miss its own date says
   * anything more, and it says it in the colour of letting go, since
   * that is one of its ways out.
   */
  const late = entry?.deadline != null && item.finishAt > entry.deadline;
  return (
    <View style={[styles.quest, isLast && styles.questLast]}>
      {/* the path: a node per game, a thread connecting them */}
      <View
        style={styles.questRail}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {index > 0 && <View style={styles.questThreadTop} />}
        {!isLast && <View style={styles.questThreadBottom} />}
        <View style={[styles.questNode, { borderColor: colour }]}>
          <Text
            style={[styles.questNodeText, { color: colour }]}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {index + 1}
          </Text>
        </View>
      </View>
      <Touchable
        style={styles.questOpen}
        onPress={onPress}
        onPressIn={onPressIn}
        accessibilityLabel={`Open ${item.name}, ${meta}, credits ${finishDate(
          item.finishAt
        )}${late ? ', after your date' : ''}`}
      >
        <RowMark game={game} />
        <View style={styles.rowBody}>
          <View style={styles.questTitleRow}>
            {entry?.must && (
              <Ionicons
                name="star"
                size={ICON.sm - 3}
                color={COLORS.violetText}
              />
            )}
            <Text
              style={styles.rowTitle}
              numberOfLines={1}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              {item.name}
            </Text>
          </View>
          <Text
            style={[styles.rowMetaLine, yours && styles.questMetaYours]}
            numberOfLines={1}
          >
            {meta}
          </Text>
        </View>
        <View style={styles.questWhen}>
          <Text
            style={styles.questDate}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {finishDate(item.finishAt)}
          </Text>
          {late ? <Text style={styles.questLate}>after your date</Text> : null}
        </View>
      </Touchable>
      <IconButton
        icon="pencil"
        size="sm"
        color={COLORS.mediumGrey}
        onPress={onEditLength}
        accessibilityLabel={`Change how long ${item.name} takes`}
        style={styles.questEdit}
      />
    </View>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const topPad = useTopPad(false);

  const { byStatus, entries: libraryEntries } = useLibrary();
  const { durationOf, learnDurations } = useDurations();
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
  /** The sheet holding both dials and the verdict they move. */
  const [dialsOpen, setDialsOpen] = useState(false);
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
  /**
   * Warm the page a row is about to open. The row's game is the seed
   * for the masthead; a row without one still gets its record early.
   */
  const queryClient = useQueryClient();
  const sync = useSync();
  const warm = (id: number) => {
    const known = gamesById.get(id);
    if (known) prefetchGame(queryClient, known);
    else warmGame(queryClient, id);
  };
  /**
   * Pull to refresh: a sync round when signed in, then everything on
   * screen asks again — the lengths, the box art, the series news.
   */
  const refresh = async () => {
    if (sync.active) await sync.syncNow();
    await queryClient.refetchQueries({ type: 'active' });
  };

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
   * A measured pace is a real number, not one of the six on the dial,
   * and a control with nothing selected looks broken. It earns a
   * seventh option, named for what it is — measured, whether by Steam or
   * by the evenings the app timed — rather than for one of its sources.
   */
  const paceOptions = PACE_OPTIONS.some((option) => option.value === pace)
    ? PACE_OPTIONS
    : [...PACE_OPTIONS, { value: pace, label: `${pace}h · measured` }];

  /** The window's name on the dial line, "whenever" included. */
  const windowName =
    WINDOW_OPTIONS.find((option) => option.value === windowWeeks)?.label ??
    'whenever';

  /**
   * Both dials, and the live verdict they move, in one sheet.
   *
   * They used to stand open under the verdict — two six-segment rows, a
   * pace note, the price of pins and a Steam link — so Tonight, the one
   * thing the page says it opens on, started about 450 points down. They
   * are the least-touched thing here and the most consequential, which
   * is a setting's shape: one line that says what they are set to, and
   * a sheet to change them in, carrying the verdict with it so moving a
   * dial still visibly moves the answer.
   */
  const dialSheet = (
    <BottomSheet
      visible={dialsOpen}
      onClose={() => setDialsOpen(false)}
      accessibilityLabel="Your pace and window"
    >
      <View style={styles.sheet}>
        <Text
          style={styles.sheetEyebrow}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
          Your pace
        </Text>
        <Text
          style={styles.sheetVerdict}
          maxFontSizeMultiplier={FONT_SCALE.display}
        >
          {verdictSentence}
        </Text>
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
        {/* A count of games, not hours, so it is not amber: amber on
            this line said "time" about a number that is not one. */}
        {schedule.costOfPins > 0 && (
          <Text style={styles.pinCost}>
            Keeping what you marked must-play costs you {schedule.costOfPins}{' '}
            other {schedule.costOfPins === 1 ? 'game' : 'games'} in this window.
            Worth it, probably.
          </Text>
        )}
        <Touchable
          onPress={() => setSteamOpen((open) => !open)}
          hitSlop="text"
          style={styles.inlineLink}
          accessibilityState={{ expanded: steamOpen }}
        >
          <Ionicons
            name="logo-steam"
            size={ICON.sm}
            color={COLORS.mediumGrey}
          />
          <Text style={styles.inlineLinkText}>
            {steamOpen ? 'Hide Steam' : 'Not sure? Measure it with Steam'}
          </Text>
        </Touchable>
        {steamOpen && (
          <SteamConnect
            onUsePace={(measured) => {
              setPace(measured);
              setSteamOpen(false);
            }}
            onImport={() => {
              setDialsOpen(false);
              router.push('/import');
            }}
          />
        )}
        <PrimaryButton
          label="Done"
          onPress={() => setDialsOpen(false)}
          variant="secondary"
          haptic="tap"
          block
          style={styles.sheetDone}
        />
      </View>
    </BottomSheet>
  );

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
              height as the lockup on the left and as the icon on Home. */}
          <IconButton
            icon="person-circle-outline"
            color={COLORS.lightGrey}
            onPress={() => router.push('/you')}
            style={[styles.youButton, { top: insets.top + SPACING.xxs }]}
            accessibilityLabel="You"
          />
        </>
      ) : (
        /* Native, compact: the wordmark row Home has, so the three tab
           roots open on the same chrome - the brand on the left, You on
           the right, at one height. The wordmark steps down here: on a
           tab root the page's own title is the loudest thing, and a
           22pt wordmark over it outranked the place you were in. */
        <View
          style={[styles.nativeChrome, { paddingTop: insets.top + SPACING.xs }]}
        >
          <View style={styles.nativeBrand}>
            <Mark size={18} />
            <Text
              style={styles.nativeWordmark}
              maxFontSizeMultiplier={FONT_SCALE.display}
            >
              sidequest
            </Text>
          </View>
          <IconButton
            icon="person-circle-outline"
            color={COLORS.lightGrey}
            onPress={() => router.push('/you')}
            style={styles.youNative}
            accessibilityLabel="You"
          />
        </View>
      )}

      <Screen onRefresh={refresh}>
        <View style={{ paddingBottom: SPACING.xxl }}>
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
              {/* The masthead: where you are, the answer, and what the
                  answer rests on — one group, tight, because the three
                  are one statement. */}
              <View style={styles.masthead}>
                <PageHeading
                  eyebrow="Your week"
                  title="The Plan"
                  tone="plan"
                  actionLabel={canShare ? 'Share' : undefined}
                  actionIcon="share-outline"
                  actionAccessibilityLabel="Copy a link to this plan"
                  onAction={canShare ? sharePlan : undefined}
                />
                {/* The verdict, in words, before anything else. The
                    page's one thesis, said once; the dial line under it
                    names what it rests on and opens the dials. */}
                {!empty && (
                  <Text
                    style={[
                      styles.standfirst,
                      isExpanded && styles.standfirstWide,
                    ]}
                    maxFontSizeMultiplier={FONT_SCALE.display}
                  >
                    {verdictSentence}
                  </Text>
                )}
                {!empty && (
                  <Touchable
                    onPress={() => setDialsOpen(true)}
                    hitSlop="text"
                    style={styles.dialLine}
                    accessibilityLabel={`Adjust the plan: ${pace}h a week, ${windowName}`}
                    accessibilityHint="Opens your pace and window"
                  >
                    <Text
                      style={styles.dialLineText}
                      maxFontSizeMultiplier={FONT_SCALE.label}
                    >
                      <Text style={styles.dialLineHours}>{pace}h a week</Text>
                      {'  ·  '}
                      {windowName}
                      {'  ·  '}
                      <Text style={styles.dialLineAdjust}>Adjust</Text>
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={ICON.sm}
                      color={COLORS.lightGrey}
                    />
                  </Touchable>
                )}
                {/* Between the verdict and tonight, because it is about
                    whether the verdict can be believed. Never a telling
                    off: a plan built on an optimistic pace promises what
                    the week cannot keep, and missing your own plan every
                    week is a far worse thing to feel than reading one
                    honest sentence about it. */}
                {!empty && paceNews && (
                  <View style={styles.paceNews}>
                    <Text style={styles.paceNewsText}>
                      Your timed evenings come to at least{' '}
                      {formatHours(paceNews.hoursPerWeek)} a week. This plan
                      assumes {pace}h, so it is holding back games you have room
                      for.
                    </Text>
                    <Text style={styles.paceNewsCaveat}>
                      Counts only the evenings you timed, across{' '}
                      {paceNews.sessions} of them.
                    </Text>
                    <Touchable
                      onPress={() =>
                        setPace(Math.max(1, Math.round(paceNews.hoursPerWeek)))
                      }
                      hitSlop="text"
                      style={styles.inlineLink}
                      accessibilityLabel={`Use ${Math.round(paceNews.hoursPerWeek)} hours a week`}
                    >
                      <Text style={styles.paceNewsAction}>
                        Use {Math.round(paceNews.hoursPerWeek)}h a week
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={ICON.sm}
                        color={COLORS.accent}
                      />
                    </Touchable>
                  </View>
                )}
              </View>

              {empty ? (
                /* The first screen onboarding lands on. It was a grey
                   circle and a map glyph; now it is the week this page
                   will draw, with nothing in it yet — seven dashed free
                   evenings — and the two ways to start filling it. */
                <View style={styles.emptyPlan}>
                  <Text
                    style={styles.emptyLine}
                    accessibilityRole="header"
                    maxFontSizeMultiplier={FONT_SCALE.display}
                  >
                    Seven free evenings. Save one game and I’ll fill one.
                  </Text>
                  <View style={styles.instrument}>
                    <WeekView
                      scheduled={[]}
                      now={now}
                      bare
                      readOnly
                      drawEmpty
                    />
                  </View>
                  <View style={styles.emptyActions}>
                    <PrimaryButton
                      label="Find something short"
                      onPress={() => router.push('/')}
                    />
                    <PrimaryButton
                      label="Import"
                      variant="secondary"
                      icon="download-outline"
                      onPress={() => router.push('/import')}
                    />
                  </View>
                </View>
              ) : (
                <>
                  {/* 1 — TONIGHT.
                      The page opens on the question somebody actually has
                      at eight o'clock on a Tuesday — straight under the
                      verdict now, where it was once 450 points down
                      beneath the dials.

                      A strip, not a hero. Home already stages tonight at
                      full size; here it is the plan's next line item. The
                      strip is a plain view: the picture and the sentence
                      are one labelled target that opens the game, and the
                      session control is its sibling, so VoiceOver can
                      reach both — nested inside one button, it could not
                      reach the control at all. */}
                  {tonightPick && (
                    <View
                      style={[styles.tonight, isExpanded && styles.tonightWide]}
                    >
                      <Touchable
                        feedback="scale"
                        onPress={() => router.push(`/game/${tonightPick.id}`)}
                        onPressIn={() => warm(tonightPick.id)}
                        style={[
                          styles.tonightOpen,
                          isExpanded && styles.tonightOpenWide,
                        ]}
                        accessibilityLabel={`Open ${tonightPick.name}`}
                        accessibilityHint={`Tonight: ${tonightVerb.toLowerCase()} it`}
                      >
                        <View
                          style={[
                            styles.tonightThumb,
                            isExpanded && styles.tonightThumbWide,
                          ]}
                        >
                          <CoverImage
                            uri={
                              gamesById.get(tonightPick.id)?.background_image
                            }
                            style={StyleSheet.absoluteFill}
                            size="tile"
                            iconSize={ICON.lg}
                          />
                        </View>
                        <View style={styles.tonightBody}>
                          <View style={styles.tonightHead}>
                            <Ionicons
                              name="moon"
                              size={ICON.sm - 1}
                              color={COLORS.violet}
                            />
                            <Text
                              style={styles.tonightEyebrow}
                              maxFontSizeMultiplier={FONT_SCALE.label}
                            >
                              TONIGHT
                            </Text>
                          </View>
                          <Text
                            style={styles.tonightTitle}
                            numberOfLines={2}
                            maxFontSizeMultiplier={FONT_SCALE.display}
                          >
                            {tonightVerb} {tonightPick.name}
                          </Text>
                          <Text style={styles.tonightWhy}>
                            {tonight.finishable
                              ? 'You can see the credits tonight.'
                              : tonight.continueGame
                                ? 'Chip away at it — progress counts.'
                                : byStatus('playing').length +
                                      byStatus('wishlist').length ===
                                    1
                                  ? 'The one game on your shelf.'
                                  : 'The shortest thing you’ve saved.'}
                          </Text>
                        </View>
                      </Touchable>
                      <View
                        style={
                          isExpanded ? styles.tonightControlWide : undefined
                        }
                      >
                        <Segmented
                          label="I have"
                          options={SESSION_OPTIONS}
                          value={sessionMinutes}
                          onChange={setSession}
                        />
                      </View>
                    </View>
                  )}

                  {/* One instrument, not three plates: the week, the
                      month and what doesn't fit are bands on one plate,
                      parted by hairlines, read top to bottom. */}
                  <View style={styles.instrument}>
                    {/* 2 — THIS WEEK. The plan at the scale a person
                        lives at: one row per evening, free evenings drawn
                        as free, because a night given back has to look
                        given back. */}
                    {schedule.scheduled.length > 0 && (
                      <View style={styles.section}>
                        <SectionHeader title="This week" eyebrow="Evenings" />
                        <Text style={styles.bandNote}>
                          The free ones count too.
                        </Text>
                        <WeekView
                          scheduled={schedule.scheduled}
                          now={now}
                          leadId={tonightPick?.id}
                          bare
                        />
                      </View>
                    )}

                    {/* 3 — THIS MONTH. A timeline, never a 30-box grid:
                        the month's only facts are when the credits land
                        and whether everything fits. The strip is the
                        picture; the route beneath it is the sentences,
                        one per game, shortest first. */}
                    {schedule.scheduled.length > 0 && (
                      <View style={[styles.section, styles.band]}>
                        <SectionHeader
                          title="This month"
                          eyebrow="Quick wins"
                        />
                        <Text style={styles.bandNote}>
                          {landed.length > 0
                            ? 'Shortest first — where the credits land, and where they landed.'
                            : 'Shortest first — where the credits land.'}
                        </Text>
                        <View style={styles.monthCard}>
                          <HorizonStrip
                            scheduled={schedule.scheduled}
                            now={now}
                            troubled={troubled}
                            landed={landed}
                            // The route below names every game the strip
                            // cannot, and counts its own rest.
                            countBeyond={false}
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
                                onPressIn={() => warm(item.id)}
                                onEditLength={() => {
                                  const target = gamesById.get(item.id);
                                  if (target) setEditing(target);
                                }}
                              />
                            ))}
                          </View>
                          {routeRest > 0 && (
                            <Touchable
                              style={styles.routeRest}
                              onPress={() => router.push('/library')}
                              accessibilityRole="link"
                              accessibilityLabel={`${routeRest} more games in your plan — open your library`}
                            >
                              <Text style={styles.routeRestText}>
                                + {routeRest} more after these, shortest first.{' '}
                                <Text style={styles.routeRestLink}>
                                  See them all in your library{' '}
                                  <Ionicons
                                    name="chevron-forward"
                                    size={ICON.sm - 2}
                                    color={COLORS.lightGrey}
                                  />
                                </Text>
                              </Text>
                            </Touchable>
                          )}
                        </View>
                      </View>
                    )}

                    {/* 4 — WHAT DOESN'T FIT. One calm section, one row
                        per game, each with its ways out. After the plan,
                        because the answer leads and the exceptions
                        follow it. */}
                    {misfitCount > 0 && (
                      <View style={[styles.section, styles.band]}>
                        <SectionHeader
                          title="What doesn’t fit"
                          eyebrow={`${misfitCount} ${
                            misfitCount === 1 ? 'game' : 'games'
                          }`}
                        />
                        <Text style={styles.bandNote}>And that’s allowed.</Text>
                        <Alerts
                          alerts={alerts}
                          overflow={schedule.dropped}
                          gamesById={gamesById}
                        />
                      </View>
                    )}
                    {unknown.length > 0 && (
                      <View style={[styles.section, styles.band]}>
                        <SectionHeader
                          title="Length unknown"
                          eyebrow={`${unknown.length} games`}
                        />
                        <Text style={styles.bandNote}>
                          Nobody has reported how long these take. Tell the plan
                          and it can place them.
                        </Text>
                        <View>
                          {unknown.map((entry, index) => (
                            <Touchable
                              key={entry.game.id}
                              feedback="tint"
                              style={[
                                styles.row,
                                index === unknown.length - 1 && styles.rowLast,
                              ]}
                              onPress={() => setEditing(entry.game)}
                              accessibilityLabel={`Set how long ${entry.game.name} takes`}
                            >
                              <CoverImage
                                uri={entry.game.background_image}
                                style={styles.rowArt}
                                size="thumb"
                                iconSize={ICON.md}
                              />
                              <View style={styles.rowBody}>
                                <Text
                                  style={styles.rowTitle}
                                  numberOfLines={1}
                                  maxFontSizeMultiplier={FONT_SCALE.label}
                                >
                                  {entry.game.name}
                                </Text>
                                <Text style={styles.rowAction}>
                                  Set how long it takes
                                </Text>
                              </View>
                              <Ionicons
                                name="chevron-forward"
                                size={ICON.sm}
                                color={COLORS.mediumGrey}
                              />
                            </Touchable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </FadeInView>
        </View>
        {dialSheet}
        <DurationSheet
          game={editing}
          duration={editing ? durationOf(editing) : null}
          onClose={() => setEditing(null)}
        />
        {/* Out past the shell column's padding on a desk, so the shore
            runs the column's full width the way Home's does; on a phone
            the footer is already the page's width. */}
        <SiteFooter inset={isExpanded ? SPACING.xl : 0} />
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
    // A floor, not a fixed height: the safe-area inset is padding INSIDE
    // this box, and at 48 the box was shorter than its own padding on a
    // notched phone, so the wordmark rendered below it and the list
    // scrolled over the top of the brand.
    minHeight: TOUCH.min + SPACING.xs,
  },
  nativeBrand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  /** The brand, a step below the page's own title on a tab root. */
  nativeWordmark: { ...WORDMARK, fontSize: 17, lineHeight: 21 },
  /** The glyph lines up with the gutter; its 44pt target reaches past it. */
  youNative: { marginRight: -SPACING.sm2 },
  innerDesk: { paddingHorizontal: 0 },
  youButton: { position: 'absolute', right: SPACING.sm2, zIndex: 30 },
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
  /**
   * The heading, the verdict and the line that says what it rests on:
   * one statement in three registers, held together. The dials used to
   * stand 48 points from the verdict they change and 64 from Tonight.
   */
  masthead: { gap: SPACING.sm2 },

  /**
   * The page's thesis, set as one: display type, white, said once, and
   * the dial line under it opens the sheet that changes it live.
   */
  /**
   * The verdict, one step under the page's title.
   *
   * It was set in the title step, white, directly beneath the display
   * title — 26 under 32 in the same face and the same white, two
   * headlines shouting over each other. A step down and a shade quieter
   * makes it what it is: the page's statement, read after its name.
   */
  standfirst: {
    ...TYPE.h1,
    color: COLORS.lightGrey,
    marginTop: SPACING.xs,
    maxWidth: 640,
  },
  standfirstWide: {
    ...TYPE.figure,
    maxWidth: 760,
  },
  /** "6h a week · whenever · Adjust": the dials, folded to what they say. */
  dialLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    minHeight: 24,
  },
  dialLineText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
  /** The pace is hours, and hours are amber. */
  dialLineHours: { color: COLORS.accent },
  dialLineAdjust: { color: COLORS.lightGrey },

  /** The sheet the dial line opens. */
  sheet: { gap: SPACING.md },
  sheetEyebrow: { ...TYPE.micro, color: COLORS.violetText },
  sheetVerdict: { ...TYPE.h2, color: COLORS.white },
  sheetDone: { marginTop: SPACING.xs },
  pinCost: { ...TYPE.caption, color: COLORS.lightGrey },

  /**
   * The one thing on this page that reports on the reader rather than
   * on their games, so it is kept quiet and factual — no warning
   * colour, no icon. It states two numbers and offers a tap.
   */
  paceNews: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.stroke,
  },
  paceNewsText: { ...TYPE.caption, color: COLORS.lightGrey },
  paceNewsCaveat: { ...TYPE.caption, color: COLORS.mediumGrey },
  paceNewsAction: { ...TYPE.labelSmall, color: COLORS.accent },
  /** A text link with a chevron, drawn small and hit at full height. */
  inlineLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    minHeight: 20,
  },
  inlineLinkText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },

  /** The empty Plan: a line, the week it will fill, and two ways in. */
  emptyPlan: { gap: SPACING.lg },
  emptyLine: { ...TYPE.title, color: COLORS.white, maxWidth: 520 },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm2 },

  tonight: {
    gap: SPACING.md,
    padding: SPACING.md,
    overflow: 'hidden',
    ...MATERIAL.plate,
    borderRadius: RADIUS.md,
  },
  tonightWide: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  /** The picture and the sentence: one target, the game it opens. */
  tonightOpen: { gap: SPACING.md },
  tonightOpenWide: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  /** A banner across a phone; a thumb beside the sentence on a desk. */
  tonightThumbWide: { width: 168 },
  tonightThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    // Concentric with the plate it sits in, sixteen points in.
    borderRadius: innerRadius(RADIUS.md, SPACING.md),
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  /**
   * At the row's end on a desk, and never squeezed: five chips need
   * their width, and a row that let the sentence take it first crushed
   * them to "3… 1h 1½ 2h 3h". The control keeps its measure; the
   * sentence beside it is what wraps.
   */
  tonightControlWide: {
    marginLeft: 'auto',
    minWidth: 340,
    flexShrink: 0,
  },
  tonightBody: {
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  tonightHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tonightEyebrow: {
    ...TYPE.tag,
    // The evening's colour, lifted to read on the plate.
    color: COLORS.violetText,
  },
  tonightWhy: {
    ...TYPE.p,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
  },
  /**
   * The verb and the game, at display size. The answer is "Start
   * Oxenfree"; how long you have is the control beside it.
   */
  tonightTitle: {
    ...TYPE.title,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
  },

  /** The one plate the plan stands on. */
  instrument: {
    ...MATERIAL.plate,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  /** A band after the first: parted from the one above by a hairline. */
  band: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  section: { gap: SPACING.sm2 },
  /**
   * What a band's eyebrow used to say in ten-point tracked capitals —
   * whole sentences in the smallest type on the page. The eyebrow is a
   * name now, and the sentence is set as one.
   */
  bandNote: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  /**
   * The month card: the horizon strip on top, the route beneath it —
   * the picture, then its sentences, on the same plane the week uses.
   */
  monthCard: { gap: SPACING.md },
  monthRule: { height: 1, backgroundColor: COLORS.stroke },
  /** The line that replaces four hundred rows — see ROUTE_SHOWN. */
  routeRest: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  routeRestText: { ...TYPE.caption, color: COLORS.mediumGrey },
  routeRestLink: { fontFamily: 'Noah-Bold', color: COLORS.lightGrey },

  /**
   * The Plan's one row.
   *
   * The panel mixed three: 64×40 strips on the route, 44pt squares in
   * the alerts, 56×35 strips under "Length unknown", and the last set
   * as bordered cards at the panel's own radius inside it. One now: a
   * 40pt square of art at the thumbnail radius, a title, one line of
   * meta, a trailing slot, and a hairline to the next.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.stroke,
  },
  rowLast: { borderBottomWidth: 0 },
  rowArt: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xs,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  rowBody: { flex: 1, minWidth: 0, gap: SPACING.xxs },
  rowTitle: {
    ...TYPE.label,
    color: COLORS.lightGrey,
    flexShrink: 1,
  },
  rowMetaLine: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  /** A length is time: amber. */
  rowAction: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
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
    gap: SPACING.sm2,
    paddingVertical: SPACING.sm2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.stroke,
  },
  questLast: { borderBottomWidth: 0 },
  /** The art, the words and the date: one target, the game it opens. */
  questOpen: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm2,
  },
  /** The pencil's glyph sits at the row's edge; its target reaches past. */
  questEdit: { marginRight: -SPACING.sm2, marginLeft: -SPACING.xs },
  questRail: {
    width: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    /**
     * Out through the row's padding, so the thread actually joins.
     *
     * `stretch` fills the content box, which stops short at each end —
     * leaving a gap at every join and a route that looked severed at
     * exactly the places it claims to connect.
     */
    marginVertical: -SPACING.sm2,
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questNodeText: {
    ...TYPE.label,
    color: COLORS.white,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  questMetaYours: { color: COLORS.lightGrey, fontFamily: 'Noah-Bold' },
  questWhen: { alignItems: 'flex-end', gap: SPACING.xxs },
  questDate: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
  questLate: { ...TYPE.fine, color: COLORS.coralText },
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
