import { useQuery } from '@tanstack/react-query';
import Head from 'expo-router/head';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { queryKeys } from '@/api/queryClient';
import {
  getGame,
  getGameSeries,
  getMovies,
  getScreenshots,
  getStoreLinks,
  mediaUri,
} from '@/api/rawg';
import type { Game, GameDetail, Movie, Named, Screenshot } from '@/api/types';
import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { CommunityStats } from '@/components/CommunityStats';
import { CoverImage } from '@/components/CoverImage';
import { GameCard } from '@/components/GameCard';
import { Message } from '@/components/Message';
import { PlatformIcons } from '@/components/PlatformIcons';
import { Rail } from '@/components/Rail';
import { RatingsBreakdown } from '@/components/RatingsBreakdown';
import { ReadMoreText } from '@/components/ReadMoreText';
import { ScorePill } from '@/components/ScorePill';
import { SectionHeader } from '@/components/SectionHeader';
import {
  SkeletonDetail,
  SkeletonDetailExpanded,
} from '@/components/Skeleton';
import { StatusActions } from '@/components/StatusActions';
import { LinkPill, StoreLinks } from '@/components/StoreLinks';
import { SiteFooter } from '@/components/SiteFooter';
import { GrainScrim, Textured } from '@/components/Textured';
import { TrailerCard } from '@/components/TrailerCard';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { findSection } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SHADOW_ROOM, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const HTML_TAGS = /(<([^>]+)>)/gi;

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

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <View style={styles.stat}>
      {typeof value === 'string' ? (
        <Text style={styles.statValue}>{value}</Text>
      ) : (
        value
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatStrip({ game }: { game: GameDetail }) {
  return (
    <View style={styles.statStrip}>
      {game.rating > 0 && (
        <Stat value={`★ ${game.rating.toFixed(1)}`} label="Players" />
      )}
      {game.metacritic != null && (
        <Stat
          value={<ScorePill score={game.metacritic} />}
          label="Metacritic"
        />
      )}
      {game.playtime > 0 && (
        <Stat value={`${game.playtime}h`} label="Avg. play" />
      )}
      {game.released && (
        <Stat value={game.released.slice(0, 4)} label="Released" />
      )}
      {game.esrb_rating?.name && (
        <Stat value={game.esrb_rating.name} label="ESRB" />
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
            source={{ uri: mediaUri(uri) }}
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

  const { isExpanded, width } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const opacity = useAnimatedValue(0);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.game(id),
    // Four endpoints, one unit: the screen gets a single loading/error state.
    queryFn: async () => {
      const [game, screenshots, trailers, series, storeLinks] =
        await Promise.all([
          getGame(id),
          getScreenshots(id),
          getMovies(id),
          getGameSeries(id),
          getStoreLinks(id).catch(() => ({ results: [] })),
        ]);
      return {
        game,
        screenshots: screenshots.results,
        trailers: trailers.results,
        series: series.results,
        storeLinks: storeLinks.results,
      };
    },
  });

  useEffect(() => {
    if (data) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [data, opacity]);

  if (isPending) {
    return (
      <Textured style={styles.background}>
        {isExpanded ? (
          <AppHeader immersive />
        ) : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton />
          </View>
        )}
        <View
          style={[
            isExpanded ? styles.skeletonShellWide : styles.skeletonShell,
            isExpanded && { paddingTop: 58 },
          ]}
        >
          {isExpanded ? <SkeletonDetailExpanded /> : <SkeletonDetail />}
        </View>
      </Textured>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.background}>
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
        <Message
          icon="cloud-offline-outline"
          title="Couldn't load this game"
          detail={error instanceof Error ? error.message : undefined}
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
      />
      {/* Art dissolves into the page colour — the hero belongs to the page,
          not to a box sitting on it. */}
      <LinearGradient
        colors={['#333D5100', '#333D5199', COLORS.darkGrey]}
        locations={[0.35, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <GrainScrim style={styles.heroGrain} />
      {/* From above, an eased near-black vignette: enough depth for the
          status bar and back button to read, while the artwork stays
          visible instead of dissolving into a page-colour fog band. */}
      <LinearGradient
        colors={[
          'rgba(9,12,19,0.55)',
          'rgba(9,12,19,0.30)',
          'rgba(9,12,19,0.11)',
          'rgba(9,12,19,0)',
        ]}
        locations={[0, 0.38, 0.7, 1]}
        style={styles.topScrim}
        pointerEvents="none"
      />
      <View style={styles.heroCopy}>
        <PlatformIcons platforms={game.parent_platforms ?? []} />
        <Text style={styles.heroTitle}>{game.name}</Text>
        <StatStrip game={game} />
        <StatusActions game={game} />
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
            source={{ uri: mediaUri(game.background_image) ?? undefined }}
            style={styles.deskBackdropImage}
            contentFit="cover"
            blurRadius={60}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(51,61,81,0.55)', 'rgba(51,61,81,0.82)', COLORS.darkGrey]}
          locations={[0, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
        <GrainScrim style={styles.deskGrain} />
      </View>
      <View style={styles.deskHeroInner}>
        <View style={styles.deskHeroCopy}>
          <PlatformIcons platforms={game.parent_platforms ?? []} />
          <Text style={styles.deskTitle}>{game.name}</Text>
          <StatStrip game={game} />
          <StatusActions game={game} />
        </View>
        <View style={styles.deskArtFrame}>
          <CoverImage
            uri={game.background_image}
            style={styles.deskArt}
            iconSize={64}
          />
        </View>
      </View>
    </View>
  );

  const about = summary ? (
    <View style={styles.block}>
      <SectionHeader title="About" />
      <ReadMoreText
        style={[TYPE.p, styles.aboutText]}
        numberOfLines={isExpanded ? 6 : 4}
      >
        {summary}
      </ReadMoreText>
    </View>
  ) : null;

  const genres =
    game.genres && game.genres.length > 0 ? (
      <View style={styles.genreRow}>
        {game.genres.map((genre) => (
          <Chip
            key={genre.id}
            title={genre.name}
            quiet
            onPress={
              genre.slug && findSection(genre.slug)
                ? () => openGenre(genre)
                : undefined
            }
          />
        ))}
      </View>
    ) : null;

  const details = (
    <View style={[styles.block, isExpanded && styles.railCard]}>
      <SectionHeader title="Details" />
      <MetaRow
        label="Platforms"
        items={game.platforms?.map(({ platform }) => platform)}
      />
      <MetaRow label="Developers" items={game.developers} />
      <MetaRow label="Publishers" items={game.publishers} />
      {game.released ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Release date</Text>
          <Text style={styles.metaValue}>
            {new Date(game.released).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const tags =
    game.tags && game.tags.length > 0 ? (
      <View style={[styles.block, isExpanded && styles.railCard]}>
        <SectionHeader title="Tags" />
        <View style={styles.tags}>
          {game.tags.slice(0, isExpanded ? 24 : 12).map((tag) => (
            <Chip key={tag.id} title={tag.name} quiet />
          ))}
        </View>
      </View>
    ) : null;

  const media = (
    <>
      {screenshots.length > 0 && (
        <View style={mediaBlock}>
          <SectionHeader title="Screenshots" />
          <Rail<Screenshot>
            data={screenshots}
            keyExtractor={(item) => String(item.id)}
            inset={railInset}
            shadowRoom={SHADOW_ROOM.card}
            renderItem={(item) => (
              <Pressable onPress={() => setLightboxUri(item.image)}>
                <Image
                  source={{ uri: mediaUri(item.image) }}
                  style={styles.screenshot}
                  contentFit="cover"
                  transition={200}
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
      ) : (
        <View
          style={[
            styles.trailerFallback,
            isExpanded && { paddingHorizontal: gutter },
          ]}
        >
          <LinkPill
            label="Watch trailer on YouTube"
            url={`https://www.youtube.com/results?search_query=${encodeURIComponent(
              `${game.name} trailer`
            )}`}
          />
        </View>
      )}

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

  const ratingsBreakdown =
    game.ratings && game.ratings.length > 0 ? (
      <View style={styles.block}>
        <SectionHeader title="Player verdict" />
        <RatingsBreakdown ratings={game.ratings} />
      </View>
    ) : null;

  const community = game.added_by_status ? (
    <View style={styles.block}>
      <SectionHeader title="Community" />
      <CommunityStats status={game.added_by_status} />
    </View>
  ) : null;

  const links =
    (storeLinks.length > 0 && game.stores?.length) || game.website ? (
      <View style={styles.block}>
        <SectionHeader title="Get it" />
        <StoreLinks
          stores={game.stores}
          links={storeLinks}
          website={game.website}
        />
      </View>
    ) : null;


  /* -------------------------------------------------------------- layout */

  return (
    <Textured style={styles.background}>
      <Head>
        <title>{`${game.name} — Sidequest`}</title>
      </Head>
      <View style={styles.container}>
        {isExpanded ? (
          <AppHeader immersive />
        ) : (
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton />
          </View>
        )}

        <View style={{ paddingBottom: SPACING.xl * 1.5 }}>
          {isExpanded ? (
            <View style={styles.expandedInner}>
              {deskHero}
              <Animated.View style={[styles.twoColumn, { opacity }]}>
                <View style={styles.columnMain}>
                  {genres}
                  {about}
                  {ratingsBreakdown}
                </View>
                <View style={styles.columnRail}>
                  {details}
                  {community}
                  {links}
                  {tags}
                </View>
              </Animated.View>
              {/* media escapes the column: full-bleed rails, gutter-aligned */}
              <Animated.View style={{ opacity }}>{media}</Animated.View>
            </View>
          ) : (
            <>
              {hero}
              <Animated.View style={[styles.compactBody, { opacity }]}>
                {genres}
                {about}
                {ratingsBreakdown}
                {media}
                {community}
                {links}
                {details}
                {tags}
              </Animated.View>
            </>
          )}
        </View>

        <SiteFooter />
        <Lightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
      </View>
    </Textured>
  );
}

const styles = StyleSheet.create({
  // flexGrow + auto basis: wraps tall content, still fills 100dvh when short.
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  container: { flexGrow: 1 },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },

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
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroCopy: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  heroTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 32,
    lineHeight: 36,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },

  // stats
  statStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xl,
    marginTop: SPACING.xs,
  },
  stat: { gap: 3, alignItems: 'flex-start' },
  statValue: {
    fontFamily: 'Noah-Black',
    fontSize: 16,
    color: COLORS.white,
  },
  statLabel: {
    fontFamily: 'Noah-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
  },

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
  deskHeroInner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl * 1.5,
    paddingHorizontal: SPACING.xl * 2,
    // clears the fixed immersive header, then the usual breathing room
    paddingTop: 58 + SPACING.xl,
    paddingBottom: SPACING.xl * 1.6,
  },
  deskHeroCopy: {
    flex: 1,
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  deskTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 44,
    lineHeight: 50,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  deskArtFrame: {
    width: '42%',
    maxWidth: 520,
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
  block: { gap: SPACING.sm + 2, marginBottom: SPACING.lg },
  aboutText: { fontSize: 13, lineHeight: 20 },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  metaRow: { gap: 2, marginBottom: SPACING.sm },
  metaLabel: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
  },
  metaValue: {
    fontFamily: 'Noah-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.lightGrey,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs + 2 },
  screenshot: {
    width: LAYOUT.mediaWidth,
    height: LAYOUT.mediaHeight,
    borderRadius: RADIUS.sm,
  },

  // skeleton / lightbox
  skeletonShell: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  skeletonShellWide: { width: '100%' },
  trailerFallback: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});
