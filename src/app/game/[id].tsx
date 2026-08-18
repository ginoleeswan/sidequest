import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { queryKeys } from '@/api/queryClient';
import {
  getGame,
  getGameSeries,
  getMovies,
  getScreenshots,
  mediaUri,
} from '@/api/rawg';
import type { Game, Movie, Named, Screenshot } from '@/api/types';
import { BackButton } from '@/components/BackButton';
import { CoverImage } from '@/components/CoverImage';
import { Skeleton, SkeletonShelf } from '@/components/Skeleton';
import { Chip } from '@/components/Chip';
import { GameCard } from '@/components/GameCard';
import { Message } from '@/components/Message';
import { PlatformIcons } from '@/components/PlatformIcons';
import { Rail } from '@/components/Rail';
import { ReadMoreText } from '@/components/ReadMoreText';
import { Stars } from '@/components/Stars';
import { Textured } from '@/components/Textured';
import { TrailerCard } from '@/components/TrailerCard';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const HTML_TAGS = /(<([^>]+)>)/gi;

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso)
        .toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        .toUpperCase()
    : 'TBA';

/* ------------------------------------------------------------------ atoms */

function NameList({ items }: { items?: Named[] }) {
  if (!items?.length) return <Text style={styles.metaValue}>—</Text>;
  return (
    <Text style={styles.metaValue}>
      {items.map((item) => item.name).join(', ')}
    </Text>
  );
}

function MetaRow({ label, items }: { label: string; items?: Named[] }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <NameList items={items} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/* ------------------------------------------------------------------ screen */

export default function GameInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const { isExpanded } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const opacity = useAnimatedValue(0);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.game(id),
    // Four endpoints, one unit: the screen gets a single loading/error state.
    queryFn: async () => {
      const [game, screenshots, trailers, series] = await Promise.all([
        getGame(id),
        getScreenshots(id),
        getMovies(id),
        getGameSeries(id),
      ]);
      return {
        game,
        screenshots: screenshots.results,
        trailers: trailers.results,
        series: series.results,
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
          <Skeleton style={styles.skeletonHero} />
          <Skeleton style={styles.skeletonLine} />
          <Skeleton style={styles.skeletonLineShort} />
          <SkeletonShelf tiles={4} />
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

  const { game, screenshots, trailers, series } = data;
  const summary = game.description.replace(HTML_TAGS, '').trim();
  const attribution = <Text style={styles.attribution}>Game data by RAWG</Text>;
  // Compact rails bleed across the page padding; the desktop two-column
  // layout keeps rails inside the main column (bleeding would cross the
  // Details rail).
  const railInset = isExpanded ? 0 : SPACING.md;

  /* ---------------------------------------------------------- sub-sections */

  const about = (
    <View style={styles.block}>
      <SectionTitle>About</SectionTitle>
      {summary ? (
        <ReadMoreText style={TYPE.p} numberOfLines={isExpanded ? 6 : 3}>
          {summary}
        </ReadMoreText>
      ) : (
        <Text style={TYPE.p}>No description available.</Text>
      )}
    </View>
  );

  const details = (
    <View style={[styles.block, isExpanded && styles.railCard]}>
      <SectionTitle>Details</SectionTitle>
      <MetaRow
        label="Platforms"
        items={game.platforms?.map(({ platform }) => platform)}
      />
      <MetaRow label="Genre" items={game.genres} />
      <MetaRow label="Developers" items={game.developers} />
      <MetaRow label="Publishers" items={game.publishers} />
    </View>
  );

  const tags =
    game.tags && game.tags.length > 0 ? (
      <View style={[styles.block, isExpanded && styles.railCard]}>
        <SectionTitle>Tags</SectionTitle>
        <View style={styles.tags}>
          {game.tags.slice(0, isExpanded ? 24 : 14).map((tag) => (
            <Chip key={tag.id} title={tag.name} quiet />
          ))}
        </View>
      </View>
    ) : null;

  const media = (
    <>
      {screenshots.length > 0 && (
        <View style={styles.block}>
          <SectionTitle>Screenshots</SectionTitle>
          <Rail<Screenshot>
            data={screenshots}
            keyExtractor={(item) => String(item.id)}
            inset={railInset}
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
          <SectionTitle>Trailers</SectionTitle>
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
          <SectionTitle>Games in Series</SectionTitle>
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

  /* ------------------------------------------------------------------ hero */

  const heroContent = (
    <>
      <CoverImage
        uri={game.background_image}
        style={styles.heroImage}
        iconSize={72}
      />
      <View style={styles.heroScrim} />
      <Animated.View style={[styles.heroCopy, { opacity }]}>
        <View style={styles.releasePill}>
          <Text style={styles.releaseText}>{formatDate(game.released)}</Text>
        </View>
        <PlatformIcons platforms={game.parent_platforms ?? []} />
        <Text style={[styles.heroTitle, isExpanded && styles.heroTitleLarge]}>
          {game.name}
        </Text>
        <Stars rating={game.rating} ratingTop={game.rating_top} />
      </Animated.View>
    </>
  );

  /* -------------------------------------------------------------- expanded */

  if (isExpanded) {
    return (
      <Textured style={styles.background}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton />
          </View>
          <ScrollView
            contentContainerStyle={styles.expandedScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.expandedInner}>
              <View style={styles.heroExpanded}>{heroContent}</View>
              <Animated.View style={[styles.twoColumn, { opacity }]}>
                <View style={styles.columnMain}>
                  {about}
                  {media}
                </View>
                <View style={styles.columnRail}>
                  {details}
                  {tags}
                </View>
              </Animated.View>
              {attribution}
            </View>
          </ScrollView>
          <Lightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
        </SafeAreaView>
      </Textured>
    );
  }

  /* --------------------------------------------------------------- compact */

  return (
    <Textured style={styles.background}>
      <SafeAreaView edges={['right', 'left']} style={styles.container}>
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCompact}>{heroContent}</View>
          <Animated.View style={[styles.compactBody, { opacity }]}>
            {about}
            {details}
            {media}
            {tags}
            {attribution}
          </Animated.View>
        </ScrollView>

        <Lightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
      </SafeAreaView>
    </Textured>
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

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  attribution: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  skeletonShell: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl * 2,
    gap: SPACING.md,
  },
  skeletonHero: { height: 320, borderRadius: RADIUS.lg },
  skeletonLine: { height: 16, width: '55%' },
  skeletonLineShort: { height: 12, width: '35%', marginBottom: SPACING.lg },
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },

  // hero
  heroImage: { width: '100%', height: '100%' },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    opacity: 0.45,
  },
  heroCopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  heroTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 26,
    color: COLORS.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTitleLarge: { fontSize: 40 },
  heroCompact: {
    height: 380,
    borderBottomStartRadius: RADIUS.xl,
    borderBottomEndRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOW.hero,
  },
  heroExpanded: {
    height: 420,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    ...SHADOW.hero,
  },
  releasePill: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: RADIUS.sm / 2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  releaseText: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.darkGrey,
    letterSpacing: 0.5,
  },

  // expanded body
  expandedScroll: { paddingVertical: SPACING.lg },
  expandedInner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl * 2,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'flex-start',
  },
  columnMain: { flex: 2, gap: SPACING.lg },
  columnRail: { flex: 1, gap: SPACING.md, maxWidth: 360 },
  railCard: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },

  // compact body
  compactBody: {
    paddingHorizontal: SPACING.md,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },

  // blocks
  block: { gap: SPACING.sm, marginBottom: SPACING.lg },
  sectionTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 20,
    color: COLORS.lightGrey,
  },
  metaRow: { gap: 2 },
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

  // lightbox
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});
