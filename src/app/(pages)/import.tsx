import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { importSteamGames } from '@/api/steamImport';
import { steamLibrary, type SteamSnapshot } from '@/api/steam';
import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useLibrary } from '@/lib/library';
import { formatHours } from '@/lib/duration';
import { hoursOf, importOrder, type SteamGame } from '@/lib/steamMatch';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * How many games one import may bring in.
 *
 * Every game is a lookup, and a 400-game library imported wholesale is
 * 400 requests and a plan nobody can read. The cap is a product
 * decision as much as a technical one: the point is the games someone
 * might actually play, not a complete inventory.
 */
const MAX_PICKS = 60;

/** Steam counts a game as "recently played" over the last fortnight. */
type Filter = 'recent' | 'unplayed' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'recent', label: 'Played lately' },
  { key: 'unplayed', label: 'Never started' },
  { key: 'all', label: 'Everything' },
];

function matches(game: SteamGame, filter: Filter): boolean {
  if (filter === 'recent') return game.minutes2Weeks > 0;
  if (filter === 'unplayed') return game.minutesForever === 0;
  return true;
}

function GameRow({
  game,
  picked,
  onToggle,
}: {
  game: SteamGame;
  picked: boolean;
  onToggle: () => void;
}) {
  const played = hoursOf(game.minutesForever);
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.row, picked && styles.rowPicked]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked }}
      // See tidy.tsx: web reads aria-checked, not accessibilityState.
      aria-checked={picked}
      accessibilityLabel={game.name}
    >
      <View style={[styles.box, picked && styles.boxOn]}>
        {picked && (
          <Ionicons name="checkmark" size={13} color={COLORS.darkGrey} />
        )}
      </View>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {game.name}
      </Text>
      <Text style={styles.rowMeta}>
        {game.minutes2Weeks > 0
          ? `${formatHours(hoursOf(game.minutes2Weeks))} this fortnight`
          : played > 0
            ? `${formatHours(played)} played`
            : 'never started'}
      </Text>
    </Pressable>
  );
}

/**
 * Bringing a Steam library in.
 *
 * Deliberately a review screen rather than a button. A backlog is
 * personal: the 300 games in a Steam account include bundle leftovers,
 * gifts and things bought in a sale in 2016, and importing all of them
 * would bury the two games someone actually wants to finish. So this
 * offers the library in the order that matters — what you are playing,
 * then what you have played — and imports what is chosen.
 */
