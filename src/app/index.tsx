import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { queryKeys } from '@/api/queryClient';
import { getGames, getMustPlayGames, searchGames } from '@/api/rawg';
import type { Game } from '@/api/types';
import { Chip } from '@/components/Chip';
import { DynamicIcon, type IconType } from '@/components/DynamicIcon';
import { GameCard } from '@/components/GameCard';
import { GameInfoCard } from '@/components/GameInfoCard';
import { Message } from '@/components/Message';
import { SearchInput } from '@/components/SearchInput';
import { Textured } from '@/components/Textured';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useDebounced } from '@/hooks/useDebounced';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Category {
  key: string;
  title: string;
  fetch: () => Promise<{ results: Game[] }>;
  iconName: string;
  iconType: IconType;
}

const CATEGORIES: Category[] = [
  {
    key: 'trending',
    title: 'Trending',
    fetch: () => getGames(),
    iconName: 'trending-up',
    iconType: 'feather',
  },
  {
    key: 'must-play',
    title: 'Must Play',
    fetch: getMustPlayGames,
    iconName: 'star',
    iconType: 'material-community',
  },
  {
    key: 'indie',
    title: 'Indie',
    fetch: () => getGames('indie'),
    iconName: 'heart',
    iconType: 'material-community',
  },
  {
    key: 'racing',
    title: 'Racing',
    fetch: () => getGames('racing'),
    iconName: 'car',
    iconType: 'font-awesome-5',
  },
  {
    key: 'strategy',
    title: 'Strategy',
    fetch: () => getGames('strategy'),
    iconName: 'strategy',
    iconType: 'material-community',
  },
  {
    key: 'simulation',
    title: 'Simulation',
    fetch: () => getGames('simulation'),
    iconName: 'person',
    iconType: 'ionicon',
  },
  {
    key: 'casual',
    title: 'Casual',
    fetch: () => getGames('casual'),
    iconName: 'checkerboard',
    iconType: 'material-community',
  },
  {
    key: 'sports',
    title: 'Sport',
    fetch: () => getGames('sports'),
    iconName: 'soccer',
    iconType: 'material-community',
  },
  {
    key: 'shooter',
    title: 'Shooter',
    fetch: () => getGames('shooter'),
    iconName: 'crosshairs',
    iconType: 'font-awesome-5',
  },
  {
    key: 'rpg',
    title: 'RPG',
    fetch: () => getGames('role-playing-games-rpg'),
    iconName: 'shield',
    iconType: 'material-community',
  },
  {
    key: 'adventure',
    title: 'Adventure',
    fetch: () => getGames('adventure'),
    iconName: 'compass',
    iconType: 'material-community',
  },
];

const SEARCH_SECTION = {
  title: 'Search',
  iconName: 'search',
  iconType: 'material-icons' as IconType,
};

/** How far the hero carousel travels before it's fully tucked away. */
const COLLAPSE_DISTANCE = 240;
const FEATURED_COUNT = 4;

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [categoryKey, setCategoryKey] = useState(CATEGORIES[0].key);

  const debouncedQuery = useDebounced(query);
  const searching = debouncedQuery.trim() !== '';
  const category =
    CATEGORIES.find((c) => c.key === categoryKey) ?? CATEGORIES[0];

  const insets = useSafeAreaInsets();
  const scrollY = useAnimatedValue(0);

  const translateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, -COLLAPSE_DISTANCE],
    extrapolate: 'clamp',
  });
  const fadeOutOnScroll = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const { data, isPending, isRefetching, error, refetch } = useQuery({
    queryKey: searching
      ? queryKeys.search(debouncedQuery)
      : queryKeys.games(category.key),
    queryFn: () => (searching ? searchGames(debouncedQuery) : category.fetch()),
    select: (result) => result.results,
  });

  const games = data ?? [];
  const section = searching ? SEARCH_SECTION : category;
  const featured = searching ? [] : games.slice(0, FEATURED_COUNT);
  const listed = searching ? games : games.slice(FEATURED_COUNT);

  const renderBody = () => {
    if (isPending) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.lightGrey} />
          <Text style={[TYPE.p, styles.loadingText]}>
            Loading {section.title}…
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <Message
          icon="cloud-offline-outline"
          title="Couldn't reach RAWG"
          detail={error instanceof Error ? error.message : undefined}
        />
      );
    }

    if (games.length === 0) {
      return searching ? (
        <Message
          icon="search-outline"
          title={`No games match "${debouncedQuery}"`}
          detail="Try a shorter or differently spelled title."
        />
      ) : (
        <Message icon="game-controller-outline" title="Nothing here yet" />
      );
    }

    return (
      <Animated.View
        style={[styles.body, !searching && { transform: [{ translateY }] }]}
      >
        {featured.length > 0 && (
          <Animated.View style={{ opacity: fadeOutOnScroll }}>
            <FlatList
              data={featured}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <GameCard game={item} wide />}
              contentContainerStyle={styles.carousel}
            />
          </Animated.View>
        )}

        <View style={styles.sectionRow}>
          <DynamicIcon
            type={section.iconType}
            name={section.iconName}
            color={COLORS.mediumGrey}
          />
          <Text style={[TYPE.h3, styles.sectionTitle]}>{section.title}</Text>
        </View>

        <FlatList
          data={listed}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <GameInfoCard game={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.lightGrey}
            />
          }
          contentContainerStyle={[
            styles.list,
            { paddingBottom: COLLAPSE_DISTANCE + insets.bottom + SPACING.xl },
          ]}
        />
      </Animated.View>
    );
  };

  return (
    <Textured style={styles.background}>
      <SafeAreaView style={styles.container} edges={['right', 'top', 'left']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.appTitle}>ARCADE</Text>
              <SearchInput value={query} onChangeText={setQuery} />
            </View>
            <FlatList
              data={CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Chip
                  title={item.title}
                  selected={!searching && categoryKey === item.key}
                  iconName={item.iconName}
                  iconType={item.iconType}
                  onPress={() => {
                    setQuery('');
                    setCategoryKey(item.key);
                  }}
                />
              )}
              contentContainerStyle={styles.chips}
            />
          </View>
          {renderBody()}
        </View>
      </SafeAreaView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  container: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  header: { zIndex: 10, paddingBottom: SPACING.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm + 4,
  },
  appTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    color: COLORS.lightGrey,
  },
  chips: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    height: 50,
  },
  body: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: { color: COLORS.mediumGrey },
  carousel: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
  list: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
  },
});
