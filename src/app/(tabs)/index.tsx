import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Ionicons from '@expo/vector-icons/Ionicons';

import { queryKeys } from '@/api/queryClient';
import {
  friendlyError,
  getGames,
  searchCreators,
  searchGames,
} from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { RouteError } from '@/components/RouteError';
import { Chip } from '@/components/Chip';
import { FadeInView } from '@/components/FadeInView';
import { SiteFooter } from '@/components/SiteFooter';
import { HomeStage } from '@/components/HomeStage';
import { GameInfoCard } from '@/components/GameInfoCard';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PromptBand } from '@/components/PromptBand';
import { Billboard } from '@/components/Billboard';
import { DiscoverRail } from '@/components/DiscoverRail';
import { MoodShelf } from '@/components/MoodShelf';
import { RecentShelf } from '@/components/RecentShelf';
import { SeriesNews } from '@/components/SeriesNews';
import { SearchInput } from '@/components/SearchInput';
import { SectionHeader } from '@/components/SectionHeader';
import { Shelf } from '@/components/Shelf';
import { WhenNear } from '@/components/WhenNear';
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
import { Mark } from '@/components/Mark';
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
  QUICK_WINS,
  SHELF_POOL,
  type Section,
} from '@/constants/categories';
import { useHydrated } from '@/hooks/useHydrated';
import { useStage } from '@/hooks/useStage';
import { stageHeight as stageHeightFor } from '@/lib/stage';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import {
  becauseYouFinished,
  becauseYouSaved,
  dedupeGames,
  feedSeed,
  likeYouFinish,
  seededRandom,
  tonightsShape,
  pickShelves,
  withinLength,
  withoutOwned,
} from '@/lib/homeFeed';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useDebounced } from '@/hooks/useDebounced';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

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

  /**
   * Studios and publishers matching the same words.
   *
   * "Supergiant" used to find nothing at all, because search only ever
   * looked at game titles. Asked only while searching, and only for
   * something long enough to mean a name.
   */
  const creators = useQuery({
    queryKey: ['creators', debouncedQuery],
    queryFn: () => searchCreators(debouncedQuery),
    enabled: searching && debouncedQuery.trim().length >= 3,
    staleTime: 10 * 60 * 1000,
  });

  /**
   * Today's storefront.
   *
   * The pre-rendered HTML is built from the fixed HOME_SHELVES, so that
   * is what the hydration render must show; once the client knows what
   * day it is and what is in the library, the rotation takes over. See
   * lib/homeFeed for why it turns over daily rather than per refresh.
   */
  const hydrated = useHydrated();
  const { entries: libraryEntries } = useLibrary();
  const { durationOf } = useDurations();
  const library = useMemo(
    () => Object.values(libraryEntries),
    [libraryEntries]
  );
  const [today] = useState(() => Date.now());

  const homeShelves = useMemo(() => {
    if (!hydrated) return HOME_SHELVES;
    return [
      HOME_SHELVES[0],
      ...pickShelves(SHELF_POOL, 4, feedSeed(today, library)),
    ];
  }, [hydrated, today, library]);

  const shelves = useQueries({
    queries: homeShelves.map((shelf) => ({
      queryKey: queryKeys.shelf(shelf.key),
      queryFn: () => shelf.fetch(1),
      select: (r: Paged<Game>) => r.results,
      enabled: isHome,
    })),
  });

  /** Two rows nothing else can build: your mood, and your length. */
  const personal = useMemo(() => {
    if (!hydrated) return { mood: null, finished: null, length: null };
    return {
      mood: becauseYouSaved(library),
      finished: becauseYouFinished(library),
      length: likeYouFinish(library, (entry) => durationOf(entry.game).hours),
    };
  }, [hydrated, library, durationOf]);

  const moodShelf = useQuery({
    queryKey: ['personal', personal.mood?.key],
    queryFn: () => getGames(personal.mood?.genre, 1),
    select: (r: Paged<Game>) => r.results,
    enabled: isHome && personal.mood != null,
    staleTime: 30 * 60 * 1000,
  });

  // "Because you finished X" - fetched the same way the saved-mood row
  // is, and shown only when it would not repeat that row's genre.
  const finishedShelf = useQuery({
    queryKey: ['personal', personal.finished?.key],
    queryFn: () => getGames(personal.finished?.genre, 1),
    select: (r: Paged<Game>) => r.results,
    enabled:
      isHome &&
      personal.finished != null &&
      personal.finished.genre !== personal.mood?.genre,
    staleTime: 30 * 60 * 1000,
  });

  const fetched = dedupeById(list.data?.pages.flatMap((p) => p.results) ?? []);
  /**
   * A storefront that keeps offering the game you saved last week is a
   * goldfish. The library is empty until hydration, so this is a no-op
   * on the pre-rendered render and takes effect on the next commit.
   */
  const games = useMemo(
    () => withoutOwned(fetched, library),
    [fetched, library]
  );
  const totalCount = list.data?.pages[0]?.count ?? 0;
  const featured = isHome ? games.slice(0, FEATURED_COUNT) : [];
  // No extra request: the short games out of everything already fetched.
  /**
   * The shortlist knows what day it is. A weekend has room for a
   * weekend-sized game; a Tuesday evening has two or three hours, and
   * offering it an eight-hour game is how a backlog grows.
   */
  const session = tonightsShape(today);
  const quickWins = useMemo(
    () =>
      isHome
        ? games
            .filter((g) => g.playtime > 0 && g.playtime <= session.maxHours)
            .slice(0, 12)
        : [],
    [games, isHome, session.maxHours]
  );
  const trendingShelf = isHome ? games.slice(FEATURED_COUNT) : [];
  /**
   * The mid-feed break: one game with the whole frame. Seeded like the
   * shelves so it holds all day, and drawn from past the tiles the
   * rows above will show, so the billboard is a discovery rather than
   * a repeat at a larger size.
   */
  const billboard = useMemo(() => {
    if (!isHome || !hydrated) return null;
    const pool = trendingShelf.slice(12, 30);
    if (pool.length === 0) return null;
    return pool[
      Math.floor(seededRandom(feedSeed(today, library) + 7)() * pool.length)
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trendingShelf derives from games
  }, [isHome, hydrated, games, today, library]);

  /**
   * The opening argument, and how much room to give it.
   *
   * Tall enough that the first screen is one picture rather than the top
   * third of a shelf, capped so a desktop monitor doesn't get a
   * billboard, and floored so a short laptop window still has a stage.
   */
  const stage = useStage({
    trending: featured,
    short: quickWins,
    enabled: isHome,
  });
  const stageHeight = stageHeightFor(windowHeight, isExpanded);

  /** No extra request: the right-length games out of what is loaded. */
  const lengthShelf = useMemo(
    () =>
      isHome && personal.length
        ? withinLength(games, personal.length.window!).slice(0, 12)
        : [],
    [isHome, personal.length, games]
  );

  /**
   * Each rotating row gets games no row above it already showed.
   *
   * The shelves are independent RAWG queries, so nothing stopped the
   * same game turning up in Shooter and again in Adventure — or, since
   * RAWG carries some releases under two entries, twice inside one row
   * as "The Sinking City 2" and "Sinking City 2". Two rows on one screen
   * offering the same game is the kind of thing nobody reports and
   * everybody notices.
   *
   * Seeded with what the rows above these already spent, in the order
   * the page reads.
   */
  const shelfGames = (() => {
    const seen = new Set<string>();
    dedupeGames(quickWins, seen);
    dedupeGames(trendingShelf.slice(0, 12), seen);
    dedupeGames(lengthShelf, seen);
    return homeShelves.map((_, index) =>
      dedupeGames(withoutOwned(shelves[index]?.data ?? [], library), seen)
    );
  })();

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
    if (Platform.OS !== 'web') return;
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
  }, []);

  const refresh = (
    <RefreshControl
      refreshing={list.isRefetching && !list.isFetchingNextPage}
      onRefresh={list.refetch}
      tintColor={COLORS.lightGrey}
    />
  );

  // Every list ends on the footer band, so the document's last pixels are
  // the colour Safari paints its toolbar with.
  const listEnd = (
    <>
      {list.isFetchingNextPage && (
        <View style={styles.moreSpinner}>
          <ActivityIndicator color={COLORS.mediumGrey} />
        </View>
      )}
      <SiteFooter inset={isExpanded ? SPACING.xl : GUTTER} />
    </>
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
      {(creators.data?.length ?? 0) > 0 && (
        <View style={styles.creatorRow}>
          <Text style={styles.creatorLabel}>Also by</Text>
          {creators.data?.map((creator) => (
            <Chip
              key={`${creator.kind}-${creator.id}`}
              title={`${creator.name} (${creator.gamesCount})`}
              onPress={() =>
                router.push({
                  pathname: '/by/[kind]',
                  params: {
                    kind: creator.kind,
                    id: String(creator.id),
                    name: creator.name,
                  },
                })
              }
            />
          ))}
        </View>
      )}
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
        style={styles.listNative}
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
        ListFooterComponent={listEnd}
        // No height of its own: the document scrolls, so rows run past the
        // bottom of the viewport and under iOS Safari's toolbar exactly
        // the way the home page does.
        contentContainerStyle={[
          styles.gridContent,
          !isExpanded && { paddingTop: headerHeight },
          Platform.OS !== 'web' && {
            paddingBottom: insets.bottom,
          },
        ]}
      />
    </FadeInView>
  );

  // ------------------------------------------------------------- expanded
  if (isExpanded) {
    return (
      <Textured style={styles.background}>
        <PageTitle>Sidequest — Discover your next game</PageTitle>
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
                  <Screen style={styles.homeScroll}>
                    <FadeInView>
                      <View style={styles.stageBleedWide}>
                        <HomeStage
                          slides={stage}
                          games={games}
                          headerHeight={0}
                          height={stageHeight}
                          // A masthead's margin, not a shelf's: the copy
                          // sits a step further into the picture than
                          // the rails below sit into the page.
                          inset={SPACING.xl * 1.5}
                        />
                      </View>
                    </FadeInView>
                    <SeriesNews inset={SPACING.xl} />
                    <RecentShelf inset={SPACING.xl} />
                    <Shelf
                      section={{
                        ...QUICK_WINS,
                        title: session.title,
                        eyebrow: session.eyebrow,
                      }}
                      games={quickWins}
                      inset={SPACING.xl}
                    />
                    <Shelf
                      section={DISCOVER[0]}
                      games={trendingShelf}
                      onViewAll={selectSection}
                      inset={SPACING.xl}
                    />
                    {billboard ? (
                      <View style={styles.billboardSlotWide}>
                        <Billboard game={billboard} />
                      </View>
                    ) : null}
                    <MoodShelf onOpen={selectSection} inset={SPACING.xl} />
                    <PromptBand inset={SPACING.xl} />
                    {personal.mood && (moodShelf.data?.length ?? 0) > 0 && (
                      <Shelf
                        section={{
                          ...DISCOVER[0],
                          key: personal.mood.key,
                          title: personal.mood.title,
                          eyebrow: personal.mood.eyebrow,
                        }}
                        games={withoutOwned(moodShelf.data ?? [], library)}
                        inset={SPACING.xl}
                      />
                    )}
                    {personal.finished &&
                      (finishedShelf.data?.length ?? 0) > 0 && (
                        <Shelf
                          section={{
                            ...DISCOVER[0],
                            key: personal.finished.key,
                            title: personal.finished.title,
                            eyebrow: personal.finished.eyebrow,
                          }}
                          games={withoutOwned(
                            finishedShelf.data ?? [],
                            library
                          )}
                          inset={SPACING.xl}
                        />
                      )}
                    {personal.length && lengthShelf.length > 0 && (
                      <Shelf
                        section={{
                          ...QUICK_WINS,
                          key: personal.length.key,
                          title: personal.length.title,
                          eyebrow: personal.length.eyebrow,
                        }}
                        games={lengthShelf}
                        inset={SPACING.xl}
                      />
                    )}
                    {homeShelves.map((shelf, index) => (
                      <WhenNear
                        key={shelf.key}
                        placeholder={
                          <SkeletonShelf
                            inset={SPACING.xl}
                            eyebrow={shelf.variant === 'ranked'}
                          />
                        }
                      >
                        <Shelf
                          section={shelf}
                          games={shelfGames[index] ?? []}
                          onViewAll={selectSection}
                          inset={SPACING.xl}
                        />
                      </WhenNear>
                    ))}
                    <View style={styles.installSlotWide}>
                      <InstallPrompt />
                    </View>
                    <SiteFooter inset={SPACING.xl} />
                  </Screen>
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
      <PageTitle>Sidequest — Discover your next game</PageTitle>
      <View style={styles.compactShell}>
        <Reveal
          pending={list.isPending}
          skeleton={
            // Only the non-home bones clear the header: the home stage
            // runs up behind it, so its skeleton starts at the top of
            // the document exactly as the stage does.
            <View>
              {isHome ? (
                <SkeletonCompactHome />
              ) : (
                <View
                  style={[styles.compactShelves, { paddingTop: headerHeight }]}
                >
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
              <Screen
                style={[
                  styles.compactHome,
                  stage.length === 0 && { paddingTop: headerHeight },
                ]}
              >
                <HomeStage
                  slides={stage}
                  games={games}
                  headerHeight={headerHeight}
                  height={stageHeight}
                  // The page's gutter, not the component's own default:
                  // left unsaid, the headline stood at 16 while every
                  // shelf beneath it stood at 20.
                  inset={GUTTER}
                />
                <View style={styles.compactShelves}>
                  <DiscoverRail onOpen={selectSection} inset={GUTTER} />
                  <SeriesNews inset={GUTTER} />
                  <RecentShelf inset={GUTTER} />
                  <Shelf
                    section={{
                      ...QUICK_WINS,
                      title: session.title,
                      eyebrow: session.eyebrow,
                    }}
                    games={quickWins}
                    inset={GUTTER}
                  />
                  <Shelf
                    section={DISCOVER[0]}
                    games={trendingShelf.slice(0, 12)}
                    onViewAll={selectSection}
                    inset={GUTTER}
                  />
                  {billboard ? (
                    <View style={styles.billboardSlot}>
                      <Billboard game={billboard} />
                    </View>
                  ) : null}
                  <MoodShelf onOpen={selectSection} inset={GUTTER} />
                  {/* Deep enough in to be a break in the rhythm rather
                      than a second header, and above the rows that are
                      about you rather than about the shop. */}
                  <PromptBand inset={GUTTER} />
                  {personal.mood && (moodShelf.data?.length ?? 0) > 0 && (
                    <Shelf
                      section={{
                        ...DISCOVER[0],
                        key: personal.mood.key,
                        title: personal.mood.title,
                        eyebrow: personal.mood.eyebrow,
                      }}
                      games={withoutOwned(moodShelf.data ?? [], library).slice(
                        0,
                        12
                      )}
                      inset={GUTTER}
                    />
                  )}
                  {personal.finished &&
                    (finishedShelf.data?.length ?? 0) > 0 && (
                      <Shelf
                        section={{
                          ...DISCOVER[0],
                          key: personal.finished.key,
                          title: personal.finished.title,
                          eyebrow: personal.finished.eyebrow,
                        }}
                        games={withoutOwned(
                          finishedShelf.data ?? [],
                          library
                        ).slice(0, 12)}
                        inset={GUTTER}
                      />
                    )}
                  {personal.length && lengthShelf.length > 0 && (
                    <Shelf
                      section={{
                        ...QUICK_WINS,
                        key: personal.length.key,
                        title: personal.length.title,
                        eyebrow: personal.length.eyebrow,
                      }}
                      games={lengthShelf}
                      inset={GUTTER}
                    />
                  )}
                  {homeShelves.map((shelf, index) => (
                    <WhenNear
                      key={shelf.key}
                      placeholder={
                        <SkeletonShelf
                          inset={GUTTER}
                          eyebrow={shelf.variant === 'ranked'}
                        />
                      }
                    >
                      <Shelf
                        section={shelf}
                        games={(shelfGames[index] ?? []).slice(0, 12)}
                        onViewAll={selectSection}
                        inset={GUTTER}
                      />
                    </WhenNear>
                  ))}
                  <View style={styles.installSlot}>
                    <InstallPrompt />
                  </View>
                </View>
                <SiteFooter />
              </Screen>
            ) : searching ? (
              <FlatList
                data={games}
                style={styles.listNative}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => <GameInfoCard game={item} />}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={1.2}
                ListHeaderComponent={gridHeader}
                ListFooterComponent={listEnd}
                contentContainerStyle={[
                  styles.list,
                  { paddingTop: headerHeight },
                  Platform.OS !== 'web' && {
                    paddingBottom: insets.bottom,
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
          {/* Opaque behind the wordmark only, then a long dissolve the
              chips ride down.

              This used to stay solid for 72 of its 128 pixels, which put
              the chip row inside the chrome and left the whole dissolve
              below them carrying nothing — a fade for its own sake, and
              128 pixels of artwork spent on a bar. The opaque band now
              ends under the wordmark, so the chips sit on the lip with
              the picture coming up behind them. */}
          <LinearGradient
            colors={[
              COLORS.navy,
              COLORS.darkGrey,
              'rgba(51,61,81,0.72)',
              'rgba(51,61,81,0.34)',
              'rgba(51,61,81,0)',
            ]}
            locations={[0, 0.3, 0.52, 0.78, 1]}
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
              <Pressable
                onPress={goHome}
                style={styles.brand}
                accessibilityRole="link"
                accessibilityLabel="Sidequest home"
              >
                <Mark size={20} />
                <Text style={styles.wordmark}>SIDEQUEST</Text>
              </Pressable>
              <View style={styles.headerIcons}>
                <Ionicons
                  name="search"
                  size={21}
                  color={COLORS.lightGrey}
                  onPress={() => setSearchOpen(true)}
                  accessibilityLabel="Search games"
                  style={styles.libraryButton}
                />
                {/* The one destination the tab bar does not carry. */}
                <Ionicons
                  name="person-circle-outline"
                  size={23}
                  color={COLORS.lightGrey}
                  onPress={() => router.push('/you')}
                  accessibilityLabel="You"
                  style={styles.libraryButton}
                />
              </View>
            </View>
          )}
          {/* Off the home page only. On a section page this row is the
              page's own navigation and the current section is marked;
              on home the same sections are the feed's first row,
              below the masthead, so the artwork carries nothing but
              the wordmark. Bare here as well: a ring and a glyph are a
              control's costume, and a row of eight reads as a toolbar. */}
          {!searchOpen && !isHome && (
            <FlatList
              data={CHIP_SECTIONS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <Chip
                  title={item.title}
                  selected={!searching && section.key === item.key}
                  bare
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
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  creatorLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  gridHeader: { marginBottom: SPACING.md, gap: SPACING.md },
  gridRow: { gap: LAYOUT.gridGap },
  gridContent: {
    gap: LAYOUT.gridGap,
    paddingHorizontal: GUTTER,
  },
  gridSpacer: { flex: 1 },
  gridCell: { flex: 1 },
  refining: { opacity: 0.45 },
  gridFade: { flex: 1 },
  moreSpinner: { paddingVertical: SPACING.lg },

  // compact
  compactShell: { flexGrow: 1 },
  /** Out past the content column's padding, flush to the sidebar and the top. */
  stageBleedWide: {
    marginHorizontal: -SPACING.xl,
    marginTop: -SPACING.lg,
    marginBottom: SPACING.lg,
  },
  // The stage runs to the edges and ends on navy, so the shelves start
  // straight after it with no seam and no gap of their own to explain.
  compactHome: { gap: 0 },
  compactShelves: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl * 1.5,
  },
  /** An offer, not an interruption: last thing before the footer. */
  /** A shelf-sized break: the shelf margin below, the page gutter at the sides. */
  billboardSlot: { paddingHorizontal: GUTTER, marginBottom: SPACING.xl },
  billboardSlotWide: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  installSlot: { paddingTop: SPACING.lg },
  installSlotWide: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerFloat: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: SPACING.xl,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: GUTTER,
    // Clear of the opaque band, so the chips land on the dissolve.
    marginBottom: SPACING.md + 2,
  },
  wordmark: {
    ...TYPE.h1,
    color: COLORS.lightGrey,
    flexShrink: 0,
  },
  searchFull: { flex: 1, width: 'auto', maxWidth: undefined },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cancel: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    paddingHorizontal: SPACING.xs,
  },
  libraryButton: { padding: 4 },
  chips: {
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    gap: SPACING.sm,
    height: 46,
  },

  list: { flexGrow: 1, paddingHorizontal: GUTTER },
  // Web: the document scrolls, so the lists must not claim a viewport of
  // their own. Native: without flex a list sizes to its content and never
  // scrolls.
  listNative: Platform.OS === 'web' ? {} : { flex: 1 },
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
