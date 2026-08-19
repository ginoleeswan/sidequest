import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
} from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { queryKeys } from '@/api/queryClient';
import { friendlyError, searchGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { RouteError } from '@/components/RouteError';
import { Chip } from '@/components/Chip';
import { FadeInView } from '@/components/FadeInView';
import { FeaturedHero } from '@/components/FeaturedHero';
import { SiteFooter } from '@/components/SiteFooter';
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
  SkeletonCategory,
  SkeletonCompactHome,
  SkeletonGrid,
  SkeletonHero,
  SkeletonRow,
  SkeletonShelf,
} from '@/components/Skeleton';
import { CategoryHero } from '@/components/CategoryHero';
import { ProgressLine } from '@/components/ProgressLine';
import { Reveal } from '@/components/Reveal';
import {
  DEFAULT_REFINEMENTS,
  FilterBar,
  toBrowseFilters,
  type BrowseRefinements,
} from '@/components/FilterBar';
import { GrainScrim, Textured } from '@/components/Textured';
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
  const router = useRouter();
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
  const { height: windowHeight } = useWindowDimensions();
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
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };

  const [refine, setRefine] = useState<BrowseRefinements>(DEFAULT_REFINEMENTS);
  const refineKey = [
    refine.ordering ?? 'default',
    refine.platformIds.join(','),
    refine.minMetacritic,
  ] as const;

  const list = useInfiniteQuery({
    // Refining is a change of answer, not a fresh page: hold the results
    // already on screen while the new ones arrive.
    placeholderData: keepPreviousData,
    queryKey: searching
      ? [...queryKeys.search(debouncedQuery), ...refineKey]
      : [...queryKeys.browse(section.key), ...refineKey],
    queryFn: ({ pageParam }) =>
      searching
        ? searchGames(debouncedQuery, pageParam, toBrowseFilters(refine))
        : section.fetch(pageParam, toBrowseFilters(refine)),
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
    setRefine(DEFAULT_REFINEMENTS);
  };
  const goHome = () => {
    setQuery('');
    setSelection('home');
    setRefine(DEFAULT_REFINEMENTS);
  };

  const loadMore = () => {
    if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  };
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // Infinite browse in document flow: the FlatList's own onEndReached
  // never fires when the window is the scroller, so watch the window.
  useEffect(() => {
    if (!isExpanded || Platform.OS !== 'web') return;
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 900
      ) {
        loadMoreRef.current();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isExpanded]);

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
      detail={friendlyError(list.error)}
    />
  ) : !list.isPending && !list.isPlaceholderData && games.length === 0 ? (
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

  // Previous results are on screen while the new key resolves.
  const refining = list.isPlaceholderData;

  const gridHeader = searching ? (
    <View style={styles.gridHeader}>
      <SectionHeader
        title={`Results for “${debouncedQuery}”`}
        eyebrow={
          totalCount ? `${totalCount.toLocaleString()} games` : undefined
        }
      />
      <FilterBar value={refine} onChange={setRefine} />
      {refining && <ProgressLine />}
    </View>
  ) : !isHome ? (
    <View style={styles.gridHeader}>
      <CategoryHero
        section={section}
        lead={games[0]}
        count={totalCount}
        kind={GENRES.some((g) => g.key === section.key) ? 'genre' : 'discover'}
      />
      <FilterBar
        value={refine}
        onChange={setRefine}
        disabled={section.key === 'must-play'}
      />
      {refining && <ProgressLine />}
    </View>
  ) : null;

  const grid = (
    <FadeInView
      key={searching ? `s-${debouncedQuery}` : section.key}
      style={styles.gridFade}
    >
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
            <View style={[styles.gridCell, refining && styles.refining]}>
              <GameTile game={item} />
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
        refreshControl={refresh}
        onEndReached={loadMore}
        onEndReachedThreshold={1.2}
        ListHeaderComponent={gridHeader}
        ListFooterComponent={footerSpinner}
        style={!isExpanded && { height: windowHeight }}
        contentContainerStyle={[
          styles.gridContent,
          !isExpanded && { paddingTop: headerHeight },
          { paddingBottom: insets.bottom + SPACING.xl * 3 },
        ]}
      />
    </FadeInView>
  );

  // ------------------------------------------------------------- expanded
  if (isExpanded) {
    return (
      <Textured style={styles.background}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={[styles.expandedShell, { minHeight: windowHeight }]}>
            <Sidebar
              activeKey={searching ? null : isHome ? 'home' : selection}
              onHome={goHome}
              onSelect={selectSection}
              search={
                <SearchInput
                  value={query}
                  onChangeText={setQuery}
                  inputRef={searchRef}
                  style={styles.searchSidebar}
                />
              }
            />

            <View style={styles.main}>
              {status ??
                (list.isPending ? (
                  isHome ? (
                    <View style={styles.homeScroll}>
                      <SkeletonHero />
                      <SkeletonShelf inset={SPACING.xl} />
                      <SkeletonShelf inset={SPACING.xl} />
                    </View>
                  ) : (
                    <SkeletonGrid columns={columns} />
                  )
                ) : isHome ? (
                  <View style={styles.homeScroll}>
                    <FadeInView>
                      <FeaturedHero games={featured} />
                    </FadeInView>
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
                    <SiteFooter inset={SPACING.xl} />
                  </View>
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
        <Reveal
          pending={list.isPending}
          skeleton={
            <View style={{ paddingTop: headerHeight }}>
              {isHome ? (
                <SkeletonCompactHome />
              ) : (
                <View style={styles.compactShelves}>
                  {searching ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : (
                    <SkeletonCategory columns={columns} />
                  )}
                </View>
              )}
            </View>
          }
        >
          {status ??
            (isHome ? (
              <View style={[styles.compactHome, { paddingTop: headerHeight }]}>
                {featured.length > 0 && (
                  <View style={styles.carouselFrame}>
                    <Rail
                      data={featured}
                      keyExtractor={(item) => String(item.id)}
                      renderItem={(item) => <GameCard game={item} wide />}
                      inset={SPACING.md}
                      gap={SPACING.md}
                      snapInterval={LAYOUT.cardWideWidth + SPACING.md}
                    />
                  </View>
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
                <SiteFooter />
              </View>
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
                style={{ height: windowHeight }}
                contentContainerStyle={[
                  styles.list,
                  {
                    paddingTop: headerHeight,
                    paddingBottom: insets.bottom + SPACING.xl * 3,
                  },
                ]}
              />
            ) : (
              grid
            ))}
        </Reveal>

        <View
          style={[styles.headerFloat, { paddingTop: insets.top + SPACING.sm }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          {/* Opaque behind the controls, then a long dissolve. The grain
              rides the same curve, so the chrome melts into the textured
              page instead of ending on a visible seam. */}
          <LinearGradient
            colors={[
              COLORS.navy,
              COLORS.darkGrey,
              COLORS.darkGrey,
              'rgba(51,61,81,0.86)',
              'rgba(51,61,81,0.45)',
              'rgba(51,61,81,0)',
            ]}
            locations={[0, 0.34, 0.56, 0.74, 0.89, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <GrainScrim style={StyleSheet.absoluteFill} solidAt="band" />
          {/* Search is a mode, not a field wedged between the wordmark
              and the icons: tapping the glass hands the whole row over to
              the query, and dismissing gives the row back. */}
          {searchOpen ? (
            <View style={styles.titleRow}>
              <SearchInput
                value={query}
                onChangeText={setQuery}
                style={styles.searchFull}
                inputRef={searchRef}
                autoFocus
              />
              <Text style={styles.cancel} onPress={closeSearch}>
                Cancel
              </Text>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Text style={styles.wordmark} onPress={goHome}>
                SIDEQUEST
              </Text>
              <View style={styles.headerIcons}>
                <Ionicons
                  name="search"
                  size={21}
                  color={COLORS.lightGrey}
                  onPress={() => setSearchOpen(true)}
                  accessibilityLabel="Search games"
                  style={styles.libraryButton}
                />
                <Ionicons
                  name="map-outline"
                  size={21}
                  color={COLORS.lightGrey}
                  onPress={() => router.push('/plan')}
                  accessibilityLabel="The Plan"
                  style={styles.libraryButton}
                />
                <Ionicons
                  name="library-outline"
                  size={22}
                  color={COLORS.lightGrey}
                  onPress={() => router.push('/library')}
                  accessibilityLabel="My Library"
                  style={styles.libraryButton}
                />
              </View>
            </View>
          )}
          {!searchOpen && (
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
          )}
        </View>
      </View>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  container: { flex: 1 },

  // expanded
  expandedShell: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  main: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  searchSidebar: { width: '100%' },
  homeScroll: { flexGrow: 1 },

  // grid
  gridHeader: { marginBottom: SPACING.md, gap: SPACING.md },
  gridRow: { gap: LAYOUT.gridGap },
  gridContent: {
    gap: LAYOUT.gridGap,
    paddingHorizontal: SPACING.md,
  },
  gridSpacer: { flex: 1 },
  gridCell: { flex: 1 },
  refining: { opacity: 0.45 },
  gridFade: { flex: 1 },
  moreSpinner: { paddingVertical: SPACING.lg },

  // compact
  compactShell: { flexGrow: 1 },
  compactHome: { gap: SPACING.xs },
  carouselFrame: { paddingHorizontal: SPACING.md },
  compactShelves: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingBottom: SPACING.xl * 1.5,
  },
  headerFloat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: SPACING.xl,
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
  searchFull: { flex: 1, width: 'auto', maxWidth: undefined },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cancel: {
    fontFamily: 'Noah-Bold',
    fontSize: 13,
    color: COLORS.lightGrey,
    paddingHorizontal: SPACING.xs,
  },
  libraryButton: { padding: 4 },
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
