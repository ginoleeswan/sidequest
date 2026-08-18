import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { queryKeys } from '@/api/queryClient';
import { searchGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { Chip } from '@/components/Chip';
import { FeaturedHero } from '@/components/FeaturedHero';
import { GameCard } from '@/components/GameCard';
import { GameInfoCard } from '@/components/GameInfoCard';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { Rail } from '@/components/Rail';
import { SearchInput } from '@/components/SearchInput';
import { SectionHeader } from '@/components/SectionHeader';
import { Shelf } from '@/components/Shelf';
import { Sidebar } from '@/components/Sidebar';
import {
  SkeletonCompactHome,
  SkeletonGrid,
  SkeletonHero,
  SkeletonShelf,
} from '@/components/Skeleton';
import { Textured } from '@/components/Textured';
import {
  DISCOVER,
  findSection,
  GENRES,
  HOME_SHELVES,
  type Section,
} from '@/constants/categories';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDebounced } from '@/hooks/useDebounced';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';

const FEATURED_COUNT = 5;

/** Chips shown on the compact layout: discovery first, then genres. */
const CHIP_SECTIONS = [...DISCOVER, ...GENRES];

/** Sentinel filling an incomplete final grid row so tiles keep their width. */
const SPACER = { spacer: true } as const;
type GridItem = Game | typeof SPACER;
const isSpacer = (item: GridItem): item is typeof SPACER => 'spacer' in item;

function padToRows(items: Game[], columns: number): GridItem[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  return [...items, ...Array(columns - remainder).fill(SPACER)];
}

const dedupeById = (items: Game[]): Game[] => {
  const seen = new Set<number>();
  return items.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)));
};

