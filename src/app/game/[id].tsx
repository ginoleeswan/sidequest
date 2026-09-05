import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EMPTY_MEDIA,
  cachedGame,
  gameMediaQuery,
  gameQuery,
  placeholderDetail,
} from '@/api/gameDetail';
import { artQuery, steamIdFrom } from '@/api/art';
import { queryKeys } from '@/api/queryClient';
import { fetchIgdbExtras, igdbCoverUri } from '@/api/igdb';
import { friendlyError, mediaUri } from '@/api/rawg';
import type { Game, GameDetail, Movie, Named } from '@/api/types';
import { RouteError } from '@/components/RouteError';
import { DesktopShell } from '@/components/DesktopShell';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { CommunityStats } from '@/components/CommunityStats';
import { ChromeWeld } from '@/components/ChromeWeld';
import { Decision } from '@/components/Decision';
import { FitStrip } from '@/components/FitStrip';
import { fitFrom } from '@/lib/fit';
import { pickTrailer } from '@/lib/stage';
import { StageTrailer } from '@/components/StageTrailer';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { Commitment } from '@/components/Commitment';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { PersonalNote, usePersonalNote } from '@/components/PersonalNote';
import { SessionTimer } from '@/components/SessionTimer';
import { rememberGame } from '@/lib/recent';
import { calendarDate, compact } from '@/lib/format';
import { Rail } from '@/components/Rail';
import { LiveStreams } from '@/components/LiveStreams';
import { RatingsBreakdown } from '@/components/RatingsBreakdown';
import { ReadMoreText } from '@/components/ReadMoreText';
import { ScorePill } from '@/components/ScorePill';
import { Seam } from '@/components/Seam';
import { SectionHeader } from '@/components/SectionHeader';
import {
  Skeleton,
  SkeletonDetail,
  SkeletonDetailExpanded,
} from '@/components/Skeleton';
import { PlatformIcons } from '@/components/PlatformIcons';
import { StatusActions } from '@/components/StatusActions';
import { StoreLinks } from '@/components/StoreLinks';
import { TitleLogo } from '@/components/TitleLogo';
import { DurationSheet } from '@/components/DurationSheet';
import { SHORE_H, SiteFooter } from '@/components/SiteFooter';
import { Melt } from '@/components/Melt';
import { GrainScrim, Textured } from '@/components/Textured';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  DESK_BAND,
  TITLE_SLOT,
  bannerHeight,
  deskBandCeiling,
} from '@/lib/detailHero';
import { formatHours } from '@/lib/duration';
import { verdictLine } from '@/lib/verdict';
import { useDurations } from '@/lib/durations';
import { usePersistedState } from '@/hooks/usePersistedState';
import { usePlanStanding } from '@/hooks/usePlanStanding';
import { findSection } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

const HTML_TAGS = /(<([^>]+)>)/gi;

/**
 * How wide this page is allowed to get, whatever the monitor is.
 *
 * The app's expanded cap is 1600, which suits a grid of tiles and
 * ruins a page of prose: past about 1300 the main column reached 964
 * while the paragraph inside it stayed at its 480pt measure, so half
 * the column was empty, the controls floated 460pt from the artwork,
 * and nothing in the masthead shared an edge with anything else.
 *
 * 1080 is derived rather than chosen: 560 for the column — the measure
 * plus a margin, not a void — 32 for the gutter, 360 for the rail, and
 * the page's own 64 on each side. Everything past that goes to the
 * margins, where a wide monitor is supposed to put it.
 */
const PAGE_MAX = 1200;

/** The columns' own margin inside the cap; the masthead's lockup shares it. */
const DESK_GUTTER = SPACING.xl * 2;

/** The tallest the publisher's mark stands on the desk's band. */
const DESK_MARK = 150;

/**
 * The rail's ceiling. Steam's is 375 and Epic's 280; 340 sits between
 * them and leaves the picture the 70% both give it.
 */
const RAIL = 340;

/** How far the chrome join reaches below the safe area. */
const WELD_HEIGHT = 190;

/** RAWG descriptions arrive as HTML: after stripping tags, unescape the
    handful of entities that actually occur in them. */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? m);
}

/* ------------------------------------------------------------------ atoms */

/**
 * A trailer, at the stage's own size.
 *
 * Its own component because `useVideoPlayer` is a hook and the stage
 * picks its lead at render time. No autoplay: a page that starts
 * talking when you open it is a page you close, and the play button is
 * the platform's own.
 */
function StageVideo({
  movie,
  style,
  autoPlay = false,
}: {
  movie: Movie;
  /** The stage fills its column; the phone's carousel sizes each frame. */
  style?: StyleProp<ViewStyle>;
  /**
   * Start it, silently.
   *
   * Both stores open their gallery on a moving trailer, and they are
   * right: a still asks you to imagine the game, a trailer shows it.
   * Muted is not a detail — a page that makes noise when you open it is
   * a page people close, and every browser refuses to autoplay sound
   * anyway. The controls are there the moment somebody wants them.
   */
  autoPlay?: boolean;
}) {
  const player = useVideoPlayer(mediaUri(movie.data.max) ?? '', (p) => {
    if (!autoPlay) return;
    p.muted = true;
    p.loop = true;
  });

  /*
   * Started from an effect, not from the setup callback. The callback
   * runs while the player is still being wired to a source, so a
   * `play()` there resolves into nothing — measured as muted-but-paused
   * on the first frame. After mount it takes.
   */
  useEffect(() => {
    if (!autoPlay) return;
    const started = setTimeout(() => {
      try {
        player.muted = true;
        player.play();
      } catch {
        // An autoplay a browser declines is a trailer with a play
        // button on it, which is the state it would have had anyway.
      }
    }, 0);
    return () => clearTimeout(started);
  }, [autoPlay, player]);
  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      contentFit="contain"
      nativeControls
    />
  );
}

/**
 * A desktop media shelf, the way the pages that live off them build it.
 *
 * Not a panel. Steam, Epic and every storefront shelf put media on the
 * page ground — thumbnails are already rich objects, and a border
 * around them is chrome on chrome. Containment is said three ways
 * instead: the clip ends at the band, the last visible card is cut
 * mid-frame, and a fade at the right edge dissolves it — the same
 * sentence "there is more" in three registers. The chevrons beside the
 * header are what make it a desktop object: a shelf you can page is
 * browsable; one you can only drag is a phone gesture on a mouse.
 */
