import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { queryKeys } from '@/api/queryClient';
import { getGame, getGameSeries, getMovies, getScreenshots } from '@/api/rawg';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { GameCard } from '@/components/GameCard';
import { PlatformIcons } from '@/components/PlatformIcons';
import { ReadMoreText } from '@/components/ReadMoreText';
import { Stars } from '@/components/Stars';
import { TrailerCard } from '@/components/TrailerCard';
import { Message } from '@/components/Message';
import { Textured } from '@/components/Textured';
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

function NameList({ items }: { items?: { id: number; name: string }[] }) {
  if (!items?.length) return <Text style={TYPE.p}>—</Text>;
  return (
    <View style={styles.nameList}>
      {items.map((item, i) => (
        <Text key={item.id} style={[TYPE.p, styles.nameItem]}>
          <Text style={styles.underline}>{item.name}</Text>
          {i < items.length - 1 ? ', ' : ''}
        </Text>
      ))}
    </View>
  );
}

export default function GameInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const scrollY = useAnimatedValue(0);
  const opacity = useAnimatedValue(0);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.game(id),
    // The detail screen needs four endpoints; fetch them as one unit so the
    // screen has a single loading and error state.
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

  const translateY = scrollY.interpolate({
    inputRange: [0, 270 + insets.top],
    outputRange: [0, insets.top - 270],
    extrapolate: 'clamp',
  });
  const translateYTitle = scrollY.interpolate({
    inputRange: [0, 270 + insets.top],
    outputRange: [0, insets.top + 18],
    extrapolate: 'clamp',
  });
  const scaleTitle = scrollY.interpolate({
    inputRange: [180, 270 + insets.top],
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  });
  const fadeOutOnScroll = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  if (isPending) {
    return (
      <View style={[styles.background, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.lightGrey} />
      </View>
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
  return (
    <Textured style={styles.background}>
      <SafeAreaView edges={['right', 'left']} style={styles.container}>
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>

        <Animated.View
          style={[styles.heroContainer, { transform: [{ translateY }] }]}
        >
          <Image
            source={{ uri: game.background_image ?? undefined }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />

          <Animated.View style={[styles.heroInfo, { opacity }]}>
            <Animated.View
              style={[styles.releasePill, { opacity: fadeOutOnScroll }]}
            >
              <Text style={styles.releaseText}>
                {formatDate(game.released)}
              </Text>
            </Animated.View>
            <Animated.View style={{ opacity: fadeOutOnScroll }}>
              <PlatformIcons platforms={game.parent_platforms ?? []} />
            </Animated.View>
            <Animated.View
              style={{
                transform: [
                  { translateY: translateYTitle },
                  { scale: scaleTitle },
                ],
              }}
            >
              <Text style={[TYPE.h2, styles.gameTitle]}>{game.name}</Text>
            </Animated.View>
            <Animated.View style={{ opacity: fadeOutOnScroll }}>
              <Stars rating={game.rating} ratingTop={game.rating_top} />
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          <Animated.View style={{ opacity }}>
            <View style={styles.section}>
              <Text style={TYPE.h2}>About</Text>
              {summary ? (
                <ReadMoreText style={TYPE.p} numberOfLines={3}>
                  {summary}
                </ReadMoreText>
              ) : (
                <Text style={TYPE.p}>No description available.</Text>
              )}
            </View>

            <View style={styles.columns}>
              <View style={styles.colWide}>
                <Text style={TYPE.h2}>Platforms</Text>
                <NameList
                  items={game.platforms?.map(({ platform }) => platform)}
                />
              </View>
              <View style={styles.colNarrow}>
                <Text style={TYPE.h2}>Genre</Text>
                <NameList items={game.genres} />
              </View>
            </View>

            <View style={styles.columns}>
              <View style={styles.colWide}>
                <Text style={TYPE.h2}>Developers</Text>
                <NameList items={game.developers} />
              </View>
              <View style={styles.colNarrow}>
                <Text style={TYPE.h2}>Publishers</Text>
                <NameList items={game.publishers} />
              </View>
            </View>

            {screenshots.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={TYPE.h2}>Screenshots</Text>
                </View>
                <FlatList
                  horizontal
                  data={screenshots}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => setLightboxUri(item.image)}>
                      <Image
                        source={{ uri: item.image }}
                        style={styles.screenshot}
                        contentFit="cover"
                        transition={200}
                      />
                    </Pressable>
                  )}
                  contentContainerStyle={styles.mediaList}
                />
              </>
            )}

            {trailers.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={TYPE.h2}>Trailers</Text>
                </View>
                <FlatList
                  horizontal
                  data={trailers}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => <TrailerCard trailer={item} />}
                  contentContainerStyle={styles.mediaList}
                />
              </>
            )}

            {series.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={TYPE.h2}>Games in Series</Text>
                </View>
                <FlatList
                  horizontal
                  data={series}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => <GameCard game={item} />}
                  contentContainerStyle={styles.mediaList}
                />
              </>
            )}

            {game.tags && game.tags.length > 0 && (
              <View style={styles.section}>
                <Text style={TYPE.h2}>Tags</Text>
                <View style={styles.tags}>
                  {game.tags.map((tag) => (
                    <Chip key={tag.id} title={tag.name} quiet />
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.ScrollView>

        <Modal
          visible={lightboxUri != null}
          transparent
          animationType="fade"
          onRequestClose={() => setLightboxUri(null)}
        >
          <Pressable
            style={styles.lightbox}
            onPress={() => setLightboxUri(null)}
          >
            {lightboxUri && (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            )}
          </Pressable>
        </Modal>
      </SafeAreaView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 20 },
  heroContainer: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    zIndex: 10,
    borderBottomStartRadius: RADIUS.xl,
    borderBottomEndRadius: RADIUS.xl,
    ...SHADOW.hero,
  },
  heroImage: {
    width: '100%',
    height: 350,
    borderBottomStartRadius: RADIUS.xl,
    borderBottomEndRadius: RADIUS.xl,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 350,
    backgroundColor: 'black',
    opacity: 0.4,
    borderBottomStartRadius: RADIUS.xl,
    borderBottomEndRadius: RADIUS.xl,
  },
  heroInfo: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    padding: 10,
    top: 120,
    gap: 8,
  },
  releasePill: {
    backgroundColor: COLORS.lightGrey,
    alignItems: 'center',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  releaseText: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.darkGrey,
  },
  gameTitle: { textAlign: 'center', marginVertical: 10 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 360,
    paddingBottom: 120,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  section: { padding: SPACING.sm + 2 },
  sectionHeader: { padding: SPACING.sm + 2 },
  columns: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  colWide: { width: '58%' },
  colNarrow: { width: '38%' },
  nameList: { flexDirection: 'row', flexWrap: 'wrap' },
  nameItem: { lineHeight: 18 },
  underline: { textDecorationLine: 'underline' },
  mediaList: {
    height: 220,
    paddingLeft: 15,
    alignItems: 'center',
    gap: 15,
  },
  screenshot: {
    width: LAYOUT.mediaWidth,
    height: LAYOUT.mediaHeight,
    borderRadius: RADIUS.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    gap: 4,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxImage: { width: '100%', height: '80%' },
});