export default function HomeScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState('');
  // 'home' = storefront; otherwise a section key.
  const [selection, setSelection] = useState<'home' | string>('home');

  // Deep link from a genre chip on the detail screen.
  useEffect(() => {
    if (params.category && findSection(params.category)) {
      // Deliberate: adopting a navigation param into state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(params.category);
    }
  }, [params.category]);

  const debouncedQuery = useDebounced(query);
  const searching = debouncedQuery.trim() !== '';
  const isHome = selection === 'home' && !searching;
  const section: Section = findSection(selection) ?? DISCOVER[0];

  const { isExpanded, columns } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const searchRef = useRef<TextInput | null>(null);
  const [headerHeight, setHeaderHeight] = useState(132);

  // "/" focuses search, Escape clears it — desktop table stakes.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === 'Escape' && typing) {
        setQuery('');
        searchRef.current?.blur();
      }
    };
    // Capture phase: RN-web's TextInput stops Escape from bubbling.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // ------------------------------------------------------------------ data
  const list = useInfiniteQuery({
    queryKey: searching
      ? queryKeys.search(debouncedQuery)
      : queryKeys.browse(section.key),
    queryFn: ({ pageParam }) =>
      searching
        ? searchGames(debouncedQuery, pageParam)
        : section.fetch(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: Paged<Game>, pages) =>
      last.next ? pages.length + 1 : undefined,
  });

  const shelves = useQueries({
    queries: HOME_SHELVES.map((shelf) => ({
      queryKey: queryKeys.shelf(shelf.key),
      queryFn: () => shelf.fetch(1),
      select: (r: Paged<Game>) => r.results,
      enabled: isHome,
    })),
  });

  const games = dedupeById(list.data?.pages.flatMap((p) => p.results) ?? []);
  const totalCount = list.data?.pages[0]?.count ?? 0;
  const featured = isHome ? games.slice(0, FEATURED_COUNT) : [];
  const trendingShelf = isHome ? games.slice(FEATURED_COUNT) : [];

  const selectSection = (s: Section) => {
    setQuery('');
    setSelection(s.key);
  };
  const goHome = () => {
    setQuery('');
    setSelection('home');
  };

  const loadMore = () => {
    if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  };

  const refresh = (
    <RefreshControl
      refreshing={list.isRefetching && !list.isFetchingNextPage}
      onRefresh={list.refetch}
      tintColor={COLORS.lightGrey}
    />
  );

  const footerSpinner = list.isFetchingNextPage ? (
    <View style={styles.moreSpinner}>
      <ActivityIndicator color={COLORS.mediumGrey} />
    </View>
  ) : (
    <Text style={styles.attribution}>Game data by RAWG</Text>
  );

  const status = list.error ? (
    <Message
      icon="cloud-offline-outline"
      title="Couldn't reach RAWG"
      detail={list.error instanceof Error ? list.error.message : undefined}
    />
  ) : !list.isPending && games.length === 0 ? (
    searching ? (
      <Message
        icon="search-outline"
        title={`No games match "${debouncedQuery}"`}
        detail="Try a shorter or differently spelled title."
        actionLabel="Clear search"
        onAction={() => setQuery('')}
      />
    ) : (
      <Message icon="game-controller-outline" title="Nothing here yet" />
    )
  ) : null;

  const gridHeader = searching ? (
    <View style={styles.gridHeader}>
      <SectionHeader
        title={`Results for “${debouncedQuery}”`}
        eyebrow={
          totalCount ? `${totalCount.toLocaleString()} games` : undefined
        }
      />
    </View>
  ) : !isHome ? (
    <View style={styles.gridHeader}>
      <SectionHeader
        title={section.title}
        eyebrow={
          totalCount ? `${totalCount.toLocaleString()} games` : undefined
        }
      />
    </View>
  ) : null;

  const grid = (
    <FlatList
      // numColumns is immutable per instance; remount on change.
      key={`grid-${columns}`}
      data={padToRows(games, columns)}
      numColumns={columns}
      columnWrapperStyle={styles.gridRow}
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
      showsVerticalScrollIndicator={false}
      refreshControl={refresh}
      onEndReached={loadMore}
      onEndReachedThreshold={1.2}
      ListHeaderComponent={gridHeader}
      ListFooterComponent={footerSpinner}
      contentContainerStyle={[
        styles.gridContent,
        !isExpanded && { paddingTop: headerHeight },
        { paddingBottom: insets.bottom + SPACING.xl * 4 },
      ]}
    />
  );

  // ------------------------------------------------------------- expanded
  if (isExpanded) {
    return (
      <Textured style={styles.background}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.expandedShell}>
            <Sidebar
              activeKey={searching ? null : isHome ? 'home' : selection}
              onHome={goHome}
              onSelect={selectSection}
            />

            <View style={styles.main}>
              <View style={styles.mainHeader}>
                <Text style={styles.mainTitle}>
                  {searching ? 'Search' : isHome ? 'Home' : section.title}
                </Text>
                <SearchInput
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchExpanded}
                  inputRef={searchRef}
                  showShortcutHint
                />
              </View>

              {status ??
                (list.isPending ? (
                  isHome ? (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.homeScroll}
                    >
                      <SkeletonHero />
                      <SkeletonShelf />
                      <SkeletonShelf />
                    </ScrollView>
                  ) : (
                    <SkeletonGrid columns={columns} />
                  )
                ) : isHome ? (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.homeScroll}
                  >
                    <FeaturedHero games={featured} />
                    <Shelf
                      section={DISCOVER[0]}
                      games={trendingShelf}
                      onViewAll={selectSection}
                      inset={SPACING.xl}
                    />
                    {HOME_SHELVES.map((shelf, index) => (
                      <Shelf
                        key={shelf.key}
                        section={shelf}
                        games={shelves[index].data ?? []}
                        onViewAll={selectSection}
                        inset={SPACING.xl}
                      />
                    ))}
                    <Text style={styles.attribution}>Game data by RAWG</Text>
                  </ScrollView>
                ) : (
                  grid
                ))}
            </View>
          </View>
        </SafeAreaView>
      </Textured>
    );
  }

  // -------------------------------------------------------------- compact
  return (
    <Textured style={styles.background}>
      <View style={styles.compactShell}>
        {status ??
          (list.isPending ? (
            <View style={{ paddingTop: headerHeight }}>
              <SkeletonCompactHome />
            </View>
          ) : isHome ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={refresh}
              contentContainerStyle={[
                styles.compactHome,
                {
                  paddingTop: headerHeight,
                  paddingBottom: insets.bottom + SPACING.xl * 4,
                },
              ]}
            >
              {featured.length > 0 && (
                <Rail
                  data={featured}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={(item) => <GameCard game={item} wide />}
                  inset={SPACING.md}
                  gap={SPACING.md}
                  snapInterval={LAYOUT.cardWideWidth + SPACING.md}
                />
              )}
              <View style={styles.compactShelves}>
                <Shelf
                  section={DISCOVER[0]}
                  games={trendingShelf.slice(0, 12)}
                  onViewAll={selectSection}
                  inset={SPACING.md}
                />
                {HOME_SHELVES.map((shelf, index) => (
                  <Shelf
                    key={shelf.key}
                    section={shelf}
                    games={(shelves[index].data ?? []).slice(0, 12)}
                    onViewAll={selectSection}
                    inset={SPACING.md}
                  />
                ))}
              </View>
              <Text style={styles.attribution}>Game data by RAWG</Text>
            </ScrollView>
          ) : searching ? (
            <FlatList
              data={games}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <GameInfoCard game={item} />}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={1.2}
              ListHeaderComponent={gridHeader}
              ListFooterComponent={footerSpinner}
              contentContainerStyle={[
                styles.list,
                {
                  paddingTop: headerHeight,
                  paddingBottom: insets.bottom + SPACING.xl * 4,
                },
              ]}
            />
          ) : (
            grid
          ))}

        <View
          style={[styles.headerFloat, { paddingTop: insets.top + SPACING.sm }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          {/* Opaque behind the controls, dissolving to nothing below, so
              content melts away as it scrolls under rather than clipping. */}
          <LinearGradient
            colors={[COLORS.darkGrey, COLORS.darkGrey, 'rgba(51,61,81,0)']}
            locations={[0, 0.68, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.titleRow}>
            <Text style={styles.wordmark} onPress={goHome}>
              SIDEQUEST
            </Text>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchCompact}
            />
          </View>
          <FlatList
            data={CHIP_SECTIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Chip
                title={item.title}
                selected={!searching && !isHome && section.key === item.key}
                iconName={item.iconName}
                iconType={item.iconType}
                onPress={() => selectSection(item)}
              />
            )}
            contentContainerStyle={styles.chips}
          />
        </View>
      </View>
    </Textured>
  );
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
  mainTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 22,
    color: COLORS.lightGrey,
  },
  searchExpanded: { width: 280 },
  homeScroll: { paddingBottom: SPACING.xl },

  // grid
  gridHeader: { marginBottom: SPACING.md },
  gridRow: { gap: LAYOUT.gridGap },
  gridContent: {
    gap: LAYOUT.gridGap,
    paddingHorizontal: SPACING.md,
  },
  gridSpacer: { flex: 1 },
  moreSpinner: { paddingVertical: SPACING.lg },

  // compact
  compactShell: { flex: 1 },
  compactHome: { gap: SPACING.xs },
  compactShelves: { paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  headerFloat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: SPACING.lg,
  },
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
    fontSize: 22,
    color: COLORS.lightGrey,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  searchCompact: { flex: 1, width: 'auto', maxWidth: 230 },
  chips: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 46,
  },
  list: { flexGrow: 1, paddingHorizontal: SPACING.md },
  attribution: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
