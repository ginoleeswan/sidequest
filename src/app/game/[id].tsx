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
import { SkeletonDetail } from '@/components/Skeleton';
import { StatusActions } from '@/components/StatusActions';
import { StoreLinks } from '@/components/StoreLinks';
import { Textured } from '@/components/Textured';
import { TrailerCard } from '@/components/TrailerCard';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { findSection } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW_ROOM, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const HTML_TAGS = /(<([^>]+)>)/gi;

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

  const { isExpanded } = useBreakpoint();
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
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
        <View style={styles.skeletonShell}>
          <SkeletonDetail />
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
  const summary = game.description.replace(HTML_TAGS, '').trim();
  const railInset = isExpanded ? 0 : SPACING.md;

  const openGenre = (genre: Named) => {
    if (genre.slug && findSection(genre.slug)) {
      router.push({ pathname: '/', params: { category: genre.slug } });
    }
  };

  /* -------------------------------------------------------------- pieces */

  const hero = (
    <View style={[styles.hero, isExpanded && styles.heroExpanded]}>
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
      {/* And from above: the art blends out of the browser chrome instead
          of being guillotined by it. */}
      <LinearGradient
        colors={[COLORS.darkGrey, '#333D5100']}
        locations={[0, 1]}
        style={styles.topScrim}
        pointerEvents="none"
      />
      <View style={[styles.heroCopy, isExpanded && styles.heroCopyExpanded]}>
        <PlatformIcons platforms={game.parent_platforms ?? []} />
        <Text style={[styles.heroTitle, isExpanded && styles.heroTitleLarge]}>
          {game.name}
        </Text>
        <StatStrip game={game} />
        <StatusActions game={game} />
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
        <View style={styles.block}>
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

      {trailers.length > 0 && (
        <View style={styles.block}>
          <SectionHeader title="Trailers" />
          <Rail<Movie>
            data={trailers}
            keyExtractor={(item) => String(item.id)}
            inset={railInset}
            renderItem={(item) => <TrailerCard trailer={item} />}
          />
        </View>
      )}

      {series.length > 0 && (
        <View style={styles.block}>
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

  const attribution = <Text style={styles.attribution}>Game data by RAWG</Text>;

  /* -------------------------------------------------------------- layout */

  return (
    <Textured style={styles.background}>
      <Head>
        <title>{`${game.name} — Sidequest`}</title>
      </Head>
      <View style={styles.container}>
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>

        <View style={{ paddingBottom: insets.bottom + 84 }}>
          {isExpanded ? (
            <View style={styles.expandedInner}>
              {hero}
              <Animated.View style={[styles.twoColumn, { opacity }]}>
                <View style={styles.columnMain}>
                  {genres}
                  {about}
                  {ratingsBreakdown}
                  {media}
                </View>
                <View style={styles.columnRail}>
                  {details}
                  {community}
                  {links}
                  {tags}
                </View>
              </Animated.View>
              {attribution}
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
                {attribution}
              </Animated.View>
            </>
          )}
        </View>

        <Lightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
      </View>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  container: { flex: 1 },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },

  // hero
  hero: { height: 480, justifyContent: 'flex-end' },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  heroExpanded: { height: 520 },
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
  heroCopyExpanded: {
    maxWidth: LAYOUT.maxExpandedWidth,
    paddingHorizontal: SPACING.xl * 2,
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
  heroTitleLarge: { fontSize: 48, lineHeight: 52 },

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
  expandedInner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl * 2,
    paddingTop: SPACING.lg,
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
  attribution: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // skeleton / lightbox
  skeletonShell: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});