export default function ImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const { addGames } = useLibrary();
  const toast = useToast();

  const [snapshot] = usePersistedState<SteamSnapshot | null>(
    'sidequest.steam.v1',
    null
  );
  const [games, setGames] = useState<SteamGame[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('recent');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [unmatched, setUnmatched] = useState<SteamGame[] | null>(null);

  const steamid = snapshot?.steamid;
  useEffect(() => {
    if (!steamid) return;
    let alive = true;
    steamLibrary(steamid)
      .then((list) => alive && setGames(importOrder(list)))
      .catch(
        (error: unknown) =>
          alive &&
          setLoadError(
            error instanceof Error ? error.message : 'Steam did not answer'
          )
      );
    return () => {
      alive = false;
    };
  }, [steamid]);

  const shown = useMemo(
    () => (games ?? []).filter((game) => matches(game, filter)),
    [games, filter]
  );

  const toggle = (appid: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(appid)) next.delete(appid);
      else if (next.size < MAX_PICKS) next.add(appid);
      return next;
    });

  const pickAllShown = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const game of shown) {
        if (next.size >= MAX_PICKS) break;
        next.add(game.appid);
      }
      return next;
    });

  const runImport = async () => {
    const chosen = (games ?? []).filter((game) => picked.has(game.appid));
    if (chosen.length === 0) return;
    setProgress({ done: 0, total: chosen.length });
    const { matched, unmatched: missed } = await importSteamGames(
      chosen,
      (done, total) => setProgress({ done, total })
    );
    addGames(
      matched.map(({ game, steam, hoursPlayed }) => ({
        game,
        // Something played in the last fortnight is under way, whatever
        // else it is. The rest join the pile to choose from.
        status:
          steam.minutes2Weeks > 0
            ? ('playing' as const)
            : ('wishlist' as const),
        hoursPlayed,
        steamAppId: steam.appid,
      }))
    );
    setProgress(null);
    setPicked(new Set());
    setUnmatched(missed);
    toast(
      `Imported ${matched.length} ${matched.length === 1 ? 'game' : 'games'}`,
      'logo-steam'
    );
    if (missed.length === 0) router.push('/plan');
  };

  const body = () => {
    if (!snapshot)
      return (
        <Message
          icon="logo-steam"
          title="Connect Steam first"
          detail="The Plan can measure your pace from Steam — connect there, then come back and bring your library in."
          actionLabel="Go to The Plan"
          onAction={() => router.push('/plan')}
        />
      );

    if (loadError)
      return (
        <Message
          icon="cloud-offline-outline"
          title="Couldn’t read your Steam library"
          detail={loadError}
        />
      );

    if (!games)
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.mediumGrey} />
          <Text style={styles.loadingText}>Reading your Steam library…</Text>
        </View>
      );

    return (
      <>
        <View style={styles.filters}>
          {FILTERS.map((option) => (
            <Chip
              key={option.key}
              title={option.label}
              selected={filter === option.key}
              onPress={() => setFilter(option.key)}
            />
          ))}
        </View>

        <View style={styles.selectRow}>
          <Text style={styles.selectCount}>
            {picked.size} of {MAX_PICKS} chosen
          </Text>
          <Pressable onPress={pickAllShown} accessibilityRole="button">
            <Text style={styles.selectAll}>Choose all shown</Text>
          </Pressable>
          {picked.size > 0 && (
            <Pressable
              onPress={() => setPicked(new Set())}
              accessibilityRole="button"
            >
              <Text style={styles.selectAll}>Clear</Text>
            </Pressable>
          )}
        </View>

        {shown.length === 0 ? (
          <Message
            icon="game-controller-outline"
            title="Nothing here"
            detail="No games in your Steam library match that filter."
          />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(game) => String(game.appid)}
            renderItem={({ item }) => (
              <GameRow
                game={item}
                picked={picked.has(item.appid)}
                onToggle={() => toggle(item.appid)}
              />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {unmatched && unmatched.length > 0 && (
          <View style={styles.unmatched}>
            <SectionHeader
              title="Couldn’t be matched"
              eyebrow={`${unmatched.length} games`}
            />
            <Text style={styles.unmatchedNote}>
              These are on Steam under a name the games database doesn’t use.
              Search for them here and save them by hand — their length will
              still be right.
            </Text>
            {unmatched.slice(0, 12).map((game) => (
              <Text key={game.appid} style={styles.unmatchedName}>
                {game.name}
              </Text>
            ))}
          </View>
        )}
      </>
    );
  };

  const bar =
    picked.size > 0 ? (
      <View
        style={[
          styles.bar,
          !STICKY && styles.barFloating,
          { paddingBottom: insets.bottom + SPACING.md },
        ]}
      >
        <Pressable
          onPress={runImport}
          disabled={progress != null}
          style={[styles.import, progress != null && styles.importBusy]}
          accessibilityRole="button"
        >
          {progress ? (
            <Text style={styles.importText}>
              Matching {progress.done} of {progress.total}…
            </Text>
          ) : (
            <Text style={styles.importText}>
              Import {picked.size} {picked.size === 1 ? 'game' : 'games'}
            </Text>
          )}
        </Pressable>
      </View>
    ) : null;

  return (
    <Textured style={styles.background}>
      <PageTitle>Import from Steam — Sidequest</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

      <Screen>
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
            title="Your Steam library"
            eyebrow={
              snapshot
                ? `${snapshot.gameCount.toLocaleString()} games · ${snapshot.name}`
                : undefined
            }
          />
          <Text style={styles.lede}>
            Bring in the ones you might actually play. Sidequest keeps the hours
            you have already put in, so the plan counts what is left rather than
            starting you at zero.
          </Text>
          {body()}
        </View>

        {/* Sticky on the web, in the document; on native the bar is a
            sibling of the scroller, and this is only its room. */}
        {STICKY ? (
          bar
        ) : picked.size > 0 ? (
          <View style={styles.barRoom} />
        ) : null}
        <SiteFooter />
      </Screen>
      {STICKY ? null : bar}
    </Textured>
  );
}

/** Where a bar can pin itself: the browser knows sticky, Yoga does not. */
const STICKY = Platform.OS === 'web';

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xl * 3,
    gap: SPACING.md,
  },
  lede: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  loading: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  selectCount: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    flex: 1,
  },
  selectAll: {
    ...TYPE.labelTiny,
    color: COLORS.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  rowPicked: { backgroundColor: 'rgba(255,255,255,0.04)' },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  rowTitle: {
    ...TYPE.label,
    color: COLORS.lightGrey,
    flex: 1,
  },
  rowMeta: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
  separator: { height: 1, backgroundColor: COLORS.stroke },
  unmatched: { gap: SPACING.sm, marginTop: SPACING.lg },
  unmatchedNote: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
  },
  unmatchedName: {
    ...TYPE.caption,
    color: COLORS.lightGrey,
  },
  bar: {
    ...(STICKY
      ? { position: 'sticky' as unknown as 'absolute', bottom: 0 }
      : null),
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.darkGrey,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  barFloating: { position: 'absolute', bottom: 0 },
  /** The height a floating bar covers, paid back under the list. */
  barRoom: { height: 112 },
  import: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
  },
  importBusy: { opacity: 0.6 },
  importText: {
    ...TYPE.label,
    color: COLORS.darkGrey,
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
