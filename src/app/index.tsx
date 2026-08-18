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
import type { Game } from '@/api/types';
import { searchGames } from '@/api/rawg';
import { Chip } from '@/components/Chip';
import { DynamicIcon } from '@/components/DynamicIcon';
import { FeaturedHero } from '@/components/FeaturedHero';
import { GameCard } from '@/components/GameCard';
import { GameInfoCard } from '@/components/GameInfoCard';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { SearchInput } from '@/components/SearchInput';
import { Sidebar } from '@/components/Sidebar';
import { Textured } from '@/components/Textured';
import { CATEGORIES, SEARCH_SECTION } from '@/constants/categories';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDebounced } from '@/hooks/useDebounced';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** How far the compact hero carousel travels before it's tucked away. */
const COLLAPSE_DISTANCE = 240;
const FEATURED_COUNT = 4;

/** Sentinel filling an incomplete final grid row so tiles keep their width. */
const SPACER = { spacer: true } as const;
type GridItem = Game | typeof SPACER;
const isSpacer = (item: GridItem): item is typeof SPACER => 'spacer' in item;

function padToRows(items: Game[], columns: number): GridItem[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  return [...items, ...Array(columns - remainder).fill(SPACER)];
}

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [categoryKey, setCategoryKey] = useState(CATEGORIES[0].key);

  const debouncedQuery = useDebounced(query);
  const searching = debouncedQuery.trim() !== '';
  const category =
    CATEGORIES.find((c) => c.key === categoryKey) ?? CATEGORIES[0];

  const { isExpanded, columns } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const scrollY = useAnimatedValue(0);

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

  const selectCategory = (key: string) => {
    setQuery('');
    setCategoryKey(key);
  };

  const status = renderStatus({
    isPending,
    error,
    empty: games.length === 0,
    searching,
    debouncedQuery,
    sectionTitle: section.title,
  });

  const sectionHeading = (
    <View style={styles.sectionRow}>
      <DynamicIcon
        type={section.iconType}
        name={section.iconName}
        color={COLORS.mediumGrey}
      />
      <Text style={[TYPE.h3, styles.sectionTitle]}>{section.title}</Text>
    </View>
  );

  const refresh = (
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={refetch}
      tintColor={COLORS.lightGrey}
    />
  );

  // ------------------------------------------------------------- expanded
  if (isExpanded) {
    return (
      <Textured style={styles.background}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.expandedShell}>
            <Sidebar
              activeKey={searching ? null : categoryKey}
              onSelect={(c) => selectCategory(c.key)}
            />

            <View style={styles.main}>
              <View style={styles.mainHeader}>
                <Text style={[TYPE.h3, styles.sectionTitle]}>
                  {section.title}
                </Text>
                <SearchInput
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchExpanded}
                />
              </View>

              {status ?? (
                <FlatList
                  // numColumns is immutable per instance; remount on change.
                  key={`grid-${columns}`}
                  data={padToRows(listed, columns)}
                  numColumns={columns}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  keyExtractor={(item, index) =>
                    isSpacer(item) ? `spacer-${index}` : String(item.id)
                  }
                  renderItem={({ item }) =>
                    isSpacer(item) ? (
                      <View style={styles.gridSpacer} />
                    ) : (
                      <GameTile game={item} />
                    )
                  }
                  ListHeaderComponent={
                    featured.length > 0 ? (
                      <FeaturedHero games={featured} />
                    ) : null
                  }
                  showsVerticalScrollIndicator={false}
                  refreshControl={refresh}
                />
              )}
            </View>
          </View>
        </SafeAreaView>
      </Textured>
    );
  }

  // -------------------------------------------------------------- compact
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

  return (
    <Textured style={styles.background}>
      <SafeAreaView style={styles.container} edges={['right', 'top', 'left']}>
        <View style={styles.compactShell}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.wordmark}>SIDEQUEST</Text>
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
                  onPress={() => selectCategory(item.key)}
                />
              )}
              contentContainerStyle={styles.chips}
            />
          </View>

          {status ?? (
            <Animated.View
              style={[
                styles.body,
                !searching && { transform: [{ translateY }] },
              ]}
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

              {sectionHeading}

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
                refreshControl={refresh}
                contentContainerStyle={[
                  styles.list,
                  {
                    paddingBottom:
                      COLLAPSE_DISTANCE + insets.bottom + SPACING.xl,
                  },
                ]}
              />
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </Textured>
  );
}

interface StatusArgs {
  isPending: boolean;
  error: unknown;
  empty: boolean;
  searching: boolean;
  debouncedQuery: string;
  sectionTitle: string;
}

/** Loading / error / empty, or null when there are results to show. */
function renderStatus({
  isPending,
  error,
  empty,
  searching,
  debouncedQuery,
  sectionTitle,
}: StatusArgs) {
  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.lightGrey} />
        <Text style={[TYPE.p, styles.loadingText]}>
          Loading {sectionTitle}…
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

  if (empty) {
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

  return null;
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  container: { flex: 1 },

  // expanded
  expandedShell: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
  },
  main: { flex: 1, paddingHorizontal: SPACING.xl },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  searchExpanded: { width: 280 },
  gridRow: { gap: LAYOUT.gridGap },
  gridContent: { gap: LAYOUT.gridGap, paddingBottom: SPACING.xl },
  gridSpacer: { flex: 1 },

  // compact
  compactShell: {
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
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 24,
    color: COLORS.lightGrey,
  },
  chips: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    height: 50,
  },
  body: { flex: 1 },
  carousel: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.xs },
  list: { flexGrow: 1, paddingHorizontal: SPACING.md },

  // shared
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: { color: COLORS.mediumGrey },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
