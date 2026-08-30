import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Animated,
  Modal,
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
    <View style={styles.statBlock}>
      {/* The length is the one fact a person can out-know the data on,
          so it is the one fact they can change. */}
      <Pressable
        onPress={onEditLength}
        accessibilityRole="button"
        accessibilityLabel={`Change how long ${game.name} takes`}
      >
        <View style={styles.hoursLine}>
          <Text style={[styles.hoursValue, wide && styles.hoursValueWide]}>
            {duration.hours > 0 ? formatHours(duration.hours) : 'Set'}
            {duration.rough && duration.hours > 0 ? (
              <Text style={styles.statFlag}> ?</Text>
            ) : null}
          </Text>
          <Text style={styles.hoursLabel}>
            {duration.source === 'yours'
              ? 'your length'
              : duration.source === 'reported'
                ? 'players report'
                : 'to finish'}
            <Text style={styles.statPencil}> ✎</Text>
          </Text>
        </View>
      </Pressable>

      {/* The sentence no other games database can write. A length is an
          abstraction until it is measured against the hours somebody
          actually has — which this app knows, because the Plan asked.

          And when the game is actually IN the plan, it says the real
          answer instead. "About 3 weeks at 8h a week" is true of
          anybody with that pace; "credits around 5 September, third in
          your route" is true of this reader, and the app already knew
          it two taps away. One line, not both: two sentences about how
          long something takes is the soup the Plan was rescued from. */}
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
          <AppHeader immersive />
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
    ? Math.max(
        SPACING.xl * 2,
        (width - LAYOUT.maxExpandedWidth) / 2 + SPACING.xl * 2
      )
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
    <View style={styles.controls}>
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
      <View style={styles.deskHeroInner}>
        <View style={styles.deskHeroCopy}>
          <Text style={styles.deskTitle}>{game.name}</Text>
          <StatStrip
            game={game}
            onEditLength={() => setEditingLength(true)}
            onOpenGenre={openGenre}
            onOpenPlan={() => router.push('/plan')}
            wide
          />
          {/*
            Stretched on purpose. The copy column top-aligns its
            children so pills and links keep their natural width — but
            the status control's three segments are flex-basis zero,
            which makes its intrinsic width almost nothing, and in a
            non-stretching column it collapsed until "Want to play"
            read "Want t…" in the page's primary control. Capped so
            three words do not become a metre of button on a wide
            monitor.
          */}
          <View style={styles.deskStatus}>
            <StatusActions game={game} />
          </View>
          <SessionTimer game={game} />
          <Commitment gameId={game.id} />
        </View>
        <View style={styles.deskArtFrame}>
          <CoverImage
            uri={game.background_image}
            style={styles.deskArt}
            iconSize={64}
            size="hero"
          />
        </View>
      </View>
    </View>
  );

  const yourTake = hasNote ? (
    <View style={styles.block}>
      <PersonalNote gameId={game.id} />
    </View>
  ) : null;

  const about = summary ? (
    <View style={styles.block}>
      <SectionHeader title="About" />
      {/* At reading size. This is the only prose on the page and it was
          set two steps below the app's body copy, so the one block
          somebody actually reads was the smallest text on the screen. */}
      <ReadMoreText
        style={[TYPE.body, styles.aboutText]}
        numberOfLines={isExpanded ? 8 : 6}
      >
        {summary}
      </ReadMoreText>
    </View>
  ) : null;

  const media = (
    <>
      {screenshots.length > 0 && (
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

      {trailers.length > 0 ? (
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
          <SectionHeader title="More in this series" />
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
  const ratingsBreakdown =
    game.ratings && game.ratings.length > 0 ? (
      <View style={styles.block}>
        <SectionHeader title="Player verdict" />
        {/* On a plane, because it is data. The prose above it and the
            artwork below need no frame — a page where every block is a
            card has no rhythm, and the rhythm is what tells you which
            kind of thing you are looking at. */}
        <View style={styles.panel}>
          <RatingsBreakdown ratings={game.ratings} />
        </View>
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
  const fileGetIt = hasLinks ? (
    <View style={styles.fileSection}>
      <Text style={styles.fileLabel}>GET IT</Text>
      <StoreLinks
        stores={game.stores}
        links={storeLinks}
        website={game.website}
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
  const framed = (sections: React.ReactNode[]) => {
    const present = sections.filter(Boolean);
    return (
      <View style={styles.fileBox}>
        {present.map((section, index) => (
          <View
            key={index}
            style={index === present.length - 1 && styles.fileSectionLast}
          >
            {section}
          </View>
        ))}
      </View>
    );
  };

  const fileBox = (
    <View style={styles.block}>
      <SectionHeader title="The file" eyebrow="Where, who and what" />
      {framed(
        isExpanded
          ? [fileGetIt, fileWho]
          : [fileGetIt, fileWho, fileDetails, fileTags]
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
          <AppHeader immersive />
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
                    {yourTake}
                    {about}
                    {ratingsBreakdown}
                  </View>
                  <View style={styles.columnRail}>{fileBox}</View>
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
  hoursValueWide: { fontSize: 48, lineHeight: 52 },
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
  statPencil: { fontSize: 11, color: COLORS.lightGrey },
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
    gap: SPACING.xl,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl * 2,
    paddingTop: SPACING.lg,
  },

  // desktop hero
  deskHero: { width: '100%' },
  deskBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  /**
   * The masthead, on the grid the rest of the page is already on.
   *
   * It used to run its own: copy at `flex: 1` against art at 42% with a
   * 48pt gutter, which at 1280 measured 620 and 484 — while everything
   * below it measured 760 and 360 with a 32pt gutter. The art's left
   * edge landed 123pt inside the main column, on neither track, so a
   * reader scanning down the page met one rhythm at the top and a
   * different one underneath.
   *
   * Same ratio, same gutter, same cap as `twoColumn` now. The artwork
   * gives up 120pt of width to become the head of the rail rather than
   * a block floating over the gutter — and the rail reads as one column
   * from the art down through the file.
   */
  deskHeroInner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    // Hung from one line rather than centred against each other. The
    // artwork is taller than the copy, so centring pushed its top edge
    // below the title's and left the masthead with no shared line to
    // read across — the one alignment a two-track header has.
    alignItems: 'flex-start',
    gap: SPACING.xl,
    paddingHorizontal: SPACING.xl * 2,
    // clears the fixed immersive header, then the usual breathing room
    paddingTop: 58 + SPACING.xl,
    /*
     * The break after the masthead, not a void.
     *
     * 51 here plus the body's own 20 put 75pt between "Start a session"
     * and the first heading under it — more than twice the 32 this app
     * puts between one section and the next, on the one join where the
     * reader is still looking for where the page begins. 24 and 20 make
     * 44: wider than a section break, which a masthead deserves, and
     * not a hole.
     */
    paddingBottom: SPACING.lg + SPACING.xs,
  },
  deskHeroCopy: {
    flex: 2,
    gap: SPACING.sm,
    alignItems: 'flex-start',
    // Yoga hands a flex child its content's width as a floor, and a
    // long title would otherwise widen this track past its share and
    // push the art off the rail.
    minWidth: 0,
  },
  deskStatus: {
    alignSelf: 'stretch',
    maxWidth: 430,
  },
  /** The one display size the scale does not carry: a desktop masthead. */
  deskTitle: {
    ...TYPE.display,
    ...OVER_IMAGE.heading,
    fontSize: 44,
    lineHeight: 50,
    color: COLORS.white,
  },
  deskArtFrame: {
    flex: 1,
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  deskArt: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    backgroundColor: COLORS.navy,
  },
  columnMain: { flex: 2, gap: SPACING.sm },
  /** Full width, and split so neither half runs to a 1152pt measure. */
  recordBand: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
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
  recordDetails: { flex: 2, minWidth: 0 },
  recordTags: { flex: 1, maxWidth: 360, minWidth: 0 },
  columnRail: { flex: 1, gap: SPACING.md, maxWidth: 360 },
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  fileSectionLast: { borderBottomWidth: 0 },
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
