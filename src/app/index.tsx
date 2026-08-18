import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
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
import type { Game } from '@/api/types';
import { Chip } from '@/components/Chip';
import { DynamicIcon } from '@/components/DynamicIcon';
import { FeaturedHero } from '@/components/FeaturedHero';
import { GameCard } from '@/components/GameCard';
import { GameInfoCard } from '@/components/GameInfoCard';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { Rail } from '@/components/Rail';
import { SearchInput } from '@/components/SearchInput';
import { Shelf } from '@/components/Shelf';
import {
  SkeletonCompactHome,
  SkeletonGrid,
  SkeletonHero,
  SkeletonShelf,
} from '@/components/Skeleton';
import { Sidebar } from '@/components/Sidebar';
import { Textured } from '@/components/Textured';
import {
  CATEGORIES,
  SEARCH_SECTION,
  type Category,
} from '@/constants/categories';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDebounced } from '@/hooks/useDebounced';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const FEATURED_COUNT = 4;

/** Categories rendered as storefront shelves on the desktop Home. */
const SHELF_KEYS = ['must-play', 'indie', 'rpg', 'adventure', 'strategy'];
const SHELF_CATEGORIES = SHELF_KEYS.map((key) =>
  CATEGORIES.find((c) => c.key === key)!
);

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
  // 'home' = desktop storefront; otherwise a category key.
  const [selection, setSelection] = useState<'home' | string>('home');

  const debouncedQuery = useDebounced(query);
  const searching = debouncedQuery.trim() !== '';
  const isHome = selection === 'home';
  const category = CATEGORIES.find((c) => c.key === selection) ?? CATEGORIES[0];

  const { isExpanded, columns } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const searchRef = useRef<TextInput | null>(null);

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

  const { data, isPending, isRefetching, error, refetch } = useQuery({
    queryKey: searching
      ? queryKeys.search(debouncedQuery)
      : queryKeys.games(category.key),
    queryFn: () => (searching ? searchGames(debouncedQuery) : category.fetch()),
    select: (result) => result.results,
  });

  // Desktop Home shelves. Cached queries, only live while the shelves show.
  const shelfResults = useQueries({
    queries: SHELF_CATEGORIES.map((shelf) => ({
      queryKey: queryKeys.games(shelf.key),
      queryFn: () => shelf.fetch(),
      select: (result: { results: Game[] }) => result.results,
      enabled: isExpanded && isHome && !searching,
    })),
  });

  const games = data ?? [];
  const section = searching
    ? SEARCH_SECTION
    : isHome && isExpanded
      ? { ...CATEGORIES[0], title: 'Home' }
      : category;
  const featured = searching ? [] : games.slice(0, FEATURED_COUNT);
  const listed = searching ? games : games.slice(FEATURED_COUNT);

  const selectCategory = (c: Category) => {
    setQuery('');
    setSelection(c.key);
  };
  const goHome = () => {
    setQuery('');
    setSelection('home');
  };

  const status = renderStatus({
    error,
    empty: !isPending && games.length === 0,
    searching,
    debouncedQuery,
    onClearSearch: () => setQuery(''),
  });

  const refresh = (
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={refetch}
      tintColor={COLORS.lightGrey}
    />
  );

  // ------------------------------------------------------------- expanded
  if (isExpanded) {
    const showShelves = isHome && !searching;

    return (
      <Textured style={styles.background}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.expandedShell}>
            <Sidebar
              activeKey={searching ? null : isHome ? 'home' : selection}
              onHome={goHome}
              onSelect={selectCategory}
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
                  inputRef={searchRef}
                  showShortcutHint
                />
              </View>

              {status ??
                (isPending ? (
                  showShelves ? (
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
                ) : showShelves ? (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.homeScroll}
                  >
                    <FeaturedHero games={featured} />
                    <Shelf
                      category={CATEGORIES[0]}
                      games={listed}
                      onViewAll={selectCategory}
                      inset={SPACING.xl}
                    />
                    {SHELF_CATEGORIES.map((shelf, index) => (
                      <Shelf
                        key={shelf.key}
                        category={shelf}
                        games={shelfResults[index].data ?? []}
                        onViewAll={selectCategory}
                        inset={SPACING.xl}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <FlatList
                    // numColumns is immutable per instance; remount on change.
                    key={`grid-${columns}`}
                    data={padToRows(games, columns)}
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
                    showsVerticalScrollIndicator={false}
                    refreshControl={refresh}
                  />
                ))}
            </View>
          </View>
        </SafeAreaView>
      </Textured>
    );
  }

  // -------------------------------------------------------------- compact
  const compactSection = searching ? SEARCH_SECTION : category;

  return (
    <Textured style={styles.background}>
      <SafeAreaView style={styles.container} edges={['right', 'top', 'left']}>
        <View style={styles.compactShell}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.wordmark}>SIDEQUEST</Text>
              <SearchInput
                value={query}
                onChangeText={setQuery}
                style={styles.searchCompact}
              />
            </View>
            <FlatList
              data={CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Chip
                  title={item.title}
                  selected={!searching && category.key === item.key}
                  iconName={item.iconName}
                  iconType={item.iconType}
                  onPress={() => selectCategory(item)}
                />
              )}
              contentContainerStyle={styles.chips}
            />
          </View>

          {status ??
            (isPending ? (
              <SkeletonCompactHome />
            ) : (
              <FlatList
                data={listed}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <GameInfoCard game={item} />}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                refreshControl={refresh}
                ListHeaderComponent={
                  <View>
                    {featured.length > 0 && (
                      <View style={styles.carouselBleed}>
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
                    <View style={styles.sectionRow}>
                      <DynamicIcon
                        type={compactSection.iconType}
                        name={compactSection.iconName}
                        color={COLORS.mediumGrey}
                      />
                      <Text style={[TYPE.h3, styles.sectionTitle]}>
                        {compactSection.title}
                      </Text>
                    </View>
                  </View>
                }
                ListFooterComponent={
                  <Text style={styles.attribution}>Game data by RAWG</Text>
                }
                contentContainerStyle={[
                  styles.list,
                  { paddingBottom: insets.bottom + SPACING.xl * 2 },
                ]}
              />
            ))}
        </View>
      </SafeAreaView>
    </Textured>
  );
}

interface StatusArgs {
  error: unknown;
  empty: boolean;
  searching: boolean;
  debouncedQuery: string;
  onClearSearch: () => void;
}

/** Error / empty, or null when there is content (or a skeleton) to show. */
function renderStatus({
  error,
  empty,
  searching,
  debouncedQuery,
  onClearSearch,
}: StatusArgs) {
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
        actionLabel="Clear search"
        onAction={onClearSearch}
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
  homeScroll: { paddingBottom: SPACING.xl },
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
    fontSize: 22,
    color: COLORS.lightGrey,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  searchCompact: { flex: 1, width: 'auto', maxWidth: 230 },
  attribution: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  chips: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 50,
  },
  list: { flexGrow: 1, paddingHorizontal: SPACING.md },

  // shared
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  carouselBleed: { marginBottom: SPACING.sm },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
