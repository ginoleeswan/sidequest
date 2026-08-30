import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gameDetailQuery } from '@/api/gameDetail';
import { friendlyError, mediaUri } from '@/api/rawg';
import type { Game, GameDetail, Movie, Named, Screenshot } from '@/api/types';
import { RouteError } from '@/components/RouteError';
import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { CommunityStats } from '@/components/CommunityStats';
import { ChromeWeld } from '@/components/ChromeWeld';
import { CoverImage } from '@/components/CoverImage';
import { GameCard } from '@/components/GameCard';
import { Message } from '@/components/Message';
import { Commitment } from '@/components/Commitment';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { PersonalNote, usePersonalNote } from '@/components/PersonalNote';
import { SessionTimer } from '@/components/SessionTimer';
import { rememberGame } from '@/lib/recent';
import { calendarDate } from '@/lib/format';
import { DynamicIcon } from '@/components/DynamicIcon';
import { Rail } from '@/components/Rail';
import { LiveStreams } from '@/components/LiveStreams';
import { RatingsBreakdown } from '@/components/RatingsBreakdown';
import { ReadMoreText } from '@/components/ReadMoreText';
import { ScorePill } from '@/components/ScorePill';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonDetail, SkeletonDetailExpanded } from '@/components/Skeleton';
import { StatusActions } from '@/components/StatusActions';
import { StoreLinks } from '@/components/StoreLinks';
import { DurationSheet } from '@/components/DurationSheet';
import { SiteFooter } from '@/components/SiteFooter';
import { GrainScrim, Textured } from '@/components/Textured';
import { TrailerCard } from '@/components/TrailerCard';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { usePersistedState } from '@/hooks/usePersistedState';
import { usePlanStanding } from '@/hooks/usePlanStanding';
import { findSection } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { LAYOUT, RADIUS, SHADOW, SHADOW_ROOM, SPACING } from '@/styles/theme';
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

/** The rail, and so the second track of every band on the page. */
const RAIL = 400;

/**
 * The band the site header has to use to land on the page's left edge.
 *
 * The bar insets its contents by SPACING.xl and this page insets its
 * bands by twice that, so handing the header the same cap would leave
 * the wordmark 32pt outside the title — two left edges, which is what
 * the composition had and what a reader reads as no spine at all.
 * Narrowing the header's band by the difference puts the wordmark, the
 * title, About and Player verdict on one line, and the nav on the same
 * right edge as the rail. The artwork is then the only thing that
 * crosses either, which is what makes it read as a decision.
 */
const HEADER_BAND = PAGE_MAX - SPACING.xl * 2;

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
 * The length, drawn as the weeks it will actually take.
 *
 * "About 12 weeks at 6h a week" is the sentence no other games database
 * can write — a length is an abstraction until it is measured against
 * the hours somebody actually has, and this app knows those because the
 * Plan asked. It was set in 12px grey under the figure, which is fine
 * print for the one claim the page exists to make.
 *
 * So it is drawn. One bar per week, across the column, in the amber the
 * Plan already uses for an evening that is spoken for — the same
 * vocabulary as the week strip, so a reader who has seen the Plan has
 * seen this before. The figure says how long; the rule says how long
 * that is in the only unit a person schedules in.
 *
 * Desktop only, and not because the phone could not hold it: at 375 the
 * bars for a long game fall below the width where a bar reads as a bar
 * rather than a hairline, and a rule you cannot count is decoration.
 */
function WeekRule({ weeks }: { weeks: number }) {
  // A year of Sundays is the most this can say and still be counted.
  // Past that the bars stop being a measure and the caption carries it.
  const drawn = Math.min(weeks, 52);
  return (
    <View style={styles.weekRule} accessibilityElementsHidden>
      {Array.from({ length: drawn }, (_, index) => (
        <View key={index} style={styles.weekTick} />
      ))}
    </View>
  );
}

/**
 * A trailer, at the stage's own size.
 *
 * Its own component because `useVideoPlayer` is a hook and the stage
 * picks its lead at render time. No autoplay: a page that starts
 * talking when you open it is a page you close, and the play button is
 * the platform's own.
 */
function StageVideo({ movie }: { movie: Movie }) {
  const player = useVideoPlayer(mediaUri(movie.data.max) ?? '');
  return (
    <VideoView
      player={player}
      style={styles.stageLead}
      contentFit="contain"
      nativeControls
    />
  );
}