function Shelf<T>({
  title,
  data,
  keyExtractor,
  renderItem,
}: {
  title: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
}) {
  const listRef = useRef<FlatList<T> | null>(null);
  const offset = useRef(0);
  const [width, setWidth] = useState(0);

  const page = (direction: 1 | -1) => {
    // A page is most of the visible width; the 100pt held back keeps
    // one card straddling the turn, so the eye carries across pages.
    const step = Math.max(width - 100, 200);
    offset.current = Math.max(0, offset.current + direction * step);
    /*
     * The DOM node first: react-native-web's FlatList quietly ignored
     * scrollToOffset here — measured as scrollLeft never moving — while
     * the underlying element scrolls fine. The RN call stays as the
     * fallback for any platform where the node accessor is missing.
     */
    const node = (
      listRef.current as unknown as {
        getScrollableNode?: () => HTMLElement;
      } | null
    )?.getScrollableNode?.();
    if (node) {
      // Assignment, not scrollTo({behavior:'smooth'}): the smooth call
      // is silently inert in some embedded-Chromium contexts (measured:
      // scrollLeft never moved) while assignment always lands.
      node.scrollLeft = offset.current;
    } else {
      listRef.current?.scrollToOffset({
        offset: offset.current,
        animated: true,
      });
    }
  };

  return (
    <View style={styles.block}>
      <View style={styles.shelfHead}>
        <SectionHeader wide title={title} />
        <View style={styles.shelfPager}>
          {(
            [
              ['chevron-back', -1],
              ['chevron-forward', 1],
            ] as const
          ).map(([icon, direction]) => (
            <Pressable
              key={icon}
              onPress={() => page(direction)}
              style={styles.shelfChevron}
              accessibilityRole="button"
              accessibilityLabel={
                direction === 1 ? 'Show more' : 'Show previous'
              }
            >
              <Ionicons name={icon} size={16} color={COLORS.lightGrey} />
            </Pressable>
          ))}
        </View>
      </View>
      <View
        style={styles.shelfClip}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <Rail<T>
          data={data}
          keyExtractor={keyExtractor}
          inset={0}
          listRef={listRef}
          renderItem={renderItem}
        />
        <LinearGradient
          colors={['#333D5100', COLORS.darkGrey]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shelfFade}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

/**
 * The finishing rate — the verdict this app can give and no store can.
 *
 * "92% recommended" is RAWG's opinion of the game. It says nothing
 * about the thing this whole app is built on, which is whether a game
 * is a good use of the hours it asks for. Beaten against owned is
 * exactly that, out of the same payload that was already sitting in
 * the rail as trivia: of the people who have it, this many reached the
 * credits.
 *
 * Coloured on the app's own semantics rather than a curve — mint is
 * time well spent, amber is a maybe, coral is a shelf. And it is only
 * claimed where the sample can carry it: under a few hundred owners
 * the ratio is noise wearing a percentage.
 */
function finishRateOf(game: GameDetail): { pct: number; tint: string } | null {
  const st = game.added_by_status;
  if (!st) return null;
  const owned = st.owned ?? 0;
  const beaten = st.beaten ?? 0;
  if (owned < 300) return null;
  const pct = Math.round((beaten / owned) * 100);
  const tint =
    pct >= 45 ? COLORS.mint : pct >= 20 ? COLORS.accent : COLORS.coral;
  return { pct, tint };
}

/**
 * The plan's answer, or the arithmetic that would produce one.
 *
 * Written once. It was two identical trees, one per width, and the
 * copy had already started to drift between them.
 */
function PlanLine({
  game,
  onOpenPlan,
  pace: showPace = true,
}: {
  game: GameDetail;
  onOpenPlan: () => void;
  /**
   * Whether to fall back to the pace sentence for a game that is not in
   * the plan. The phone draws the fit strip instead — a picture of the
   * evenings beats "about 4 weeks at 6h a week", and printing both is
   * the same fact twice in two registers.
   */
  pace?: boolean;
}) {
  const { durationOf } = useDurations();
  const duration = durationOf(game);
  const [pace] = usePersistedState('sidequest.plan.pace', 6);
  const standing = usePlanStanding(game.id);

  if (standing?.kind === 'scheduled') {
    return (
      <Text
        style={[styles.statPace, styles.statPlan]}
        onPress={onOpenPlan}
        suppressHighlighting
        accessibilityRole="link"
        accessibilityLabel={`Open your plan — ${game.name} is number ${
          standing.position + 1
        }`}
      >
        #{standing.position + 1} in your plan · credits around{' '}
        {new Date(standing.finishAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
        <Text style={styles.statArrow}> →</Text>
      </Text>
    );
  }
  if (standing?.kind === 'dropped') {
    /* The relief stance, on a page about one game: the window has no
       room for it and that is a fact about the window, not a failing
       of the reader. §2.1 — no line in this app tells somebody they
       are behind. */
    return (
      <Text
        style={styles.statPace}
        onPress={onOpenPlan}
        suppressHighlighting
        accessibilityRole="link"
        accessibilityLabel="Open your plan"
      >
        More than your window holds. It’ll still be here.
        <Text style={styles.statArrow}> →</Text>
      </Text>
    );
  }
  if (duration.hours > 0 && showPace) {
    return (
      <Text style={styles.statPace}>
        {duration.hours <= pace
          ? `Under a week at ${pace}h a week.`
          : `About ${Math.round(duration.hours / pace)} weeks at ${pace}h a week.`}
      </Text>
    );
  }
  return null;
}

/** What the figure is: whose number, and how sure. */
function hoursLabelFor(
  duration: ReturnType<ReturnType<typeof useDurations>['durationOf']>
): string {
  return duration.source === 'yours'
    ? 'your length'
    : duration.source === 'reported'
      ? 'players report'
      : 'to finish';
}

/**
 * The desktop masthead's figure: the hours at display size, the plan's
 * arithmetic beside them.
 *
 * This was five statistics in equal columns — length, rating,
 * Metacritic, year, ESRB — which gave a certification the same weight
 * as the number the whole app is built on. Equal weight is not
 * neutrality; it is a refusal to say what matters.
 */
function StatStrip({
  game,
  onEditLength,
  onOpenPlan,
  onGround = false,
}: {
  game: GameDetail;
  onEditLength: () => void;
  onOpenPlan: () => void;
  /**
   * Standing on the page rather than on a picture. The contact shadow
   * the figure wears over artwork is a smudge under amber on a flat
   * navy ground, so it comes off.
   */
  onGround?: boolean;
}) {
  const { durationOf } = useDurations();
  const duration = durationOf(game);

  return (
    <View style={[styles.statBlock, styles.statBlockWide]}>
      <Pressable
        onPress={onEditLength}
        accessibilityRole="button"
        accessibilityLabel={`Change how long ${game.name} takes`}
      >
        <View style={styles.hoursLine}>
          <Text
            style={[
              styles.hoursValue,
              styles.hoursValueWide,
              onGround && styles.onGround,
            ]}
          >
            {duration.hours > 0 ? formatHours(duration.hours) : 'Set'}
          </Text>
          <Text style={[styles.hoursLabel, onGround && styles.onGround]}>
            {hoursLabelFor(duration)}
          </Text>
          {/* Said, rather than punctuated. A bare "?" after the figure
              read as text that had failed to render — and it was doing
              a different job from the "~", which says the number is not
              yours; this says the number is a guess. A word cannot be
              mistaken for debris. */}
          {duration.rough && duration.hours > 0 ? (
            <Text style={styles.estimateTag}>ESTIMATE</Text>
          ) : null}
          {/* The app's own pencil, not U+270E. A dingbat is not in the
              subset the app ships, so it fell through to whatever face
              the platform had — which is how an edit affordance ends up
              rendering as a smudge beside a 76pt number. */}
          <Ionicons
            name="pencil"
            size={15}
            color={COLORS.mediumGrey}
            style={styles.statPencil}
          />
        </View>
      </Pressable>
      {/* On the wide page the byline and the pace share one line —
          identity on the left, the plan's arithmetic on the right —
          because the pace sentence alone was an orphan: a tiny grey
          line hanging under the rule with a column of empty space
          beside it. */}
      <View style={styles.bylineRow}>
        <PlanLine game={game} onOpenPlan={onOpenPlan} />
      </View>
    </View>
  );
}

/**
 * The phone's figures, on solid ground under the artwork.
 *
 * The masthead used to carry all of them on the picture: the hours in
 * amber display type, a body-size label and a pencil, then a line of
 * genre glyphs, a star figure and a Metacritic pill in three different
 * shapes, then the pace sentence, then — under the picture — the
 * studio and the year in grey. Five registers in eighty points, each
 * with its own colour and its own alignment, and none of it on a grid.
 * That is what "messy" looks like when the individual parts are fine.
 *
 * The store pages this app borrows from solve it the same way: the art
 * carries identity and nothing else, and the numbers sit in one strip
 * beneath it — equal cells, a figure over a small label, hairlines
 * between. The strip is the page's second line; the hours lead it in
 * amber, and the rest fall in behind at the same size in the app's
 * greys, so the eye ranks them by colour and not by hunting.
 */
function InfoStrip({
  game,
  onEditLength,
}: {
  game: GameDetail;
  onEditLength: () => void;
}) {
  const { durationOf } = useDurations();
  const duration = durationOf(game);
  const finish = finishRateOf(game);

  /*
   * A length nobody has reported is not a figure.
   *
   * It used to read "Set" in amber display type, in the first and
   * loudest cell — an empty state wearing a value's clothes, and the
   * app's one colour for time spent on a game whose time is unknown.
   * The row is a row of facts, and the honest mark for a missing one is
   * the em dash the rest of the app already uses (see `formatHours`).
   *
   * The invitation does not disappear, it changes register: the amber
   * moves off the figure and onto the label, which stops being a
   * caption and becomes the question — "how long?" under a dash, with
   * the pencil beside it. What is loud is the thing you can answer,
   * not a number that is not there.
   */
  const known = duration.hours > 0;

  const cells: {
    key: string;
    value: string;
    label: string;
    tint?: string;
    labelTint?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
    edit?: boolean;
  }[] = [
    {
      key: 'hours',
      value: known ? formatHours(duration.hours) : '—',
      label: known
        ? duration.rough
          ? `${hoursLabelFor(duration)} · est.`
          : hoursLabelFor(duration)
        : 'how long?',
      tint: known ? COLORS.accent : COLORS.mediumGrey,
      labelTint: known ? undefined : COLORS.accent,
      onPress: onEditLength,
      accessibilityLabel: known
        ? `Change how long ${game.name} takes`
        : `Say how long ${game.name} takes`,
      edit: true,
    },
  ];
  if (game.rating > 0)
    cells.push({
      key: 'rating',
      value: `★ ${game.rating.toFixed(1)}`,
      label: 'players',
    });
  if (game.metacritic != null)
    cells.push({
      key: 'metacritic',
      value: String(game.metacritic),
      label: 'Metacritic',
      tint:
        game.metacritic >= 75
          ? COLORS.mint
          : game.metacritic >= 50
            ? COLORS.accent
            : COLORS.coral,
    });
  if (finish)
    cells.push({
      key: 'finish',
      value: `${finish.pct}%`,
      label: 'finished it',
      tint: finish.tint,
    });

  /*
   * Two figures do not fill a phone the way four do.
   *
   * An unreleased game has no score, no finishing rate and no length,
   * so the strip comes down to a length to set and a star rating —
   * and at a quarter of the width each they sat marooned in their own
   * halves with a rule stranded between them. Equal cells are right
   * where there are enough of them to read as a row; below that the
   * group closes up and centres, which is a set of two facts rather
   * than a table with holes in it.
   */
  const spread = cells.length > 2;

  return (
    <View style={[styles.strip, !spread && styles.stripTight]}>
      {cells.map((cell, index) => (
        <Pressable
          key={cell.key}
          onPress={cell.onPress}
          disabled={!cell.onPress}
          accessibilityRole={cell.onPress ? 'button' : undefined}
          accessibilityLabel={cell.accessibilityLabel}
          style={[
            styles.stripCell,
            spread ? styles.stripCellSpread : styles.stripCellTight,
            index > 0 && styles.stripCellRule,
          ]}
        >
          <Text
            style={[styles.stripValue, cell.tint ? { color: cell.tint } : null]}
            numberOfLines={1}
          >
            {cell.value}
          </Text>
          <View style={styles.stripLabelRow}>
            <Text
              style={[
                styles.stripLabel,
                cell.labelTint ? { color: cell.labelTint } : null,
              ]}
              numberOfLines={1}
            >
              {cell.label}
            </Text>
            {cell.edit ? (
              <Ionicons
                name="pencil"
                size={10}
                color={cell.labelTint ?? COLORS.mediumGrey}
              />
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The phone's record, as a grid.
 *
 * Label over value, two to a row, the way a store's Information block
 * files a game: half the height of the ruled list it replaces, and no
 * rules at all - the columns are the structure. Platforms takes a
 * whole row because it is the one value that runs long.
 */
function FactGrid({
  facts,
}: {
  facts: {
    label: string;
    value?: string | null;
    node?: React.ReactNode;
    wide?: boolean;
  }[];
}) {
  const present = facts.filter((fact) => fact.value || fact.node);
  if (present.length === 0) return null;
  return (
    <View style={styles.factGrid}>
      {present.map((fact) => (
        <View
          key={fact.label}
          style={[styles.factCell, fact.wide && styles.factCellWide]}
        >
          <Text style={styles.metaLabel}>{fact.label}</Text>
          {fact.node ?? (
            <Text style={styles.metaValue} numberOfLines={2}>
              {fact.value}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function MetaRow({ label, items }: { label: string; items?: Named[] }) {
  if (!items?.length) return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>
        {items.map((item) => item.name).join(', ')}
      </Text>
    </View>
  );
}

/**
 * Full screen, for a picture or a trailer.
 *
 * The trailer needed somewhere to go. It cannot play inside the
 * masthead gallery: the title, the figure and the byline sit over the
 * bottom of that frame, and a video's own controls live in exactly the
 * same place — two sets of type fighting for one strip. Full screen it
 * has the room, the controls have nothing to collide with, and the
 * gesture is the one people already use on a picture here.
 */
function Lightbox({
  uri,
  movie,
  onClose,
}: {
  uri: string | null;
  movie: Movie | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={uri != null || movie != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.lightbox} onPress={onClose}>
        {movie ? (
          <StageVideo movie={movie} style={styles.lightboxImage} />
        ) : uri ? (
          <Image
            source={{ uri: mediaUri(uri, 1280) }}
            style={styles.lightboxImage}
            contentFit="contain"
          />
        ) : null}
        {/* Tap-anywhere already closes; the X is for the reader who
            does not know that. An escape hatch you can see is part of
            what makes a full-screen takeover feel safe to enter. */}
        <Pressable
          onPress={onClose}
          style={styles.lightboxClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color={COLORS.white} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ------------------------------------------------------------------ screen */

export default function GameInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [editingLength, setEditingLength] = useState(false);
  /**
   * When the page was opened.
   *
   * Captured once rather than read at render: the fit strip lays a game
   * across the evenings from tonight, and a clock read during render is
   * both impure and liable to re-cut the strip under the reader's thumb
   * as the minutes pass.
   */
  const [openedAt] = useState(() => Date.now());
  /** The main column's measured width, so the gallery's frames divide it. */
  const [columnWidth, setColumnWidth] = useState(0);
  /**
   * Which trailer the phone's carousel has been asked to play.
   *
   * A `VideoView` renders black until it is started, so a carousel that
   * opens on one opens on a black box — and mounting a player for every
   * trailer in the rail buys that for each of them. The poster frame
   * stands in until somebody actually asks.
   */
  const [playing, setPlaying] = useState<number | null>(null);
  const { durationOf, learnDurations } = useDurations();

  const { isExpanded, width } = useBreakpoint();
  /** The band takes a share of the window; see `bannerHeight`. */
  const { height: windowHeight } = useWindowDimensions();
  const hasNote = usePersonalNote(Number(id));
  const insets = useSafeAreaInsets();
  const opacity = useAnimatedValue(0);
  /** The rail's own fade, a beat behind the main column. */
  const railOpacity = useAnimatedValue(0);
  const reducedMotion = useReducedMotion();

  /**
   * The record, standing on what the tile already knew.
   *
   * Every shelf row carries the fields the masthead is built from, so
   * when a tap arrives from a list the page paints its hero from that
   * row at zero network cost — no bones, no wait — and fills in the
   * description, the verdict and the file when the record lands.
   * `sketch` is true while it is standing on the row rather than the
   * record; the body below the fold shows bones until then.
   */
  const {
    data: game,
    error,
    isPending,
    fetchStatus,
    isPlaceholderData: sketch,
  } = useQuery({
    ...gameQuery(id),
    placeholderData: () => {
      const known = cachedGame(queryClient, id);
      return known ? placeholderDetail(known) : undefined;
    },
  });

  /**
   * Screenshots, trailers, the series and the stores, beside the record
   * rather than in front of it: none of them is needed before the
   * reader can start reading, so none of them gets to hold the page.
   */
  const { data: media = EMPTY_MEDIA, isPending: mediaPending } = useQuery(
    gameMediaQuery(id)
  );
  const { screenshots, trailers, series, storeLinks } = media;

  /**
   * The dwell, as on Home's stage: linger on the key art and it comes
   * to life. Both stores open on a moving trailer; here the still
   * opens, so the page has its composed picture first, and the trailer
   * arrives over it three seconds later, muted, under the same copy.
   * Keyed by frame, so a swap away and back starts the wait again.
   */
  const dwellTrailer = game ? pickTrailer(trailers, game.name) : null;
  const [dwelt, setDwelt] = useState(false);
  useEffect(() => {
    if (!dwellTrailer || !isExpanded) return;
    const timer = setTimeout(() => setDwelt(true), 3000);
    return () => {
      clearTimeout(timer);
      setDwelt(false);
    };
  }, [dwellTrailer, isExpanded]);

  /**
   * IGDB's half of the page: box art, the critic aggregate, the
   * completion split and a storyline. Missing answers are missing on
   * purpose — every consumer below falls back to the page as it was.
   */
  const { data: igdb } = useQuery({
    // v2: the persisted cache outlives shape changes — a 24h staleTime
    // happily serves yesterday's response without `similar`, and the
    // rail silently never appears. The version retires old entries.
    // v3: matching now settles on title and year, so a slug that used
    // to resolve to the wrong game of the same name has a different
    // answer - and the cached wrong one must not outlive the fix.
    // Asked the moment a slug is known — from the seeded row, when
    // there is one — so IGDB's answer travels beside RAWG's rather
    // than behind it.
    queryKey: ['igdb-extras', 'v3', game?.slug],
    queryFn: () =>
      fetchIgdbExtras(game!.slug, {
        name: game!.name,
        released: game!.released,
      }),
    enabled: Boolean(game?.slug),
    staleTime: 24 * 60 * 60 * 1000,
  });

  // What people reported finishing this in, if anyone has.
  // Held in a name of its own so the effect can depend on the whole
  // game: matching now needs its title and year, not just the slug.
  /**
   * The publisher's own title treatment, for the masthead.
   *
   * Asked by slug from the first frame — the seeded row carries the
   * name and the year — with the Steam id as a hint where anything on
   * the page already knows it. The typed name stands until it answers
   * and stays if it answers nothing.
   */
  const steamId = igdb?.steam ?? steamIdFrom(storeLinks) ?? null;
  const { data: art } = useQuery({
    ...artQuery(game ?? { name: '', released: null, slug: '' }, steamId),
    enabled: Boolean(game?.slug),
  });
  const logo = art?.logo;
  useEffect(() => {
    if (game?.slug) learnDurations([game]);
  }, [game, learnDurations]);

  // Somewhere to come back to, once the game has actually been seen.
  // See lib/recent.
  useEffect(() => {
    if (game && !sketch) rememberGame(game);
  }, [game, sketch]);

  /**
   * A staged arrival, not a curtain.
   *
   * Everything used to fade in as one sheet, which reads as a page
   * loading. Staggered — the argument first, the rail a beat behind —
   * it reads as a page being set down, and the beat tells the eye
   * where to start. One stagger only: a page that choreographs every
   * block is a page that makes you wait. Reduced motion collapses both
   * to an immediate appearance, which is that setting kept honestly.
   */
  useEffect(() => {
    if (!game) return;
    if (reducedMotion) {
      opacity.setValue(1);
      railOpacity.setValue(1);
      return;
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: DURATION.base,
      easing: EASING.standard,
      useNativeDriver: true,
    }).start();
    Animated.timing(railOpacity, {
      toValue: 1,
      duration: DURATION.base,
      delay: 140,
      easing: EASING.standard,
      useNativeDriver: true,
    }).start();
  }, [game, opacity, railOpacity, reducedMotion]);

  if (isPending && fetchStatus !== 'paused') {
    return isExpanded ? (
      <DesktopShell activeKey={null} foldByDefault flush>
        {/* The name is not known yet, but a blank tab is never right. */}
        <PageTitle>Sidequest</PageTitle>
        <View
          style={[isExpanded ? styles.skeletonShellWide : styles.skeletonShell]}
        >
          {isExpanded ? <SkeletonDetailExpanded /> : <SkeletonDetail />}
        </View>
        {/* Same join as the loaded hero: the bones run to the top of the
            document too, so they need it just as much. */}
        {!isExpanded && <ChromeWeld height={insets.top + WELD_HEIGHT} />}
        {isExpanded ? null : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton onImage />
          </View>
        )}
      </DesktopShell>
    ) : (
      <Textured style={styles.background}>
        {/* The name is not known yet, but a blank tab is never right. */}
        <PageTitle>Sidequest</PageTitle>
        {/* In the scroller, like the page it stands for: on native a
            bare View is cropped at the first fold. */}
        <Screen style={styles.skeletonShell}>
          <SkeletonDetail />
        </Screen>
        {/* Same join as the loaded hero: the bones run to the top of the
            document too, so they need it just as much. */}
        {!isExpanded && <ChromeWeld height={insets.top + WELD_HEIGHT} />}
        {isExpanded ? null : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton onImage />
          </View>
        )}
      </Textured>
    );
  }

  if (error || !game) {
    /* Offline and nothing saved: a different sentence from a failed
       request. The query is paused, not broken, and it will ask on its
       own the moment the signal comes back. */
    const offline = !error && fetchStatus === 'paused';
    return (
      <View style={styles.background}>
        <PageTitle>Sidequest</PageTitle>
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton onImage />
        </View>
        <Message
          icon="cloud-offline-outline"
          title={offline ? "You're offline" : "Couldn't load this game"}
          detail={
            offline
              ? 'This game isn’t saved on this device yet. It will load when you’re back online.'
              : friendlyError(error)
          }
        />
      </View>
    );
  }

  const summary = decodeEntities(
    game.description.replace(HTML_TAGS, '')
  ).trim();
  // On the desk the page stands in the shell's column and centres
  // itself; the gutter is the column's own, not a sum against the window.
  const gutter = isExpanded ? SPACING.xl : SPACING.md;
  const railInset = gutter;

  /**
   * A frame nearly the width of the screen, with the next one showing
   * at the edge to say the rail scrolls.
   */
  const shotWidth = Math.min(width - gutter * 2 - SPACING.xl, 460);
  const shotHeight = Math.round(shotWidth / (16 / 9));

  const mediaBlock = [
    styles.block,
    isExpanded && { paddingHorizontal: gutter },
  ];

  const openGenre = (genre: Named) => {
    if (genre.slug && findSection(genre.slug)) {
      router.push({ pathname: '/', params: { category: genre.slug } });
    }
  };

  /**
   * Pull to refresh: everything this page asked for, asked again — the
   * record, the media, IGDB's half and who is live. Cached answers stay
   * on screen while the new ones come in.
   */
  const refresh = () =>
    Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.game(id) }),
      queryClient.refetchQueries({ queryKey: queryKeys.gameMedia(id) }),
      queryClient.refetchQueries({ queryKey: ['igdb-extras'] }),
      queryClient.refetchQueries({ queryKey: ['twitch', 'streams'] }),
    ]);

  /* -------------------------------------------------------------- pieces */

  /**
   * Key art, then the trailers, then the screenshots — identity first,
   * motion second, detail last. The trailers were a rail at the foot of
   * the page, below the fold of the thing they advertise; a trailer is
   * the single best answer to "what is this like to play", so it
   * belongs in the stage with everything else that answers that.
   */
  const frames: { key: string; image: string; movie?: Movie }[] = [
    ...(game.background_image
      ? [{ key: 'art', image: game.background_image }]
      : []),
    ...trailers.slice(0, 2).map((movie) => ({
      key: `movie-${movie.id}`,
      image: movie.preview,
      movie,
    })),
    ...screenshots.map((shot) => ({ key: String(shot.id), image: shot.image })),
  ];
  /**
   * The frames the band does not already show, screenshots first.
   *
   * The phone leads with the trailer because its first frame is a
   * running player. Here a trailer is a poster until pressed, and
   * RAWG's poster for a trailer is its first frame - a fade-up from
   * black, so two trailers opened the shelf as two black boxes. The
   * band above already plays the trailer for anyone who lingers; the
   * shelf can afford to show the game first and file the films after.
   */
  const gallery = [
    ...frames.filter((frame) => frame.key !== 'art' && !frame.movie),
    ...frames.filter((frame) => frame.movie),
  ];

  /** Who made it, when, and what kind of thing it is — the art's one line. */
  const identity: { key: string; text: string; onPress?: () => void }[] = [
    ...(game.developers?.[0]?.name
      ? [{ key: 'dev', text: game.developers[0].name }]
      : []),
    ...(game.released
      ? [{ key: 'year', text: game.released.slice(0, 4) }]
      : []),
    ...(game.genres?.slice(0, 2) ?? []).map((genre) => {
      const section = genre.slug ? findSection(genre.slug) : undefined;
      return {
        key: `genre-${genre.id}`,
        text: genre.name,
        onPress: section ? () => openGenre(genre) : undefined,
      };
    }),
  ];

  /**
   * The band: the picture, the fade it sinks into, and the mark across
   * the join.
   *
   * The hero where SteamGridDB has one; RAWG's screenshot where it does
   * not. The sharp frame keeps its own proportions and is never cut —
   * see HERO_RATIO for why a wide asset cannot afford a crop — so the
   * height a masthead needs comes from underneath it instead: the same
   * art, out of focus, carrying the colour down until it becomes the
   * page. The mark sits low across that join, over the foot of the
   * sharp frame and on the soft part, where the ramp has closed enough
   * to hold type over a night city and a bleached desert alike.
   */
  /** The copy column, so the mark never runs wider than the page's text. */
  const column = Math.min(width, LAYOUT.maxContentWidth);
  /**
   * The band paints in layers, and never has none.
   *
   * It used to ask for one picture: the publisher's hero if the art
   * manifest had landed, and otherwise `background_image` raw — the
   * full-size original RAWG stores, which for one game measured 222 KB
   * and for another 3.7 MB. Two things followed from that. The reader
   * had just tapped a tile showing THIS picture, and the tile asks for
   * a derivative off the width ladder; the masthead asked for the
   * original, a different URL, so the one file already on the device
   * was the one file it would not use and the band stood empty through
   * a fresh download of a much larger one. Then when the manifest
   * landed the whole picture was replaced in place.
   *
   * The underlay is now the shelf tile's own file — a 320 slot and a
   * 640 slot both round up to the ladder's 640 rung, so this is
   * literally the request the tile already made, 85 KB and already
   * cached, painting on the first frame. Over it goes whatever is
   * genuinely better, fading in when it arrives, and the underlay is
   * never removed: there is no frame of the band with nothing in it.
   */
  const seeded = mediaUri(game.background_image, 320);
  const banded = art?.hero;
  /**
   * A sharper cut of the same screenshot, only where the band is wide
   * enough to want one. The 640 rung is 780 device pixels, which is a
   * phone's band exactly; the next rung up is 1280 and 250 KB, so on a
   * phone the second layer would be a quarter of a megabyte to sharpen
   * a picture nobody can tell apart. A desk band runs past a thousand
   * points and does want it.
   *
   * The banner itself takes its own thumb where the band is narrow: a
   * SteamGridDB hero is a 1920-wide PNG that can run to megabytes, and
   * the thumb covers a phone at two pixels a point.
   */
  const sharper =
    width > 700 ? mediaUri(game.background_image, width) : undefined;
  const banner = banded
    ? width * 2 <= 1100
      ? banded.thumb
      : banded.url
    : sharper;

  const hero = (
    <View
      style={[
        styles.hero,
        { height: bannerHeight(width, insets.top, windowHeight) },
      ]}
    >
      {seeded || banner ? (
        <Melt style={StyleSheet.absoluteFill}>
          {/* The picture the reader was looking at a moment ago, at the
              size the tile asked for it. No transition: it is a cache
              hit, and fading in something that is already there reads
              as a delay the page did not have. */}
          {seeded ? (
            <Image
              source={{ uri: seeded }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              priority="high"
              accessible={false}
              alt=""
            />
          ) : null}
          {banner && banner !== seeded ? (
            <Image
              source={{ uri: banner }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // The crop comes off the left on a real hero, where the
              // subject is hard right by convention and the left is the
              // space Steam reserves for a logo we are not putting
              // there. A screenshot standing in has no such convention,
              // and is cropped top and bottom from its middle.
              contentPosition={banded ? 'right' : 'center'}
              transition={DURATION.base}
              // The one picture the page opens on goes to the front of
              // the queue, ahead of the thumbnails below it.
              priority="high"
              accessibilityLabel={`${game.name} key art`}
              alt={`${game.name} key art`}
            />
          ) : null}
        </Melt>
      ) : (
        <Textured fill />
      )}
      {/* The scrim lights the mark and nothing else. It used to carry
          the join as well - solid page colour at the foot - and a
          colour laid over a bright picture cannot reach the page's
          colour without passing through a mix of the two, which over
          Dawnwalker's orange was a warm grey lighter than the ground it
          was about to meet. `Melt` removes the picture instead, on both
          platforms, so this ends transparent on both. */}
      <LinearGradient
        colors={[
          'rgba(20,25,35,0.44)',
          'rgba(20,25,35,0.02)',
          'rgba(31,38,52,0.30)',
          'rgba(41,49,66,0.42)',
          'rgba(51,61,81,0)',
        ]}
        locations={[0, 0.28, 0.6, 0.88, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={styles.heroGrain} />
      <ChromeWeld height={insets.top + WELD_HEIGHT} />
      {/* Centred and low, the way every title page sets a mark on its
          art. A reserved slot: the typed name paints first and the
          publisher's mark replaces it when it lands, and the masthead
          must not resize under the reader when the taller one does. */}
      <View style={[styles.mastheadCopy, { width: column }]}>
        <TitleLogo
          logo={logo}
          name={game.name}
          maxWidth={column - SPACING.lg * 2}
          maxHeight={TITLE_SLOT}
        >
          <Text
            style={[styles.heroTitle, OVER_IMAGE.heading]}
            numberOfLines={2}
          >
            {game.name}
          </Text>
        </TitleLogo>
        {/* Who made it, when, what kind - under the mark, on the art,
            as the desk sets it. It stood on the ground below in grey,
            a caption cut off from the thing it captions; here it is
            the mark's byline, and the melt has taken most of the
            picture out by the time the band reaches it. */}
        {identity.length > 0 ? (
          <Text style={styles.heroIdentity}>
            {identity.map((bit, index) => (
              <React.Fragment key={bit.key}>
                {index > 0 ? ' · ' : null}
                {bit.onPress ? (
                  <Text
                    onPress={bit.onPress}
                    suppressHighlighting
                    accessibilityRole="link"
                    accessibilityLabel={`Browse ${bit.text} games`}
                    style={styles.heroIdentityLink}
                  >
                    {bit.text}
                  </Text>
                ) : (
                  bit.text
                )}
              </React.Fragment>
            ))}
          </Text>
        ) : null}
      </View>
    </View>
  );

  /**
   * The phone's second line: the figures, then what the plan makes of
   * them, then the split HowLongToBeat built a site on — the same 74
   * hours is a different promise to someone who mainlines than to a
   * completionist. Submitted times, so it only speaks when enough
   * people have.
   */
  /**
   * How this game lands on the evenings ahead, or nothing at all.
   *
   * Worked out here rather than inside the strip: whether there is a
   * fit decides whether the section exists, and a component that
   * answers that for itself leaves the page holding an empty slot
   * between the decision and the screenshots.
   */
  const fit = fitFrom(durationOf(game).hours, openedAt);

  const figures = (
    <View style={styles.figures}>
      <InfoStrip game={game} onEditLength={() => setEditingLength(true)} />
      {/* Loose in the column rather than wrapped in a box of their own.
          Both of these decline to render for most games — a game not in
          the plan has no standing, a game with few submissions has no
          split — and a wrapper around two absent children is a gap the
          column pays for and nobody can see the cause of. Flex gaps
          count what is actually drawn. */}
      <PlanLine
        game={game}
        onOpenPlan={() => router.push('/plan')}
        pace={false}
      />
      {igdb?.times &&
      igdb.times.submissions >= 5 &&
      (igdb.times.hastily || igdb.times.completely) ? (
        <Text style={styles.splitLegend}>
          {[
            igdb.times.hastily
              ? `Rushing it ${Math.round(igdb.times.hastily)}h`
              : null,
            igdb.times.normally
              ? `Most people ${Math.round(igdb.times.normally)}h`
              : null,
            igdb.times.completely
              ? `100% ${Math.round(igdb.times.completely)}h`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </View>
  );

  /**
   * The controls, on solid ground rather than on the photograph.
   *
   * Everything used to sit on the artwork: three status pills, a primary
   * button, two more pills, the timer and the commitment row. Over a
   * bright frame — Grand Theft Auto V's key art is nearly cream — white
   * text on an outline pill is simply not readable, and no amount of
   * scrim fixes that without painting the picture out entirely. The hero
   * keeps what identifies the game; the things you press live below it,
   * where their contrast is a property of the page and not of whichever
   * image RAWG happened to return.
   */
  /**
   * The decision: what are you doing about this game.
   *
   * On a phone it is a card, because there it holds four loose
   * controls together on a long scroll — the reason it was built.
   *
   * In the rail that card was the page's last box-in-a-box.
   * `StatusActions` already carries its own border and its own filled
   * plate; wrapping it in a second bordered panel framed a frame, and
   * it did so at the head of a column where every other section — GET
   * IT, DETAILS, WHO ELSE HAS IT — sits flush under a micro label. So
   * the rail opened in one language and continued in another, which is
   * what makes it read as awkward rather than as the primary control.
   *
   * Flush, it joins the column: a label, the control that is already
   * an object, and what follows from it — and the segmented group's
   * own amber selection is what marks it as the thing you act on. The
   * frame was never what made it primary.
   */
  /**
   * A section of the file. The rail's twenty points of padding framed
   * each group against its hairline; flush on the phone, with no
   * hairlines, the same twenty read as a hole between GET IT and the
   * facts under it.
   */
  const fileSection = [
    styles.fileSection,
    !isExpanded && styles.fileSectionCompact,
  ];

  const controls = isExpanded ? (
    <View style={fileSection}>
      <Text style={styles.fileLabel}>ON YOUR SHELF</Text>
      <StatusActions game={game} />
      {/* Stacked, not a wrapping row: at 400 the button and the two
          commitment toggles wrapped into a ragged three lines that
          belonged to nothing. The action gets its own line, the
          toggles theirs. */}
      <SessionTimer game={game} block />
      <View style={styles.decisionActions}>
        <Commitment gameId={game.id} />
      </View>
    </View>
  ) : (
    <View style={styles.controls}>
      {/* Flush on the page, as the desktop rail already is; see
          Decision for why a game that is not yours yet gets one button
          rather than a three-way control with nothing chosen. */}
      <Decision game={game} />
    </View>
  );

  /**
   * The masthead, on the desk: the whole width of the sheet.
   *
   * It was a 3:1 card inside the main column with the name, the figure
   * and two lines of small print stacked in its left third - and beside
   * it, sixty points away, a box the height of the column carrying the
   * same title again. Two pictures of one game, the name twice, and the
   * decision pushed under the box to the fold. The band is now the
   * page's first object, running to the sheet's edges the way the
   * phone's does; it carries the publisher's mark and one line of
   * identity, and nothing else. The publisher's hero is composed for
   * exactly this - subject right, the left clear for a logo - so the
   * mark stands where Valve's own library puts it, and the scrim only
   * has to quieten the side the picture already left empty.
   */
  const lockupWidth = Math.min(
    520,
    Math.round((Math.min(width, PAGE_MAX) - DESK_GUTTER * 2) * 0.5)
  );
  const deskHero = (
    <View
      style={[
        styles.deskMasthead,
        { maxHeight: deskBandCeiling(windowHeight) },
      ]}
    >
      {seeded || banner ? (
        <Melt style={StyleSheet.absoluteFill}>
          {seeded ? (
            <Image
              source={{ uri: seeded }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              priority="high"
              accessible={false}
              alt=""
            />
          ) : null}
          {banner && banner !== seeded ? (
            <Image
              source={{ uri: banner }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition={banded ? 'right' : 'center'}
              transition={DURATION.base}
              priority="high"
              accessibilityLabel={`${game.name} key art`}
              alt={`${game.name} key art`}
            />
          ) : null}
          {/* Linger and it comes to life, as Home's stage does: the
              composed still first, the trailer over it three seconds
              later, muted, under the same mark. Cropped to the band
              rather than letterboxed into it - a trailer's middle is
              where its action is, and this is a masthead, not a
              player; the gallery below has the frame that plays whole. */}
          {dwelt && dwellTrailer ? (
            <StageTrailer key={dwellTrailer.id} movie={dwellTrailer} />
          ) : null}
        </Melt>
      ) : (
        <Textured fill />
      )}
      {/* Sideways, not down. The Melt already takes the picture out at
          the foot; what the mark needs is the left third quietened, and
          a left-to-right ramp leaves the subject on the right untouched
          - the half of the picture the picture is of. */}
      <LinearGradient
        colors={[
          'rgba(14,18,27,0.72)',
          'rgba(14,18,27,0.40)',
          'rgba(14,18,27,0.08)',
          'rgba(14,18,27,0)',
        ]}
        locations={[0, 0.24, 0.52, 0.7]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={styles.heroGrain} />
      {/* On the columns' grid: the mark's left edge is the figure's and
          the prose's, so the band and the page below it are one layout
          rather than a picture with a page under it. */}
      <View style={styles.deskLockup}>
        <TitleLogo
          logo={logo}
          name={game.name}
          maxWidth={lockupWidth}
          maxHeight={DESK_MARK}
          align="start"
        >
          <Text style={styles.deskTitle} numberOfLines={2}>
            {game.name}
          </Text>
        </TitleLogo>
        {identity.length > 0 ? (
          <Text style={styles.deskIdentity}>
            {identity.map((bit, index) => (
              <React.Fragment key={bit.key}>
                {index > 0 ? ' · ' : null}
                {bit.onPress ? (
                  <Text
                    onPress={bit.onPress}
                    suppressHighlighting
                    accessibilityRole="link"
                    accessibilityLabel={`Browse ${bit.text} games`}
                    style={styles.deskIdentityLink}
                  >
                    {bit.text}
                  </Text>
                ) : (
                  bit.text
                )}
              </React.Fragment>
            ))}
          </Text>
        ) : null}
      </View>
    </View>
  );

  /**
   * The argument, at the head of the column and on the ground.
   *
   * The figure used to stand on the picture under the mark, with the
   * split and its source as two grey lines beneath - four registers in
   * the left third of a photograph. On the page's own colour the hours
   * lead, the pace answers them, and the split stands beside them as
   * cells rather than a sentence: three figures over three labels, read
   * across the way the phone's strip is, so the same 35 hours is
   * visibly a different promise to someone who mainlines than to a
   * completionist. Under a rule, because this is the head of the page
   * and what follows is a different kind of thing.
   */
  const split =
    igdb?.times &&
    igdb.times.submissions >= 5 &&
    (igdb.times.hastily || igdb.times.completely)
      ? igdb.times
      : null;
  const splitCells: { label: string; hours: number }[] = split
    ? [
        { label: 'Rushing it', hours: split.hastily ?? 0 },
        { label: 'Most people', hours: split.normally ?? 0 },
        { label: 'Completionist', hours: split.completely ?? 0 },
      ].filter((cell) => cell.hours > 0)
    : [];
  const figuresWide = (
    <View style={styles.deskFigures}>
      <View style={styles.deskFiguresLead}>
        <StatStrip
          game={game}
          onGround
          onEditLength={() => setEditingLength(true)}
          onOpenPlan={() => router.push('/plan')}
        />
      </View>
      {split ? (
        <View style={styles.splitBlock}>
          <View style={styles.strip}>
            {splitCells.map((cell, index) => (
              <View
                key={cell.label}
                style={[
                  styles.stripCell,
                  styles.splitCell,
                  index > 0 && styles.stripCellRule,
                ]}
              >
                {/* Whole hours: 119.3 promises a precision 68
                    submissions cannot keep. */}
                <Text style={styles.stripValue}>{Math.round(cell.hours)}h</Text>
                <Text style={styles.stripLabel}>{cell.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.splitSource}>
            {split.submissions} players, via IGDB
          </Text>
        </View>
      ) : null}
    </View>
  );

  const yourTake = hasNote ? (
    <View style={styles.block}>
      <PersonalNote gameId={game.id} />
    </View>
  ) : null;

  /**
   * No heading. "About" was a label stating the obvious — the only
   * prose on a page about one game does not need to announce that it
   * is about the game, and Epic runs its description with no header
   * for the same reason. The paragraph opens with its own first
   * sentence, which is a better introduction than a label, and the
   * heading register now belongs to the sections that genuinely need
   * naming: the verdict, the series.
   */
  const prose = summary || igdb?.storyline?.trim() || '';
  const about = prose ? (
    <View style={styles.block}>
      {/* At reading size. This is the only prose on the page and it was
          set two steps below the app's body copy, so the one block
          somebody actually reads was the smallest text on the screen. */}
      <ReadMoreText
        style={[
          TYPE.body,
          styles.aboutText,
          isExpanded && styles.aboutTextWide,
        ]}
        numberOfLines={isExpanded ? 8 : 6}
      >
        {prose}
      </ReadMoreText>
    </View>
  ) : null;

  /**
   * What shows you the game, and what comes after it.
   *
   * The phone ran hero → controls → About → verdict → screenshots →
   * trailers, so the two assets that answer "what is this actually
   * like" sat at 1182 and 1442 of a 3562pt page — below the argument
   * they are evidence for. The desktop fixed this by making them the
   * stage; the phone has no room for a stage, but it can put them
   * where the stage is: straight after the controls.
   *
   * Live streams and the series stay at the foot. They are about other
   * things — other people playing, other games — so they belong after
   * this game has been dealt with.
   */

  /**
   * The evidence, in one carousel under the decision.
   *
   * Trailers first because motion answers "what is this like to play"
   * better than a still, and the first one is already running when the
   * page settles — the masthead above carries identity, so this
   * section has nothing to introduce and can get straight to showing.
   * Everything at nearly the screen's width, snapped to the frame
   * pitch so a thumb-flick never parks between two pictures.
   */
  const mediaStage = isExpanded ? null : mediaPending ? (
    /* The rail's bones, so the page keeps its rhythm while the
       screenshots are still on their way rather than growing a section
       under the reader's thumb when they land. */
    <View style={mediaBlock}>
      <View style={styles.mediaBones}>
        <Skeleton style={{ width: shotWidth, height: shotHeight }} />
        <Skeleton style={{ width: shotWidth, height: shotHeight }} />
      </View>
    </View>
  ) : gallery.length === 0 ? null : (
    /* No heading.
     *
     * "What it looks like" over a row of screenshots states what the
     * screenshots are already saying, and the count above it was
     * inventory — a reader can see how many there are by pushing them.
     * It is the same argument the description won when its "About"
     * came off: the only prose on a page about one game does not need
     * a label announcing that it is about the game. The pictures follow
     * the masthead's picture, which is a better join than a title bar
     * between them.
     *
     * Named for assistive tech, where the pictures are not
     * self-evident and a row of images with no context is a worse
     * experience than a heading nobody sees.
     */
    <View
      style={mediaBlock}
      accessibilityRole="summary"
      accessibilityLabel={`${gallery.length} screens and trailers`}
    >
      {/* The desk's order and the desk's frames: the screenshots, then
          the trailers as named posters that open in the lightbox. The
          first trailer used to be a live player at the head of the
          rail, which on a phone's browser is a black box wearing the
          platform's own controls - a play bar, 0:00, a mute glyph -
          until autoplay is allowed, and it is not always allowed. */}
      <Rail<(typeof frames)[number]>
        data={gallery}
        keyExtractor={(item) => item.key}
        inset={railInset}
        gap={SPACING.sm}
        snapInterval={shotWidth + SPACING.sm}
        renderItem={(item) =>
          item.movie ? (
            <Pressable
              onPress={() => setPlaying(item.movie?.id ?? null)}
              accessibilityRole="button"
              accessibilityLabel={`Play the trailer ${item.movie.name}`}
            >
              <Image
                source={{ uri: mediaUri(item.image, 640) }}
                style={[
                  styles.screenshot,
                  { width: shotWidth, height: shotHeight },
                ]}
                contentFit="cover"
                transition={DURATION.base}
              />
              <View style={styles.posterPlay}>
                <Ionicons name="play" size={22} color={COLORS.navy} />
              </View>
              <Text style={styles.frameCaption} numberOfLines={1}>
                {item.movie.name}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setLightboxUri(item.image)}>
              <Image
                source={{ uri: mediaUri(item.image, 640) }}
                style={[
                  styles.screenshot,
                  { width: shotWidth, height: shotHeight },
                ]}
                contentFit="cover"
                transition={DURATION.base}
              />
            </Pressable>
          )
        }
      />
    </View>
  );

  const mediaTail = (
    <>
      {/* Below the trailers on purpose. A trailer is what the publisher
          wants this game to look like; a live stream is what it looks
          like. Renders nothing when nobody is live, when Twitch has no
          such category, or when the deployment has no Twitch keys — so
          it can never be the reason this page looks unfinished. */}
      <LiveStreams game={game.name} style={mediaBlock} inset={railInset} />

      {/* IGDB's graph, beside RAWG's series: the series answers "what
          else is THIS", similar answers "what else is LIKE this" —
          different questions, and the second one is the one a person
          who finished the game is actually asking. */}
      {(igdb?.similar?.length ?? 0) > 0 &&
        (isExpanded ? (
          <View style={mediaBlock}>
            <Shelf
              title="More like this"
              data={igdb!.similar}
              keyExtractor={(item) => item.slug}
              renderItem={(item) => (
                <Pressable
                  onPress={() => router.push(`/game/${item.slug}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${item.name}`}
                  style={styles.similarCard}
                >
                  <Image
                    source={{ uri: igdbCoverUri(item.cover) }}
                    style={styles.similarCover}
                    contentFit="cover"
                    transition={DURATION.base}
                  />
                  <Text style={styles.similarName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : (
          <View style={mediaBlock}>
            <SectionHeader
              title="More like this"
              eyebrow="Similar games, via IGDB"
            />
            <Rail<{ slug: string; name: string; cover: string }>
              data={igdb!.similar}
              keyExtractor={(item) => item.slug}
              inset={railInset}
              renderItem={(item) => (
                <Pressable
                  onPress={() => router.push(`/game/${item.slug}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${item.name}`}
                  style={styles.similarCard}
                >
                  <Image
                    source={{ uri: igdbCoverUri(item.cover) }}
                    style={styles.similarCover}
                    contentFit="cover"
                    transition={DURATION.base}
                  />
                  <Text style={styles.similarName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ))}

      {series.length > 0 && (
        <View style={mediaBlock}>
          {isExpanded ? (
            <Shelf
              title="More in this series"
              data={series}
              keyExtractor={(item) => String(item.id)}
              renderItem={(item) => (
                <Pressable
                  onPress={() => router.push(`/game/${item.id}`)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${item.name}`}
                  style={styles.seriesCard}
                >
                  <Image
                    source={{ uri: mediaUri(item.background_image, 400) }}
                    style={styles.seriesCover}
                    contentFit="cover"
                    transition={DURATION.base}
                  />
                  <Text style={styles.similarName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.seriesMeta}>
                    {[
                      item.released?.slice(0, 4),
                      item.rating > 0 ? `★ ${item.rating.toFixed(1)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Pressable>
              )}
            />
          ) : (
            <>
              <SectionHeader
                title="More in this series"
                eyebrow={`${series.length} more ${series.length === 1 ? 'game' : 'games'}`}
              />
              {/* Posters, like the rail above it: two shelves of other
                  games on one band should be shelved the same way, and
                  the wide card with the forty-point corners was a third
                  grammar for one idea. */}
              <Rail<Game>
                data={series}
                keyExtractor={(item) => String(item.id)}
                inset={railInset}
                renderItem={(item) => <GameTile game={item} width={132} />}
              />
            </>
          )}
        </View>
      )}
    </>
  );

  /**
   * The finding, then the evidence.
   *
   * Four bars and a count is data; it leaves the reader to work out
   * what it says. The heading's eyebrow now carries the conclusion —
   * the way the Plan's does — so the section can be read at a glance
   * and studied only if you want to.
   */
  /**
   * The community counts, filed under the verdict rather than the rail.
   *
   * "Who else has it" is not something you act on — it is evidence for
   * what the players concluded, and it sat in the actions column only
   * because the phone's crate holds everything. Beside the verdict the
   * two say one thing: this is what people did with it, and this is
   * what they thought. The rail keeps to its purpose: decide, acquire.
   */
  /**
   * The finishing rate — the verdict this app can give and no store can.
   *
   * "92% recommended" is RAWG's opinion of the game. It says nothing
   * about the thing this whole app is built on, which is whether a
   * game is a good use of the hours it asks for. Beaten against owned
   * is exactly that, out of the same payload that was already sitting
   * in the rail as trivia: of the people who have it, this many
   * reached the credits.
   *
   * Coloured on the app's own semantics rather than a curve — mint is
   * time well spent, amber is a maybe, coral is a shelf. And it is
   * only claimed where the sample can carry it: under a few hundred
   * owners the ratio is noise wearing a percentage.
   */
  const finishRate = finishRateOf(game);

  const hasRatings = (game.ratings?.length ?? 0) > 0;

  /**
   * The community counts, filed under the verdict on every width.
   *
   * On the phone they lived in the crate, three screens below the
   * ratings they are evidence for. Beside the verdict the two say one
   * thing: this is what people did with it, and this is what they
   * thought. The crate keeps to its purpose: where to get it, who made
   * it, what it runs on.
   */
  const whoElse = game.added_by_status ? (
    <View style={[styles.whoElseRow, !hasRatings && styles.whoElseFirst]}>
      <Text style={styles.fileLabel}>WHO ELSE HAS IT</Text>
      <CommunityStats status={game.added_by_status} />
    </View>
  ) : null;

  const finish = finishRate ? (
    <View style={styles.finishRow}>
      <Text style={[styles.finishFigure, { color: finishRate.tint }]}>
        {finishRate.pct}%
      </Text>
      <Text style={styles.finishLabel}>
        of the people who own it reached the credits
      </Text>
    </View>
  ) : null;

  const verdict = (
    <>
      {hasRatings ? <RatingsBreakdown ratings={game.ratings!} /> : null}
      {finish}
      {whoElse}
    </>
  );

  const ratingCount = (game.ratings ?? []).reduce((sum, r) => sum + r.count, 0);
  /**
   * The phone's verdict: two figures, the shape, one line of counts.
   *
   * The share who recommend it and the share who finished it are the
   * two numbers this section exists for - what people thought, and
   * whether they stayed - so they stand side by side at the same size,
   * each in its own colour. The bars under them are the shape of the
   * first figure. The community counts, which were a two-by-two grid of
   * icons taking a third of a screen, are one sentence: they are
   * context for the figures, not figures of their own.
   */
  const liked = (game.ratings ?? [])
    .filter((r) => r.title === 'exceptional' || r.title === 'recommended')
    .reduce((sum, r) => sum + r.count, 0);
  const likedShare =
    ratingCount > 0 ? Math.round((liked / ratingCount) * 100) : 0;
  const likedTint =
    likedShare >= 70
      ? COLORS.mint
      : likedShare >= 45
        ? COLORS.accent
        : COLORS.coral;
  const community = game.added_by_status
    ? (
        [
          ['playing', 'playing now'],
          ['beaten', 'beaten it'],
          ['dropped', 'put it down'],
          ['toplay', 'want to play'],
          ['owned', 'own it'],
        ] as const
      )
        .filter(([key]) => (game.added_by_status?.[key] ?? 0) > 0)
        .map(
          ([key, word]) =>
            `${compact(game.added_by_status?.[key] ?? 0)} ${word}`
        )
        .join(' · ')
    : '';
  const said = verdictLine({
    liked: hasRatings ? likedShare : null,
    finished: finishRate?.pct ?? null,
    hours: durationOf(game).hours,
  });
  const verdictCompact = (
    <>
      {/* The sum the page used to leave to the reader. Two shares side
          by side are two facts; what they mean together — loved and
          finished, or loved and put down — is the only thing anybody
          wants from this section, and it is the one thing a histogram
          cannot say. */}
      {said ? <Text style={styles.said}>{said}</Text> : null}
      {hasRatings || finishRate ? (
        <View style={styles.verdictFigures}>
          {hasRatings ? (
            <View style={styles.verdictCell}>
              <Text style={[styles.verdictFigure, { color: likedTint }]}>
                {likedShare}%
              </Text>
              <Text style={styles.verdictLabel}>recommend it</Text>
            </View>
          ) : null}
          {finishRate ? (
            <View
              style={[styles.verdictCell, hasRatings && styles.verdictCellRule]}
            >
              <Text style={[styles.verdictFigure, { color: finishRate.tint }]}>
                {finishRate.pct}%
              </Text>
              <Text style={styles.verdictLabel}>reached the credits</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {hasRatings ? (
        <RatingsBreakdown ratings={game.ratings!} lead={false} />
      ) : null}
      {community ? <Text style={styles.community}>{community}</Text> : null}
    </>
  );
  const ratingsBreakdown =
    hasRatings || whoElse ? (
      <View style={styles.block}>
        {/* Flush on both widths. The phone kept this in a card, which
            made it one of three framed things on the page - the verdict
            in a raised plate, the reader's note in a navy one, the file
            in a third - three container languages on one scroll. A 34pt
            "92%" needs no crate to read as a finding; the eyebrow says
            where the numbers came from, and the one frame left on the
            page is the reader's own note. */}
        <SectionHeader
          wide={isExpanded}
          title="Player verdict"
          eyebrow={
            hasRatings
              ? `${ratingCount.toLocaleString()} ratings on RAWG`
              : 'Who else has it'
          }
        />
        {isExpanded ? verdict : verdictCompact}
      </View>
    ) : null;

  /**
   * The file: everything you look up rather than read.
   *
   * Where to get it, who else has it, who made it and what it is tagged
   * were four sections with four headings, each the same weight as
   * About and Player verdict — which are arguments, not lookups. A
   * feature does not give its fact box four headlines. One frame, rules
   * inside, and labels at the size of labels.
   */
  const hasLinks =
    (storeLinks.length > 0 && game.stores?.length) || Boolean(game.website);

  /**
   * The file, and where the tags left it.
   *
   * All of it stacks in one framed object on a phone. On a desktop the
   * lookups sit in a 360pt rail, which suits chips and label-and-value
   * rows but not a cloud of two dozen tags — so the tags used to be
   * lifted out into a full-width band under both columns, with the
   * platform list beside them to keep the band from being one lonely
   * half. That band printed the platform list a second time, four
   * hundred points under the first, and stood a tag cloud six rows
   * deep in the narrow track while a single comma list held the wide
   * one.
   *
   * The tags now follow the prose in the main column, which is where
   * the phone has always filed them and the only place they read as
   * what they are: the description's index. The rail keeps the spec
   * sheet, once.
   */
  /**
   * The evidence: what it is like to play, in frames that open.
   *
   * The desk had a stage - one lead frame with a strip of six under it
   * - and the lead was the key art, so the strip's first thumb stood
   * "selected" showing a screenshot the lead did not: a viewer with
   * nothing in it to view, under a masthead that had already shown the
   * art. Now the band above IS the art, and this is a shelf of the
   * things the band is not: trailers first, because motion answers the
   * question better than a still, then the screenshots, two to a row
   * with a third peeking, each opening full size. Paged by the same
   * chevrons every other row on this page is.
   */
  const frameWidth =
    columnWidth > 0 ? Math.round((columnWidth - SPACING.md) * 0.46) : 300;
  const deskGallery = !isExpanded ? null : mediaPending ? (
    /* The shelf's bones, so the page keeps its rhythm while the frames
       are on their way rather than growing a section under the reader. */
    <View style={styles.block}>
      <Skeleton style={styles.frameHeading} />
      <View style={styles.mediaBones}>
        <Skeleton style={[styles.frameBone, { width: frameWidth }]} />
        <Skeleton style={[styles.frameBone, { width: frameWidth }]} />
      </View>
    </View>
  ) : gallery.length > 0 ? (
    <Shelf
      title="Screenshots & trailers"
      data={gallery}
      keyExtractor={(frame) => frame.key}
      renderItem={(frame) => (
        <Pressable
          onPress={() =>
            frame.movie
              ? setPlaying(frame.movie.id)
              : setLightboxUri(frame.image)
          }
          accessibilityRole="button"
          accessibilityLabel={
            frame.movie
              ? `Play the trailer ${frame.movie.name}`
              : 'Open this image full size'
          }
          style={[styles.frame, { width: frameWidth }]}
        >
          <Image
            source={{ uri: mediaUri(frame.image, 640) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={DURATION.base}
          />
          {frame.movie ? (
            <>
              <View style={styles.posterPlay}>
                <Ionicons name="play" size={22} color={COLORS.navy} />
              </View>
              {/* Named, because the poster frame is usually black and a
                  black box with a play glyph could be a broken image.
                  The name says it is a film, and which. */}
              <Text style={styles.frameCaption} numberOfLines={1}>
                {frame.movie.name}
              </Text>
            </>
          ) : null}
        </Pressable>
      )}
    />
  ) : null;

  const fileGetIt = hasLinks ? (
    <View style={fileSection}>
      <Text style={styles.fileLabel}>GET IT</Text>
      <StoreLinks
        stores={game.stores}
        links={storeLinks}
        website={game.website}
        list={isExpanded}
      />
    </View>
  ) : null;

  const platformNames = game.platforms
    ?.map(({ platform }) => platform.name)
    .join(', ');

  const fileDetails = (
    <View style={fileSection}>
      {/* No label of its own: "Details" above already names this, and
          FACTS over PLATFORMS was a label under a label. */}
      <FactGrid
        facts={[
          {
            label: 'Platforms',
            wide: true,
            node: platformNames ? (
              <View style={styles.platformFact}>
                {/* The glyphs the tiles already speak, then the full
                    list: a glance and a lookup in one row. */}
                {game.parent_platforms && game.parent_platforms.length > 0 ? (
                  <PlatformIcons
                    platforms={game.parent_platforms}
                    size={14}
                    color={COLORS.lightGrey}
                  />
                ) : null}
                <Text style={styles.metaValue}>{platformNames}</Text>
              </View>
            ) : null,
          },
          {
            label: 'Release date',
            value: game.released ? calendarDate(game.released) : null,
          },
          {
            label:
              game.developers && game.developers.length > 1
                ? 'Developers'
                : 'Developer',
            value: game.developers?.map((d) => d.name).join(', '),
          },
          {
            label:
              game.publishers && game.publishers.length > 1
                ? 'Publishers'
                : 'Publisher',
            value: game.publishers?.map((d) => d.name).join(', '),
          },
          { label: 'Rated', value: game.esrb_rating?.name },
          // The official site is a link under GET IT; printed again
          // here as text it was the same address twice, once dead.
        ]}
      />
    </View>
  );

  /**
   * The short facts, as the rail's quiet lower half.
   *
   * Steam fills its rail with reference material under the actions and
   * it reads as a column with a job; ours pinned two short groups and
   * scrolled sparse. These are the facts that fit a 400pt track — label
   * and value, a line or two each, and the whole spec sheet in one
   * place. Platforms also had a home in a full-width band under the
   * columns, which meant a game on eight of them printed the same
   * comma list twice on one screen, four hundred points apart.
   */
  const fileFacts = isExpanded ? (
    <View style={fileSection}>
      <Text style={styles.fileLabel}>DETAILS</Text>
      {/* The identity line, moved out of the masthead. Genre, the star
          rating and the metascore are lookup facts, not the page's
          argument — in the masthead they were a fourth register in a
          block that only needs three: name, figure, rule. */}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Genre & rating</Text>
        <View style={styles.railMetaLine}>
          {game.genres?.slice(0, 2).map((genre) => (
            <Text key={genre.id} style={styles.metaValue}>
              {genre.name}
            </Text>
          ))}
          {game.rating > 0 ? (
            <Text style={styles.metaValue}>★ {game.rating.toFixed(1)}</Text>
          ) : null}
          {game.metacritic != null ? (
            <ScorePill score={game.metacritic} />
          ) : null}
        </View>
      </View>
      {game.released ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Release date</Text>
          <Text style={styles.metaValue}>{calendarDate(game.released)}</Text>
        </View>
      ) : null}
      <MetaRow
        label="Platforms"
        items={game.platforms?.map(({ platform }) => platform)}
      />
      <MetaRow label="Developers" items={game.developers} />
      <MetaRow label="Publishers" items={game.publishers} />
      {game.esrb_rating?.name ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Rated</Text>
          <Text style={styles.metaValue}>{game.esrb_rating.name}</Text>
        </View>
      ) : null}
    </View>
  ) : null;

  /**
   * The chips, with no label and no padding of their own.
   *
   * No label, in either layout: they follow the prose on both, and
   * there they are the description's index — a reader who has just
   * read the sentence does not need a heading to be told that
   * "Atmospheric" and "Story Rich" describe it. And no `fileSection`
   * wrapper any more: that padding is what separates the crate's
   * sections from each other, and out here it was twenty points the
   * block's own margin had already paid for, so the tags sat looser
   * from the prose than any two blocks on the page.
   */
  const fileTags =
    game.tags && game.tags.length > 0 ? (
      <View style={styles.tags}>
        {game.tags.slice(0, isExpanded ? 14 : 10).map((tag) => (
          <Chip key={tag.id} title={tag.name} quiet />
        ))}
      </View>
    ) : null;

  /**
   * The rule between sections belongs to the join, not to the section,
   * so the last one in whichever box it lands in loses it. Applied here
   * rather than hard-coded on Tags, which is only last in one of the
   * two arrangements.
   */
  /**
   * On a phone the file is a crate: one framed object holding four
   * labelled sections, which is how a small screen keeps a lookup
   * table from dissolving into the page. On the wide page the crate
   * was the awkwardness — a bordered panel beside an unframed prose
   * column, holding tiles that were themselves bordered, three
   * container languages on one screen. The rail's width already does
   * the crate's job there, so the sections sit flush on the ground
   * with their eyebrows and hairlines, the same treatment the main
   * column gets, and the decision keeps the page's one card to
   * itself.
   */
  const framed = (sections: React.ReactNode[]) => {
    const present = sections.filter(Boolean);
    return (
      <View style={styles.fileFlat}>
        {/* The rule lives on this wrapper, not on the section inside
            it: an override on a parent never reaches a child's border,
            which is how the last section kept a stray hairline under
            it — the one line on the page that ruled off nothing. The
            phone draws no joins at all: flush, a hairline between GET
            IT and the facts is a divider between sections, and the
            spec sheet's own row rules already carry the table. */}
        {present.map((section, index) => (
          <View
            key={index}
            style={[
              isExpanded && styles.fileJoin,
              index === present.length - 1 && styles.fileSectionLast,
            ]}
          >
            {section}
          </View>
        ))}
      </View>
    );
  };

  /**
   * The app's own answer, beside the decision it informs: how the game
   * lands on the evenings the reader actually has. The desk never
   * showed it - the one section that is this app rather than a database
   * - and the phone puts it directly under the controls for the reason
   * it sits here. Absent for a game of unknown length, and then the
   * slot is absent too.
   */
  const fileFit =
    isExpanded && fit ? (
      <View style={fileSection}>
        <FitStrip fit={fit} now={openedAt} />
      </View>
    ) : null;

  const fileBox = (
    <View style={styles.block}>
      {/* On the phone the crate needs a name. On the wide page the
          rail's register is the micro label — GET IT, WHO ELSE HAS IT —
          and a heading above them was a second voice saying nothing
          the labels don't: two label registers inside 100pt. */}
      {/* No eyebrow. It read "WHERE TO GET IT, WHO MADE IT" directly
          above a label reading "GET IT" — the same words twice, in two
          sizes, four points apart. The labels inside the file already
          say what each group is; the heading only has to name the
          file. */}
      {!isExpanded && <SectionHeader title="Details" />}
      {framed(
        isExpanded
          ? [controls, fileFit, fileGetIt, fileFacts]
          : [fileGetIt, fileDetails]
      )}
    </View>
  );

  /**
   * What stands in for the body while the page is on a seeded row.
   *
   * The masthead and the decision are real — they are built from what
   * the tile knew — so only the parts the record supplies wait: the
   * prose, the verdict, the file. Prose sets solid, the way text does.
   */
  const bones = (
    <View style={styles.block}>
      <View style={styles.bonesProse}>
        <Skeleton style={styles.bonesLine} />
        <Skeleton style={styles.bonesLine} />
        <Skeleton style={styles.bonesLine} />
        <Skeleton style={styles.bonesLineShort} />
      </View>
      <Skeleton style={styles.bonesHeading} />
      <Skeleton style={styles.bonesVerdict} />
    </View>
  );

  /* -------------------------------------------------------------- layout */

  const page = (
    <>
      <PageTitle>{`${game.name} — Sidequest`}</PageTitle>
      <View style={styles.container}>
        {isExpanded ? null : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton onImage />
          </View>
        )}

        <Screen onRefresh={refresh}>
          <View
            style={[
              // The last block already leaves its own margin, so this
              // is what goes on top of it. Forty-eight there was a void
              // before the footer's shore on the phone, and the same
              // forty-eight was still standing on the desk, where the
              // shore is wider and the emptiness reads longer.
              { paddingBottom: isExpanded ? SPACING.lg : SPACING.xs },
            ]}
          >
            {isExpanded ? (
              <View style={styles.expandedInner}>
                {deskHero}
                <Animated.View style={[styles.twoColumn, { opacity }]}>
                  <View
                    style={styles.columnMain}
                    onLayout={(event) =>
                      setColumnWidth(event.nativeEvent.layout.width)
                    }
                  >
                    {figuresWide}
                    {/* The phone's order: the figures, the frames, then
                        the prose - one design at two widths. */}
                    {deskGallery}
                    {sketch ? (
                      bones
                    ) : (
                      <>
                        {yourTake}
                        {about}
                        {/* After the prose they annotate, the same
                            place the phone files them. */}
                        {game.tags && game.tags.length > 0 ? (
                          <View style={styles.block}>{fileTags}</View>
                        ) : null}
                        {ratingsBreakdown}
                      </>
                    )}
                  </View>
                  {/* What you do about the game, then what the game is.
                      Both store pages put the action beside the media
                      rather than under the title, and they are right:
                      a decision is something you come back to, so it
                      wants a column rather than a line in a masthead
                      you have already scrolled past. */}
                  <Animated.View
                    style={[styles.columnRail, { opacity: railOpacity }]}
                  >
                    {fileBox}
                  </Animated.View>
                </Animated.View>
                {/* media escapes the column: full-bleed rails, gutter-aligned */}
                <Animated.View style={[styles.deskTail, { opacity }]}>
                  {mediaTail}
                </Animated.View>
              </View>
            ) : (
              <>
                {hero}
                {figures}
                {controls}
                {/* The app's own answer, and the reason this page is
                    not a database entry: how the game lands on the
                    evenings the reader actually has. Absent for a game
                    of unknown length — and then the slot is absent too,
                    rather than standing empty between the decision and
                    the screenshots. */}
                {fit ? (
                  <View style={styles.fitSlot}>
                    <FitStrip fit={fit} now={openedAt} />
                  </View>
                ) : null}
                <Animated.View style={[styles.compactBody, { opacity }]}>
                  {/* The case, then the reader's own note on it, then
                      the file. "Your take" used to sit second on the
                      page, directly under the controls, where for any
                      game you have not played it is an empty box in the
                      most valuable position on the screen. It is a
                      response, so it follows what it responds to. */}
                  {mediaStage}
                  {sketch ? (
                    bones
                  ) : (
                    <>
                      {about}
                      {/* Tags right after the prose, as Steam files
                          them: they are the description's index, not
                          archive material — and they were three
                          screens deep in the crate. */}
                      {game.tags && game.tags.length > 0 ? (
                        <View style={styles.block}>{fileTags}</View>
                      ) : null}
                      {ratingsBreakdown}
                      {yourTake}
                      {/* The file, on a band of its own. The page has
                          two halves - the case for the game, then the
                          record of it - and they met on nothing: the
                          reader's note, then GET IT, then a cover
                          rail, one colour throughout. The record now
                          stands on the step below the page, entered
                          over the same shoreline the footer uses to
                          leave it, so the page reads as story, then
                          file, then shore. */}
                      <View style={styles.bandBleed}>
                        <Seam variant="wave" color={COLORS.surface} index={1} />
                        <View style={styles.band}>
                          {fileBox}
                          {mediaTail}
                        </View>
                      </View>
                    </>
                  )}
                </Animated.View>
              </>
            )}
          </View>

          <SiteFooter />
        </Screen>
        <DurationSheet
          game={editingLength ? game : null}
          duration={editingLength ? durationOf(game) : null}
          onClose={() => setEditingLength(false)}
        />
        <Lightbox
          uri={lightboxUri}
          movie={trailers.find((t) => t.id === playing) ?? null}
          onClose={() => {
            setLightboxUri(null);
            setPlaying(null);
          }}
        />
      </View>
    </>
  );
  return isExpanded ? (
    <DesktopShell activeKey={null} foldByDefault flush>
      {page}
    </DesktopShell>
  ) : (
    <Textured style={styles.background}>{page}</Textured>
  );
}

const styles = StyleSheet.create({
  // flexGrow + auto basis: wraps tall content, still fills 100dvh when short.
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  container: { flexGrow: 1 },
  /** The shell's padding, inside the scroller: the atmosphere behind
      the head of the page reaches the sheet's edges instead of being
      cut at the scroll box. */
  /**
   * A plate, because this one floats over a page that scrolls under it.
   *
   * On every other screen the back button sits over a fixed header. Here
   * it is pinned above eight hundred points of scrolling content, so
   * halfway down the page a bare white chevron was landing on top of
   * "Read More", "Screenshots" and "Community" — two glyphs sharing the
   * same pixels, both illegible. A disc of the app's own plate colour
   * makes it a button rather than a mark on whatever passes beneath.
   */
  backButton: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 30,
    // No chrome of its own: the pill belonged to the chevron it used
    // to hold, and the brand lockup that stands here in a browser is a
    // wordmark, not a button — a wordmark in a box is a sticker. The
    // chevron carries its own pill now, where only the installed app
    // sees it.
  },

  // hero
  hero: { width: '100%', overflow: 'hidden', justifyContent: 'flex-end' },
  /** The mark, centred and low, across the join. */
  mastheadCopy: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    minHeight: TITLE_SLOT,
    justifyContent: 'flex-end',
    gap: SPACING.sm + 2,
  },
  heroGrain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  controls: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    gap: SPACING.sm + 2,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  decisionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },

  /**
   * The strip: equal cells, a figure over a label, hairlines between.
   * It is the phone's second line, standing on the page's own colour
   * rather than on the artwork.
   */
  figures: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm + 2,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stripTight: { justifyContent: 'center' },
  /*
   * Two styles that never meet, rather than one overriding the other.
   *
   * This was `stripCell` carrying `flex: 1` with `stripCellTight`
   * layering `flexGrow: 0` and `flexBasis: 'auto'` over the top of it,
   * and a comment explaining that `flex: 0` sets a basis of ZERO in
   * React Native and would collapse the cell. The comment was right
   * about the trap and wrong about having escaped it: a flattened style
   * holding `flex` AND `flexGrow` AND `flexBasis` is three inputs to
   * one Yoga node, and the web and the phone did not resolve them the
   * same way. On the phone the cells took no width at all — so the
   * figures were clipped to nothing and the only thing left on screen
   * was cell two's left border: a stray hairline standing between the
   * meta line and the button, on any game with fewer than three facts.
   *
   * There is nothing to resolve now. The spread cell grows; the tight
   * cell does not and is never told to.
   */
  stripCellSpread: { flex: 1, paddingHorizontal: SPACING.xs },
  stripCellTight: { paddingHorizontal: SPACING.xl },
  stripCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: SPACING.sm,
  },
  stripCellRule: { borderLeftWidth: 1, borderLeftColor: COLORS.strokeStrong },
  stripValue: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: COLORS.lightGrey,
  },
  stripLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stripLabel: {
    ...TYPE.tag,
    fontSize: 10,
    letterSpacing: 0.8,
    color: COLORS.mediumGrey,
  },
  /** The fit strip stands in the page's own column, under the decision. */
  fitSlot: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  heroTitle: {
    ...TYPE.display,
    color: COLORS.white,
    textAlign: 'center',
  },
  /** The mark's byline, on the art: light, with the contact shadow the
      rest of the over-image type wears. */
  heroIdentity: {
    ...TYPE.labelSmall,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
    textAlign: 'center',
  },
  heroIdentityLink: { color: COLORS.white },

  /**
   * Stats sit on the artwork, so they carry their own contrast the way
   * the title does. "74h TO FINISH" in medium grey over a cream frame
   * was the least readable text in the app.
   */
  statBlock: { marginTop: SPACING.xs },
  /**
   * The copy column top-aligns its children so pills keep their natural
   * width, which leaves this block as wide as its widest line — about
   * 90pt, the width of "74h to finish". The rule inside it has to span
   * the track or it is a motif rather than a measure, so the block
   * stretches and the lines inside it go on starting at the left.
   */
  /**
   * Stretched, and given air. The block's 4pt gap is right over
   * artwork on a phone, where the cluster huddles against a bright
   * ground; on the wide page's solid navy the same 4pt read as
   * squeezed — five kinds of information with no room to be five
   * things. 10 between lines is still one block, now legible as
   * title, figure, byline, rule.
   */
  statBlockWide: { alignSelf: 'stretch', gap: SPACING.sm + 2 },
  /**
   * The plan's own answer, and a way into it. Amber because it is a
   * link and every link in this app is amber — and because it is the
   * one line on the page that is about the reader rather than the
   * game.
   */
  statPlan: { color: COLORS.accent },
  statArrow: { ...TYPE.labelTiny },
  /** The hours, at the size the Library sets the hours ahead of you. */
  hoursLine: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  /**
   * Amber on both widths, not just the wide one.
   *
   * The desktop got this when a 44pt white name over a 76pt white
   * figure read as two rivals rather than a rank. The phone has the
   * same fault at 32 and 34 — a two-point difference is not a
   * hierarchy — and it was left white because the masthead sits on
   * artwork. But it sits on the FOOT of that artwork, where the hero's
   * own gradient is already #333D51D9 running to solid: 85% navy to
   * 100%, not a photograph. The contrast that ruled amber out over a
   * bright frame does not apply where the copy actually lands.
   */
  hoursValue: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
    // The shadow from OVER_IMAGE, but not its white: the spread has to
    // come first or it takes the colour back.
    ...OVER_IMAGE.heading,
    color: COLORS.accent,
  },
  /**
   * The same figure, kept ahead of a bigger title.
   *
   * This page leads with time — the hours are set larger than the name
   * on purpose, 34 against a 32 title. The desktop masthead then took
   * the title to 44 and left the figure at 34, which quietly inverted
   * the one decision the page is built on: the game's name became the
   * biggest thing on a page that is supposed to answer how long it
   * takes. 48 restores the ratio rather than picking a number that
   * looks about right.
   */
  /**
   * The wide page's step; the colour is the shared rule above.
   *
   * 56, down from 76. At 76 the figure was sized for the masthead of a
   * page whose whole top band was its own — once the title moved into
   * a column it became the largest thing on the screen by double,
   * shouting in a layout that had stopped needing it to. 56 against
   * the 44 title still leads — size, weight and amber all rank it —
   * and it no longer dwarfs the artwork it sits beside.
   */
  hoursValueWide: { fontSize: 56, lineHeight: 60 },

  /**
   * Full width of its track, so the rule is a measure and not a motif.
   * Equal flex rather than a fixed tick: twelve weeks and thirty-four
   * both have to span the same distance or the drawing says something
   * about the column instead of about the game.
   */
  hoursLabel: {
    ...TYPE.body,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.md,
  },
  railMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statPace: {
    ...TYPE.caption,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
  },
  statFlag: { color: COLORS.accent },
  statPencil: { opacity: 0.9 },
  /**
   * The middle of the type scale, which the page did not have: 76 for
   * the figure, 44 for the name, then nothing until 11. A tracked
   * micro-caps tag is the app's own voice for a qualifier and it reads
   * as a label rather than as punctuation somebody forgot to finish.
   */
  estimateTag: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    letterSpacing: 1.2,
  },

  /** The frame the phone's trailer and the lightbox's player sit in. */
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },

  // desktop masthead
  /**
   * The band, at the hero's own 3.1:1 between a floor and a ceiling.
   * Yoga takes the height from the width and then lets the ceiling win,
   * so a tall monitor gets a capped band that crops top and bottom and
   * a narrow window gets the floor, which crops the left - the side the
   * publisher left empty for a mark. No ground of its own: the Melt
   * takes the picture out at the foot and whatever is behind it shows
   * through, so it has to be the page - navy here was a darker strip
   * the band dissolved into, and then a step up to the page under it.
   */
  deskMasthead: {
    width: '100%',
    aspectRatio: DESK_BAND.ratio,
    minHeight: DESK_BAND.floor,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  /** The lockup stands on the columns' grid: same cap, same gutter. */
  deskLockup: {
    width: '100%',
    maxWidth: PAGE_MAX,
    alignSelf: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: DESK_GUTTER,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  /** The typed name where no mark exists: the one display size the scale
      does not carry, sized for a band and not a card. */
  deskTitle: {
    ...TYPE.display,
    ...OVER_IMAGE.heading,
    fontSize: 48,
    lineHeight: 54,
    color: COLORS.white,
  },
  /** Who made it, when, what kind - the band's one line, in light on the
      quietened side of the picture. */
  deskIdentity: {
    ...TYPE.labelSmall,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
    letterSpacing: 0.2,
  },
  deskIdentityLink: { color: COLORS.white },
  /**
   * The head of the column: the figure on the left, the split on the
   * right, bottoms level, a rule under both. `space-between`, so the
   * two read as the ends of one line and not as a figure with a table
   * tacked on.
   */
  deskFigures: {
    flexDirection: 'row',
    // Wraps rather than squeezes. At 1024 the column is 490 wide and
    // the two together want 640; shrunk, the figure's label broke onto
    // a second line and the pencil floated off between them. The lead
    // holds a floor and the split drops under it instead.
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.xl,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  deskFiguresLead: { flexGrow: 1, flexBasis: 340, minWidth: 0 },
  /** Left-aligned, so it sits square under the figure when it wraps. */
  splitBlock: { alignItems: 'flex-start', gap: SPACING.xs },
  /** The phone's strip cell, without its vertical padding: the rule
      under the row is the row's, and the cells sit on it. */
  splitCell: { paddingHorizontal: SPACING.lg, paddingVertical: 0 },
  splitSource: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    paddingHorizontal: SPACING.lg,
  },
  /** No contact shadow on solid ground - see StatStrip's `onGround`. */
  onGround: { textShadowColor: 'transparent', textShadowRadius: 0 },
  /** A frame in the gallery: the screenshot's 16:9, one hairline. */
  frame: {
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  frameBone: { aspectRatio: 16 / 9, borderRadius: RADIUS.md },
  frameCaption: {
    ...TYPE.labelSmall,
    ...OVER_IMAGE.body,
    color: COLORS.white,
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.sm + 2,
  },
  /** The shelf heading's bones, at the wide title's line height. */
  frameHeading: { height: 33, width: 240 },
  /**
   * The tail's rows on the columns' grid. They ran the sheet's full
   * width while the columns above stopped at the cap, so on a wide
   * window "Watch someone play" started a hundred points left of the
   * figure it followed. Same cap, same gutter: the rows' own 32 plus
   * this 32 is the columns' 64.
   */
  deskTail: {
    width: '100%',
    maxWidth: PAGE_MAX,
    alignSelf: 'center',
    paddingHorizontal: DESK_GUTTER - SPACING.xl,
  },
  // body
  expandedInner: { width: '100%' },
  twoColumn: {
    flexDirection: 'row',
    gap: SPACING.xl + SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: PAGE_MAX,
    alignSelf: 'center',
    paddingHorizontal: DESK_GUTTER,
    // The room between the band's foot and the figures.
    paddingTop: SPACING.lg,
  },

  /** Centred: it annotates a centred strip, and left-aligned under it
      the one line read as having slipped off the grid. */
  splitLegend: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  /** 3:4, at a stamp's size; hairline so dark covers keep an edge. */
  similarCard: { width: 132, gap: SPACING.xs },
  seriesCard: { width: 210, gap: SPACING.xs },
  seriesCover: {
    width: 210,
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.navy,
  },
  seriesMeta: { ...TYPE.micro, color: COLORS.mediumGrey },
  /**
   * The shelf, on the app's own plane.
   *
   * An invisible clip contained the cards but left them floating on
   * the page ground — walled in and still homeless. The panel is the
   * container the rest of the app already uses for grouped data (the
   * verdict's phone plane, the Plan's week): raised, one hairline,
   * cards inside it. The clip rides along, so the scroll still ends
   * where the shelf does.
   */
  shelfHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  shelfPager: { flexDirection: 'row', gap: SPACING.sm },
  shelfChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
  },
  shelfClip: { overflow: 'hidden', width: '100%' },
  /** The dissolve at the edge: the third way the shelf says "more". */
  shelfFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 56,
  },
  similarCover: {
    width: 132,
    aspectRatio: 3 / 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.navy,
  },
  similarName: { ...TYPE.caption, color: COLORS.lightGrey },

  /**
   * Proportional, not one fixed track and one leftover.
   *
   * The rail was pinned at 400 whatever the window did, so at the cap
   * it took 39% of the content and at 1024 it took 47% — the main
   * column shrank to 456 against a rail of 400 and the two read as
   * equals, which is the one thing a main column and a rail must not
   * do. 61/39 is the ratio the cap was designed at; the rail keeps its
   * 400 ceiling so a wide monitor does not stretch a lookup column.
   */
  columnMain: { flex: 70, minWidth: 0, gap: SPACING.sm },

  /** Centred on the poster, in the app's amber, sized for a thumb. */
  posterPlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  /** Small, solid, bottom-left: says "this one moves" without painting
      a control over the whole thumb. */
  stagePlayBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(18,24,36,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Pinned, the same move the Plan's rail makes and for the same
   * reason: the rail is the short column — a decision and two lookup
   * sections against the whole argument — and an unpinned short rail
   * leaves its track empty for the rest of the scroll. Pinned, the
   * decision stays in reach while the prose and the verdict go by,
   * which is the point of putting it in a column at all.
   */
  columnRail: {
    flex: 30,
    maxWidth: RAIL,
    /*
     * A floor as well as a ceiling. Purely proportional, the rail hit
     * 257pt at 1024 — which hands each of the status control's three
     * segments about 80pt when "Want to play" with its icon needs
     * ninety-odd. The ratio is for the wide end; the floor is what the
     * controls actually require, and the main column absorbs the
     * difference at widths where nothing else can.
     */
    minWidth: 300,
    gap: SPACING.md,
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as unknown as 'absolute',
          top: 58 + SPACING.xl,
        }
      : null),
  },
  railCard: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  compactBody: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    gap: SPACING.sm,
  },

  // blocks
  /**
   * A section, and the room between sections.
   *
   * Twenty points between blocks against ten inside one is the
   * difference between a list and a structure — the same ratio the Plan
   * and the Library now use, so a reader crossing between the three
   * meets one rhythm rather than three.
   */
  block: { gap: SPACING.sm + 2, marginBottom: SPACING.xl },

  fileSection: {
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  fileSectionCompact: { paddingVertical: SPACING.sm + 2 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  factCell: {
    width: '50%',
    paddingVertical: SPACING.sm + 2,
    gap: 3,
    paddingRight: SPACING.md,
  },
  factCellWide: { width: '100%' },

  // the phone's verdict
  verdictFigures: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: SPACING.sm,
  },
  verdictCell: { flex: 1, gap: 2, paddingVertical: SPACING.xs },
  verdictCellRule: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.strokeStrong,
    paddingLeft: SPACING.md,
  },
  verdictFigure: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  verdictLabel: { ...TYPE.caption, color: COLORS.mediumGrey },
  /** The verdict in words, ahead of the figures it is drawn from. */
  said: {
    ...TYPE.h3,
    color: COLORS.white,
    marginBottom: SPACING.sm + 2,
  },
  community: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: SPACING.sm,
  },

  // the file's band
  bandBleed: { marginHorizontal: -SPACING.md, marginTop: SPACING.sm },
  band: {
    backgroundColor: COLORS.surface,
    marginTop: -1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    /*
     * The band's colour carries on under the footer's shoreline.
     *
     * The water is only painted below the wave; above the crest the
     * shore is transparent and shows what it stands on. The band is a
     * step darker than the page, so where it stopped the reader got a
     * straight edge and then thirty points of lighter page before the
     * wave — the file entered over a shoreline and left over a cut.
     * The padding extends the colour by the shore's own depth and the
     * negative margin gives that height back to the layout, so the
     * footer rides up onto the band and the wave is the only edge.
     */
    paddingBottom: SHORE_H,
    marginBottom: -SHORE_H,
  },
  fileJoin: { borderBottomWidth: 1, borderBottomColor: COLORS.stroke },
  /**
   * The second figure, at the first one's size and on its baseline.
   *
   * Set to match the ratings' own lead rather than shrunk into a
   * caption: it is not a footnote to that number, it is the other half
   * of the verdict — what players thought, then whether they stayed.
   */
  finishRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  finishFigure: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  finishLabel: { ...TYPE.body, color: COLORS.lightGrey, flexShrink: 1 },

  /** Ruled off from the bars above it: same finding, second witness. */
  /** Set apart by its label and its air, not by a rule across the page. */
  whoElseRow: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  fileSectionLast: { borderBottomWidth: 0 },
  /** Leading the panel, the counts need no rule above them. */
  whoElseFirst: { marginTop: 0 },
  /** The glyphs and the names on one line, not a glyph over a word. */
  platformFact: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  mediaBones: { flexDirection: 'row', gap: SPACING.sm },
  bonesProse: { gap: 0 },
  bonesLine: { height: 23, width: '100%' },
  bonesLineShort: { height: 23, width: '72%' },
  bonesHeading: { height: 24, width: 128, marginTop: SPACING.lg },
  bonesVerdict: { height: 228, borderRadius: RADIUS.md },
  fileFlat: {},
  /** A label, at the size of a label — not a fourth headline. */
  fileLabel: { ...TYPE.micro, color: COLORS.mediumGrey },
  /**
   * A measure, because a wide column is not a readable one.
   *
   * At an expanded width this paragraph had 760px to run in, which at
   * 14px measured 116 characters a line — half again past the 45–75
   * where the eye still finds the start of the next one. It is the
   * longest prose in the app and the only place set that wide, so it
   * was also the only place the problem showed.
   *
   * 480 rather than a rounder number because it was measured, in the
   * face this actually renders in, against the band it has to land in:
   * 73 characters. 560 would have looked like restraint and still read
   * at 85.
   *
   * A flat cap rather than a branch on the breakpoint: a phone column
   * is already narrower than this, so the rule does nothing there and
   * there is no second layout to keep in step. The white space it
   * leaves beside the paragraph is the point, not a gap to fill.
   */
  aboutText: {
    ...TYPE.body,
    color: COLORS.lightGrey,
    lineHeight: 23,
    maxWidth: 480,
  },
  /**
   * One step up, and the measure held at the same character count.
   *
   * 14pt in a 632pt column is the smallest text on the page carrying
   * the only prose on it. 16 and 26 put the body where a reader
   * actually reads, and 560 is the same 73 characters the 480 cap was
   * buying at the smaller size — a wider page, not a longer line.
   */
  aboutTextWide: { fontSize: 16, lineHeight: 26, maxWidth: 560 },
  metaRow: { gap: 2, marginBottom: SPACING.sm },
  metaLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  metaValue: {
    ...TYPE.p,
    color: COLORS.lightGrey,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs + 2 },
  screenshot: {
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.navy,
    ...SHADOW.card,
  },

  // skeleton / lightbox
  skeletonShell: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  skeletonShellWide: { width: '100%' },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: {
    position: 'absolute',
    top: SPACING.xl + SPACING.md,
    right: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
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
