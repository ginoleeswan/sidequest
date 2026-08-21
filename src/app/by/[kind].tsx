import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { friendlyError, getGamesByCreator, type Creator } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SkeletonGrid } from '@/components/Skeleton';
import { Textured } from '@/components/Textured';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHydrated } from '@/hooks/useHydrated';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Everything by one studio or publisher.
 *
 * Search only ever looked at game titles, so the obvious question —
 * "what else did the people who made this make?" — had no answer. The
 * genre chips on a game page lead to a genre; this leads to a
 * catalogue.
 */
export default function ByCreatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded, columns } = useBreakpoint();
  const params = useLocalSearchParams<{
    kind?: string;
    id?: string;
    name?: string;
  }>();

  /**
   * The route's params are on the URL, and the pre-rendered HTML was
   * built without them. Reading them during the hydration render is the
   * classic mismatch: the file says "This studio" and the client says
   * "Supergiant Games", React throws the markup away, and the only
   * symptom is a console error in production. So the first client
   * render agrees with the file, and the name arrives on the next
   * commit. See hooks/useHydrated.
   */
  const hydrated = useHydrated();
  const kind: Creator['kind'] =
    hydrated && params.kind === 'publisher' ? 'publisher' : 'developer';
  const id = hydrated ? (params.id ?? '') : '';
  const name = hydrated ? (params.name ?? 'This studio') : 'This studio';

  const list = useInfiniteQuery({
    queryKey: ['creator', kind, id],
    queryFn: ({ pageParam }) => getGamesByCreator(kind, id, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: Paged<Game>, pages) =>
      last.next ? pages.length + 1 : undefined,
    enabled: id !== '',
  });

  const games = list.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <Textured style={styles.background}>
      <PageTitle>{`${name} — Sidequest`}</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton onImage />
        </View>
      )}

      <Screen
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage)
            list.fetchNextPage();
        }}
      >
        <View
          style={[
            styles.inner,
            {
              paddingTop: isExpanded
                ? SPACING.xl * 1.5
                : insets.top + SPACING.xl * 2,
            },
          ]}
        >
          <SectionHeader
            title={name}
            eyebrow={kind === 'developer' ? 'DEVELOPER' : 'PUBLISHER'}
          />
          {list.data?.pages[0]?.count ? (
            <Text style={styles.count}>
              {list.data.pages[0].count.toLocaleString()} games, newest first
            </Text>
          ) : null}

          {list.error ? (
            <Message
              icon="cloud-offline-outline"
              title="Couldn’t load that catalogue"
              detail={friendlyError(list.error)}
            />
          ) : list.isPending ? (
            <SkeletonGrid columns={columns} />
          ) : games.length === 0 ? (
            <Message
              icon="game-controller-outline"
              title="Nothing here"
              detail="RAWG has no games filed under this one."
              actionLabel="Back to browsing"
              onAction={() => router.push('/')}
            />
          ) : (
            <FlatList
              key={`grid-${columns}`}
              data={games}
              numColumns={columns}
              scrollEnabled={false}
              columnWrapperStyle={styles.gridRow}
              keyExtractor={(game) => String(game.id)}
              renderItem={({ item }) => (
                <View style={styles.cell}>
                  <GameTile game={item} />
                </View>
              )}
              onEndReached={() => {
                if (list.hasNextPage && !list.isFetchingNextPage)
                  list.fetchNextPage();
              }}
              onEndReachedThreshold={1.2}
            />
          )}
        </View>
        <SiteFooter />
      </Screen>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.md,
  },
  count: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.sm,
  },
  gridRow: { gap: SPACING.md },
  cell: { flex: 1, marginBottom: SPACING.md },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