function StatStrip({
  game,
  onEditLength,
  onOpenGenre,
  onOpenPlan,
  wide = false,
}: {
  game: GameDetail;
  onEditLength: () => void;
  onOpenGenre: (genre: Named) => void;
  onOpenPlan: () => void;
  /** The desktop masthead, where the type scale is a size larger. */
  wide?: boolean;
}) {
  const { durationOf } = useDurations();
  const duration = durationOf(game);
  const [pace] = usePersistedState('sidequest.plan.pace', 6);
  const standing = usePlanStanding(game.id);

  /**
   * One figure, one sentence, one quiet line.
   *
   * This was five statistics in equal columns — length, rating,
   * Metacritic, year, ESRB — which wrapped three-and-two on a phone and
   * gave a certification the same weight as the number the whole app is
   * built on. Equal weight is not neutrality; it is a refusal to say
   * what matters.
   *
   * So the hours are set at display size, the way the Library sets the
   * hours ahead of you, and everything else falls to a byline: the
   * things you glance at to place a game, in one run, none of them
   * pretending to be the headline.
   */
  /**
   * One byline: what kind of game, then how it landed.
   *
   * The masthead had grown to five stacked rows — eight platform
   * glyphs, the title, the hours, the sentence, and a run of four
   * statistics — with the genres in a sixth row further down, wedged
   * between the session clock and the page's first heading. Every one
   * of those is a fact somebody might want and none of them is the
   * point, which is what "heavy" means: no line yielding to another.
   *
   * The platform glyphs, the release year and the age rating are all in
   * the file box at the foot, which is where you look a thing up. What
   * stays is identity and reception, on one line.
   */
  const meta: React.ReactNode[] = [];
  for (const genre of game.genres?.slice(0, 3) ?? []) {
    const section = genre.slug ? findSection(genre.slug) : undefined;
    meta.push(
      <Pressable
        key={`genre-${genre.id}`}
        onPress={section ? () => onOpenGenre(genre) : undefined}
        disabled={!section}
        accessibilityRole={section ? 'link' : undefined}
        accessibilityLabel={section ? `Browse ${genre.name} games` : undefined}
        style={styles.metaItem}
      >
        {/* The app's own icons. Every genre it browses already carries
            one in `constants/categories` — a compass for Adventure, a
            shield for RPG — and they were going unused on the one
            screen that names a game's genres. Nothing is invented for a
            genre this app has no section for. */}
        {section ? (
          <DynamicIcon
            type={section.iconType}
            name={section.iconName}
            size={13}
            color={COLORS.lightGrey}
          />
        ) : null}
        <Text style={styles.metaBit}>{genre.name}</Text>
      </Pressable>
    );
  }
  if (game.rating > 0) {
    meta.push(
      <Text key="rating" style={styles.metaBit}>
        ★ {game.rating.toFixed(1)}
      </Text>
    );
  }
  if (game.metacritic != null) {
    meta.push(<ScorePill key="mc" score={game.metacritic} />);
  }

  return (
    <View style={[styles.statBlock, wide && styles.statBlockWide]}>
      <Pressable
        onPress={onEditLength}
        accessibilityRole="button"
        accessibilityLabel={`Change how long ${game.name} takes`}
      >
        <View style={styles.hoursLine}>
          <Text style={[styles.hoursValue, wide && styles.hoursValueWide]}>
            {duration.hours > 0 ? formatHours(duration.hours) : 'Set'}
          </Text>
          <Text style={styles.hoursLabel}>
            {duration.source === 'yours'
              ? 'your length'
              : duration.source === 'reported'
                ? 'players report'
                : 'to finish'}
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
            size={wide ? 15 : 12}
            color={COLORS.mediumGrey}
            style={styles.statPencil}
          />
        </View>
      </Pressable>

      {/* Two clusters, not an interleave. On the wide page the byline
          rises to sit under the figure — all of the type together —
          and the week rule closes the block with its caption, a
          data-rule where an editorial page would put a plain one. The
          drawing between two lines of text read as neither. */}
      {meta.length > 0 && (
        <View style={styles.metaLine}>
          {meta.map((bit, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <Text style={styles.metaDot}>·</Text> : null}
              {bit}
            </React.Fragment>
          ))}
        </View>
      )}
      {wide && duration.hours > 0 && pace > 0 ? (
        <WeekRule weeks={Math.max(1, Math.ceil(duration.hours / pace))} />
      ) : null}
      {standing?.kind === 'scheduled' ? (
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
      ) : standing?.kind === 'dropped' ? (
        /* The relief stance, on a page about one game: the window has
           no room for it and that is a fact about the window, not a
           failing of the reader. §2.1 — no line in this app tells
           somebody they are behind. */
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
      ) : duration.hours > 0 ? (
        <Text style={styles.statPace}>
          {duration.hours <= pace
            ? `Under a week at ${pace}h a week.`
            : `About ${Math.round(duration.hours / pace)} weeks at ${pace}h a week.`}
        </Text>
      ) : null}
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

function Lightbox({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={uri != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.lightbox} onPress={onClose}>
        {uri && (
          <Image
            source={{ uri: mediaUri(uri, 640) }}
            style={styles.lightboxImage}
            contentFit="contain"
          />
        )}
      </Pressable>
    </Modal>
  );
}

/* ------------------------------------------------------------------ screen */

export default function GameInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [editingLength, setEditingLength] = useState(false);
  /** Which frame the stage shows: 0 is the key art, then screenshots. */
  const [stageIndex, setStageIndex] = useState(0);
  const { durationOf, learnDurations } = useDurations();

  const { isExpanded, width } = useBreakpoint();
  const hasNote = usePersonalNote(Number(id));
  const insets = useSafeAreaInsets();
  const opacity = useAnimatedValue(0);

  // Four endpoints, one unit: the screen gets a single loading/error
  // state, and a hovered tile can prefetch exactly this.
  const { data, isPending, error } = useQuery(gameDetailQuery(id));

  // What people reported finishing this in, if anyone has.
  useEffect(() => {
    if (data?.game.slug) learnDurations([data.game.slug]);
  }, [data?.game.slug, learnDurations]);

  // Somewhere to come back to. See lib/recent.
  useEffect(() => {
    if (data?.game) rememberGame(data.game);
  }, [data?.game]);

  useEffect(() => {
    if (data) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION.base,
        easing: EASING.standard,
        useNativeDriver: true,
      }).start();
    }
  }, [data, opacity]);

  if (isPending) {
    return (
      <Textured style={styles.background}>
        {/* The name is not known yet, but a blank tab is never right. */}
        <PageTitle>Sidequest</PageTitle>
        <View
          style={[
            isExpanded ? styles.skeletonShellWide : styles.skeletonShell,
            isExpanded && { paddingTop: 58 },
          ]}
        >
          {isExpanded ? <SkeletonDetailExpanded /> : <SkeletonDetail />}
        </View>
        {/* Same join as the loaded hero: the bones run to the top of the
            document too, so they need it just as much. */}
        {!isExpanded && <ChromeWeld height={insets.top + WELD_HEIGHT} />}
        {isExpanded ? (
          <AppHeader immersive band={HEADER_BAND} />
        ) : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton onImage />
          </View>
        )}
      </Textured>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.background}>
        <PageTitle>Sidequest</PageTitle>
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton onImage />
        </View>
        <Message
          icon="cloud-offline-outline"
          title="Couldn't load this game"
          detail={friendlyError(error)}
        />
      </View>
    );
  }

  const { game, screenshots, trailers, series, storeLinks } = data;
  const summary = decodeEntities(
    game.description.replace(HTML_TAGS, '')
  ).trim();
  const gutter = isExpanded
    ? Math.max(SPACING.xl * 2, (width - PAGE_MAX) / 2 + SPACING.xl * 2)
    : SPACING.md;
  const railInset = gutter;

  /**
   * Screenshots at the size of the thing they are.
   *
   * They were three hundred points wide in a rail, which on a phone is
   * a thumbnail with two more peeking — the same scale as a related-game
   * card, for the only asset on this page that shows you what playing
   * it actually looks like. A lead frame nearly the width of the
   * viewport, with the next one showing at the edge to say the rail
   * scrolls, is how a feature opens a photo essay.
   */
  const shotWidth = isExpanded
    ? LAYOUT.mediaWidth * 1.4
    : Math.min(width - gutter * 2 - SPACING.xl, 460);
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

  /* -------------------------------------------------------------- pieces */

  const hero = (
    <View style={styles.hero}>
      <CoverImage
        uri={game.background_image}
        style={styles.heroImage}
        iconSize={72}
        size="hero"
        label={`${game.name} cover art`}
      />
      {/* Art dissolves into the page colour — the hero belongs to the page,
          not to a box sitting on it. */}
      {/* The ramp starts where the copy does, not a third of the way
          down. At the old stops the title and the stat strip sat on
          roughly a quarter of a scrim, which is legible over dark art
          and invisible over light — and RAWG returns both. */}
      <LinearGradient
        colors={['#333D5100', '#333D514D', '#333D51D9', COLORS.darkGrey]}
        locations={[0.18, 0.5, 0.86, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={styles.heroGrain} />
      <ChromeWeld height={insets.top + WELD_HEIGHT} />
      <View style={styles.heroCopy}>
        {/* No platform glyphs here any more: eight of them opened the
            masthead with a row of noise, and every one is spelled out
            in the file box under PLATFORMS. */}
        <Text style={styles.heroTitle}>{game.name}</Text>
        <StatStrip
          game={game}
          onEditLength={() => setEditingLength(true)}
          onOpenGenre={openGenre}
          onOpenPlan={() => router.push('/plan')}
        />
      </View>
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
  const controls = (
    <View style={isExpanded ? styles.controlsRail : styles.controls}>
      {/* One object: the decision, then what follows from it.
          The status control, the clock and the two commitment toggles
          were four separate things loose on the page — a filled group
          with three outlined pills drifting beneath it and nothing
          holding any of them together. They are one question: what are
          you doing about this game. */}
      <View style={styles.decision}>
        <StatusActions game={game} />
        <View style={styles.decisionRule} />
        <View style={styles.decisionActions}>
          <SessionTimer game={game} />
          <Commitment gameId={game.id} />
        </View>
      </View>
    </View>
  );

  /* A tall banner works on a phone; on desktop it's a wall. The art
     becomes a framed card beside the title block, sitting on an ambient
     blur of itself that melts into the page. */
  const deskHero = (
    <View style={styles.deskHero}>
      <View style={styles.deskBackdrop} pointerEvents="none">
        {game.background_image ? (
          <Image
            source={{ uri: mediaUri(game.background_image, 210) ?? undefined }}
            style={styles.deskBackdropImage}
            contentFit="cover"
            blurRadius={60}
          />
        ) : null}
        <LinearGradient
          colors={[
            'rgba(51,61,81,0.55)',
            'rgba(51,61,81,0.82)',
            COLORS.darkGrey,
          ]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
        <GrainScrim style={styles.deskGrain} />
      </View>
    </View>
  );

  /**
   * The title block, as the head of the main column.
   *
   * It was a band of its own above the columns, and with the artwork
   * gone from it the band had nothing on its right half — so the week
   * rule ran the full 1072pt across both tracks over an empty corner,
   * the one stripe on the page that ignored the grid everything else
   * had just been put on. In the column, the title, the figure, the
   * rule and the stage under them share two edges exactly; and the
   * rail rises to sit level with the title, so the decision is beside
   * the name of the thing being decided about — the one arrangement
   * every store page agrees on.
   */
  const titleBlock = (
    <View style={styles.deskHeroCopy}>
      <Text style={styles.deskTitle}>{game.name}</Text>
      <StatStrip
        game={game}
        onEditLength={() => setEditingLength(true)}
        onOpenGenre={openGenre}
        onOpenPlan={() => router.push('/plan')}
        wide
      />
    </View>
  );

  const yourTake = hasNote ? (
    <View style={styles.block}>
      <PersonalNote gameId={game.id} />
    </View>
  ) : null;

  const about = summary ? (
    <View style={styles.block}>
      <SectionHeader title="About" wide={isExpanded} />
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
        {summary}
      </ReadMoreText>
    </View>
  ) : null;

  const media = (
    <>
      {screenshots.length > 0 && !isExpanded && (
        <View style={mediaBlock}>
          {/* The trailer link was a lone pill floating between two
              rails, belonging to neither. It is what you do with this
              section, so it sits where every other section in the app
              puts its action. */}
          <SectionHeader
            title="Screenshots"
            actionLabel={trailers.length === 0 ? 'Trailer →' : undefined}
            actionAccessibilityLabel="Watch the trailer on YouTube"
            onAction={
              trailers.length === 0
                ? () =>
                    Linking.openURL(
                      `https://www.youtube.com/results?search_query=${encodeURIComponent(
                        `${game.name} trailer`
                      )}`
                    )
                : undefined
            }
          />
          <Rail<Screenshot>
            data={screenshots}
            keyExtractor={(item) => String(item.id)}
            inset={railInset}
            shadowRoom={SHADOW_ROOM.card}
            renderItem={(item) => (
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
            )}
          />
        </View>
      )}

      {trailers.length > 0 && !isExpanded ? (
        <View style={mediaBlock}>
          <SectionHeader title="Trailers" />
          <Rail<Movie>
            data={trailers}
            keyExtractor={(item) => String(item.id)}
            inset={railInset}
            renderItem={(item) => <TrailerCard trailer={item} />}
          />
        </View>
      ) : null}

      {/* Below the trailers on purpose. A trailer is what the publisher
          wants this game to look like; a live stream is what it looks
          like. Renders nothing when nobody is live, when Twitch has no
          such category, or when the deployment has no Twitch keys — so
          it can never be the reason this page looks unfinished. */}
      <View style={mediaBlock}>
        <LiveStreams game={game.name} />
      </View>

      {series.length > 0 && (
        <View style={mediaBlock}>
          <SectionHeader wide={isExpanded} title="More in this series" />
          <Rail<Game>
            data={series}
            keyExtractor={(item) => String(item.id)}
            inset={railInset}
            renderItem={(item) => <GameCard game={item} />}
          />
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
  const whoElseWide =
    isExpanded && game.added_by_status ? (
      <View style={styles.whoElseRow}>
        <Text style={styles.fileLabel}>WHO ELSE HAS IT</Text>
        <CommunityStats status={game.added_by_status} />
      </View>
    ) : null;

  const ratingsBreakdown =
    game.ratings && game.ratings.length > 0 ? (
      <View style={styles.block}>
        <SectionHeader wide={isExpanded} title="Player verdict" />
        {/* On the phone this sits on a plane, because there it is one
            data block among prose. On the wide page the plane made it
            the main column's last surviving box after everything else
            went flush — and a 34pt "92%" needs no crate to read as a
            finding. */}
        <View style={isExpanded ? null : styles.panel}>
          <RatingsBreakdown ratings={game.ratings} />
        </View>
        {whoElseWide}
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
   * The file, in two halves that only separate when there is room.
   *
   * All four sections stack in one framed object on a phone, which is
   * what they were consolidated into and what still works there. On a
   * desktop they sit in a 360pt rail, and the two halves behave very
   * differently in it: "Get it" and "Who else has it" are chips and
   * tiles that were designed narrow, while Details and Tags are long
   * comma lists and a cloud — at 360 they measured 326 and 265, which
   * is most of a rail running 466pt past the column beside it and a
   * void that size at the foot of the page.
   *
   * So the record goes full width when the page is wide enough to give
   * it one. Nothing is hidden and nothing is reordered: the rail
   * carries what this game is right now, the band under it carries the
   * catalogue entry, and on a phone they are the same object they were.
   */
  /**
   * The stage: one big frame, and the strip that changes it.
   *
   * The artwork was a plate in the top-right corner that ran off the
   * side of the window, and the screenshots — the only assets that show
   * what playing this actually looks like — were a scrolling rail near
   * the foot of the page. Both store pages this borrows from do it the
   * other way round for a good reason: the picture is what a person
   * came to look at, so it is the first object under the title, at the
   * width of the column rather than the width of a thumbnail.
   *
   * The bleed went with it. Running off the right edge made sense while
   * the art was a corner element and stopped making sense the moment it
   * became the lead — an object at the head of a column wants the
   * column's edges, not the window's.
   *
   * Key art first and then the screenshots, because the opening frame
   * has to identify the game: a street at night is not a cover.
   */
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
  const current = frames[stageIndex] ?? frames[0];
  const stage =
    isExpanded && frames.length > 0 ? (
      <View style={styles.stage}>
        {current.movie ? (
          <StageVideo movie={current.movie} />
        ) : (
          <Pressable
            onPress={() => setLightboxUri(current.image)}
            accessibilityRole="button"
            accessibilityLabel="Open this image full size"
          >
            <CoverImage
              uri={current.image}
              style={styles.stageLead}
              iconSize={64}
              size="hero"
            />
          </Pressable>
        )}
        {frames.length > 1 ? (
          <View style={styles.stageStrip}>
            {frames.slice(0, 6).map((frame, index) => (
              <Pressable
                key={frame.key}
                onPress={() => setStageIndex(index)}
                style={[
                  styles.stageThumb,
                  index === stageIndex && styles.stageThumbOn,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  frame.movie
                    ? `Play the trailer ${frame.movie.name}`
                    : `Show image ${index + 1}`
                }
              >
                <Image
                  source={{ uri: mediaUri(frame.image, 200) }}
                  style={styles.stageThumbImage}
                  contentFit="cover"
                  transition={DURATION.base}
                />
                {frame.movie ? (
                  <View style={styles.stagePlayBadge}>
                    <Ionicons name="play" size={12} color={COLORS.white} />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    ) : null;

  const fileGetIt = hasLinks ? (
    <View style={styles.fileSection}>
      <Text style={styles.fileLabel}>GET IT</Text>
      <StoreLinks
        stores={game.stores}
        links={storeLinks}
        website={game.website}
        list={isExpanded}
      />
    </View>
  ) : null;

  const fileWho = game.added_by_status ? (
    <View style={styles.fileSection}>
      <Text style={styles.fileLabel}>WHO ELSE HAS IT</Text>
      <CommunityStats status={game.added_by_status} />
    </View>
  ) : null;

  const fileDetails = (
    <View style={styles.fileSection}>
      <Text style={styles.fileLabel}>DETAILS</Text>
      <MetaRow
        label="Platforms"
        items={game.platforms?.map(({ platform }) => platform)}
      />
      {game.esrb_rating?.name ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Rated</Text>
          <Text style={styles.metaValue}>{game.esrb_rating.name}</Text>
        </View>
      ) : null}
      <MetaRow label="Developers" items={game.developers} />
      <MetaRow label="Publishers" items={game.publishers} />
      {game.released ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Release date</Text>
          <Text style={styles.metaValue}>{calendarDate(game.released)}</Text>
        </View>
      ) : null}
    </View>
  );

  const fileTags =
    game.tags && game.tags.length > 0 ? (
      <View style={styles.fileSection}>
        <Text style={styles.fileLabel}>TAGS</Text>
        <View style={styles.tags}>
          {game.tags.slice(0, isExpanded ? 24 : 12).map((tag) => (
            <Chip key={tag.id} title={tag.name} quiet />
          ))}
        </View>
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
      <View style={isExpanded ? styles.fileFlat : styles.fileBox}>
        {/* The rule lives on this wrapper, not on the section inside
            it: an override on a parent never reaches a child's border,
            which is how the last section kept a stray hairline under
            it — the one line on the page that ruled off nothing. */}
        {present.map((section, index) => (
          <View
            key={index}
            style={[
              styles.fileJoin,
              index === present.length - 1 && styles.fileSectionLast,
            ]}
          >
            {section}
          </View>
        ))}
      </View>
    );
  };

  const fileBox = (
    <View style={styles.block}>
      {/* On the phone the crate needs a name. On the wide page the
          rail's register is the micro label — GET IT, WHO ELSE HAS IT —
          and a heading above them was a second voice saying nothing
          the labels don't: two label registers inside 100pt. */}
      {!isExpanded && (
        <SectionHeader title="The file" eyebrow="Where, who and what" />
      )}
      {framed(
        isExpanded ? [fileGetIt] : [fileGetIt, fileWho, fileDetails, fileTags]
      )}
    </View>
  );

  /** The catalogue entry, given the width its lists actually need. */
  const record = isExpanded ? (
    <View style={[styles.block, styles.recordBand]}>
      <View style={styles.recordDetails}>{framed([fileDetails])}</View>
      <View style={styles.recordTags}>{framed([fileTags])}</View>
    </View>
  ) : null;

  /* -------------------------------------------------------------- layout */

  return (
    <Textured style={styles.background}>
      <PageTitle>{`${game.name} — Sidequest`}</PageTitle>
      <View style={styles.container}>
        {isExpanded ? (
          <AppHeader immersive band={HEADER_BAND} />
        ) : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton onImage />
          </View>
        )}

        <Screen>
          <View style={{ paddingBottom: SPACING.xl * 1.5 }}>
            {isExpanded ? (
              <View style={styles.expandedInner}>
                {deskHero}
                <Animated.View style={[styles.twoColumn, { opacity }]}>
                  <View style={styles.columnMain}>
                    {titleBlock}
                    {stage}
                    {yourTake}
                    {about}
                    {ratingsBreakdown}
                  </View>
                  {/* What you do about the game, then what the game is.
                      Both store pages put the action beside the media
                      rather than under the title, and they are right:
                      a decision is something you come back to, so it
                      wants a column rather than a line in a masthead
                      you have already scrolled past. */}
                  <View style={styles.columnRail}>
                    {controls}
                    {fileBox}
                  </View>
                </Animated.View>
                <Animated.View style={{ opacity }}>{record}</Animated.View>
                {/* media escapes the column: full-bleed rails, gutter-aligned */}
                <Animated.View style={{ opacity }}>{media}</Animated.View>
              </View>
            ) : (
              <>
                {hero}
                {controls}
                <Animated.View style={[styles.compactBody, { opacity }]}>
                  {/* The case, then the reader's own note on it, then
                      the file. "Your take" used to sit second on the
                      page, directly under the controls, where for any
                      game you have not played it is an empty box in the
                      most valuable position on the screen. It is a
                      response, so it follows what it responds to. */}
                  {about}
                  {ratingsBreakdown}
                  {media}
                  {yourTake}
                  {fileBox}
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
        <Lightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
      </View>
    </Textured>
  );
}

const styles = StyleSheet.create({
  // flexGrow + auto basis: wraps tall content, still fills 100dvh when short.
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  container: { flexGrow: 1 },
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
    borderRadius: 22,
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    overflow: 'hidden',
  },

  // hero
  hero: { height: 480, justifyContent: 'flex-end' },
  heroGrain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  deskGrain: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controls: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.md,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  /**
   * The card's chrome hangs outside the grid; its content sits on it.
   *
   * The decision keeps the page's one card, but a padded card in a
   * flush rail gives the rail two left edges — the segmented control
   * started 16pt right of every eyebrow below it. Negative margins the
   * size of the padding put the content back on the rail's track and
   * spend the chrome in the gutter, which is what a gutter is for.
   */
  controlsRail: { width: '100%', marginHorizontal: -SPACING.md },
  decision: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOW.card,
  },
  decisionRule: { height: 1, backgroundColor: COLORS.stroke },
  decisionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  heroCopy: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  heroTitle: {
    ...TYPE.display,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
  },

  /**
   * Stats sit on the artwork, so they carry their own contrast the way
   * the title does. "74h TO FINISH" in medium grey over a cream frame
   * was the least readable text in the app.
   */
  statBlock: { gap: SPACING.xs, marginTop: SPACING.xs },
  /**
   * The copy column top-aligns its children so pills keep their natural
   * width, which leaves this block as wide as its widest line — about
   * 90pt, the width of "74h to finish". The rule inside it has to span
   * the track or it is a motif rather than a measure, so the block
   * stretches and the lines inside it go on starting at the left.
   */
  statBlockWide: { alignSelf: 'stretch' },
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
  hoursValue: {
    fontFamily: 'Noah-Black',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
    ...OVER_IMAGE.heading,
    color: COLORS.white,
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
   * Amber, because the masthead had two near-equal white slabs — a 44pt
   * name over a 76pt figure, same face, same ink — and size alone does
   * not rank two blocks that big; they read as rivals. Amber is what
   * this app paints time with everywhere (the rule below, the plan's
   * week, the library's hours), so the figure joins that system and
   * the name keeps white to itself. One glance now says which line is
   * the page's subject and which is its title.
   */
  hoursValueWide: { fontSize: 76, lineHeight: 80, color: COLORS.accent },

  /**
   * Full width of its track, so the rule is a measure and not a motif.
   * Equal flex rather than a fixed tick: twelve weeks and thirty-four
   * both have to span the same distance or the drawing says something
   * about the column instead of about the game.
   */
  weekRule: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 3,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  weekTick: {
    flex: 1,
    height: 10,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  hoursLabel: {
    ...TYPE.body,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
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
  /** The byline: what you glance at to place a game, in one run. */
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaBit: {
    ...TYPE.labelSmall,
    ...OVER_IMAGE.body,
    color: COLORS.lightGrey,
  },
  metaDot: { ...TYPE.labelSmall, color: COLORS.mediumGrey },

  // body
  expandedInner: { width: '100%' },
  twoColumn: {
    flexDirection: 'row',
    gap: SPACING.xl + SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: PAGE_MAX,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl * 2,
    // Clears the fixed immersive header: the job the masthead band was
    // doing before it dissolved into the columns.
    paddingTop: 58 + SPACING.xl,
  },

  // desktop hero
  /**
   * Atmosphere only. The copy lives in the column now, so this is the
   * blurred art and its veil as a fixed-height band behind the top of
   * the page — tall enough to sit under the title and the head of the
   * stage, gone before the prose starts.
   */
  deskHero: { width: '100%', height: 0 },
  deskBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 430,
    overflow: 'hidden',
  },
  deskBackdropImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.75,
  },
  deskHeroCopy: {
    gap: SPACING.sm,
    alignItems: 'stretch',
    marginBottom: SPACING.md,
  },
  /** The one display size the scale does not carry: a desktop masthead. */
  deskTitle: {
    ...TYPE.display,
    ...OVER_IMAGE.heading,
    fontSize: 44,
    lineHeight: 50,
    color: COLORS.white,
  },
  columnMain: { flex: 1, minWidth: 0, gap: SPACING.sm },

  /**
   * The lead frame and its strip, sized to the column rather than to
   * the window. No shadow and no card: it is the first object in the
   * column, so its edges are the column's and nothing needs to lift it
   * off a plane it is already sitting on.
   */
  stage: { gap: SPACING.sm },
  stageLead: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  stageStrip: { flexDirection: 'row', gap: SPACING.sm },
  /**
   * Equal flex, so six frames and three both fill the column. The
   * current one is marked by an amber hairline rather than by dimming
   * the others — a strip of darkened thumbnails reads as five disabled
   * controls next to one live one.
   */
  stageThumb: {
    flex: 1,
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.65,
  },
  stageThumbOn: { borderColor: COLORS.accent, opacity: 1 },
  stageThumbImage: { width: '100%', height: '100%' },
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
  /** Full width, and split so neither half runs to a 1152pt measure. */
  recordBand: {
    flexDirection: 'row',
    gap: SPACING.xl + SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: PAGE_MAX,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl * 2,
  },
  /**
   * The same two tracks as everything above, not an even split.
   *
   * A 50/50 band would have reintroduced the fault this page just lost:
   * columns at 560 and 560 under columns at 760 and 360, a third
   * rhythm on a page that should have one.
   *
   * Details takes the wide track and tags the narrow one, which is also
   * the way round they want. Details is label-and-value rows that fit
   * one line each at 760 and wrapped to 326pt at 360; tags are chips
   * that wrap to fill whatever they are given. Put the other way round
   * the band would stand 60pt taller for the same content.
   */
  recordDetails: { flex: 1, minWidth: 0 },
  recordTags: { width: RAIL },
  /**
   * Pinned, the same move the Plan's rail makes and for the same
   * reason: the rail is the short column — a decision and two lookup
   * sections against the whole argument — and an unpinned short rail
   * leaves its track empty for the rest of the scroll. Pinned, the
   * decision stays in reach while the prose and the verdict go by,
   * which is the point of putting it in a column at all.
   */
  columnRail: {
    width: RAIL,
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
  panel: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    padding: SPACING.lg,
    ...SHADOW.card,
  },

  /**
   * The fact box, on the plane the rest of the app puts panels on.
   * `raised`, not `surface`: surface is a step DOWN from the page's navy
   * and reads as a recess.
   */
  fileBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.card,
  },
  fileSection: {
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  fileJoin: { borderBottomWidth: 1, borderBottomColor: COLORS.stroke },
  /** Ruled off from the bars above it: same finding, second witness. */
  whoElseRow: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
    gap: SPACING.sm,
  },
  fileSectionLast: { borderBottomWidth: 0 },
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
    borderWidth: 1,
    borderColor: COLORS.stroke,
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
