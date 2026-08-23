import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Game } from '@/api/types';
import { RouteError } from '@/components/RouteError';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { FadeInView } from '@/components/FadeInView';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { importTitles } from '@/api/steamImport';
import { parseCsv } from '@/lib/csvImport';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import {
  libraryStats,
  SORT_LABELS,
  sortLibrary,
  type LibrarySort,
} from '@/lib/libraryStats';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const TABS: LibraryStatus[] = ['wishlist', 'playing', 'finished'];

const EMPTY_COPY: Record<LibraryStatus, { title: string; detail: string }> = {
  wishlist: {
    title: 'Nothing saved yet',
    detail:
      'Tap the bookmark on any game — or “Want to play” on its page — and it lands here.',
  },
  playing: {
    title: 'Nothing in progress',
    detail: 'Mark a game as Playing and it will wait for you here.',
  },
  finished: {
    title: 'No credits rolled yet',
    detail: 'Finish something and give it a home on this shelf.',
  },
};

/** Sentinel filling an incomplete final grid row so tiles keep their width. */
const SPACER = { spacer: true } as const;
type GridItem = Game | typeof SPACER;
const isSpacer = (item: GridItem): item is typeof SPACER => 'spacer' in item;

function padToRows(items: Game[], columns: number): GridItem[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  return [...items, ...Array(columns - remainder).fill(SPACER)];
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * The backlog, drawn as the time it is.
 *
 * A library screen that lists what you own is every library screen. The
 * thing this app knows, and the reason it exists, is that a collection
 * is an amount of your life — so the shelf is drawn as a bar of hours,
 * one segment per game, longest first.
 *
 * What it shows that a number cannot: proportion. Forty hours of one RPG
 * beside six short games is a bar that is half one colour, and seeing
 * that is the whole argument for being allowed to skip things. The
 * figure above it says how much; this says what it is made of.
 *
 * Finished games are not in it. This is what is still ahead.
 */
const BAR_MIN_FLEX = 0.04;

function BacklogBar({ hours }: { hours: number[] }) {
  const ordered = [...hours].sort((a, b) => b - a);
  const total = ordered.reduce((sum, h) => sum + h, 0);
  if (total <= 0 || ordered.length === 0) return null;

  return (
    <View
      style={styles.bar}
      accessibilityRole="image"
      accessibilityLabel={`${ordered.length} games, longest ${Math.round(ordered[0])} hours`}
    >
      {ordered.map((h, i) => (
        <View
          key={i}
          style={[
            styles.barSeg,
            {
              // A three-hour game next to a hundred-hour one is a
              // hairline, and a hairline reads as a rendering fault
              // rather than as a short game. The floor costs the long
              // ones a sliver of truth and buys every game a presence.
              flexGrow: Math.max(h / total, BAR_MIN_FLEX),
              // The longest is the one the backlog is really made of.
              backgroundColor: i === 0 ? COLORS.accent : COLORS.white,
              opacity: i === 0 ? 1 : Math.max(0.5 - i * 0.06, 0.16),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { byStatus, entries, count, importJson, addGames, tags } = useLibrary();
  const { durationOf, learnDurations } = useDurations();
  const [sort, setSort] = useState<LibrarySort>('added');

  const hoursOf = useCallback(
    (game: Parameters<typeof durationOf>[0]) => durationOf(game).hours,
    [durationOf]
  );
  useEffect(() => {
    learnDurations(Object.values(entries).map((entry) => entry.game.slug));
  }, [entries, learnDurations]);

  const stats = useMemo(
    () => libraryStats(Object.values(entries), hoursOf),
    [entries, hoursOf]
  );
  const { columns, isExpanded } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const topPad = useTopPad(false);
  const toast = useToast();
  const [tab, setTab] = useState<LibraryStatus>('wishlist');
  const [shelf, setShelf] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState<{
    done: number;
    total: number;
  } | null>(null);

  /**
   * One box, two formats.
   *
   * A Sidequest export is JSON and arrives whole. Everything else — a
   * Backloggd export, a HowLongToBeat export, a spreadsheet somebody has
   * kept since 2014 — is CSV with names but no ids, so every title has
   * to be looked up. Rather than making someone pick the right button,
   * the paste is read for what it is.
   */
  const runImport = async () => {
    const text = importText.trim();
    try {
      const total = importJson(text);
      setImportOpen(false);
      setImportText('');
      toast(`Imported ${total} ${total === 1 ? 'game' : 'games'}`, 'download');
      return;
    } catch {
      // Not our own export; try it as a spreadsheet.
    }

    const { rows, headers } = parseCsv(text);
    if (rows.length === 0) {
      toast(
        headers.length > 0
          ? 'No title column in that — expected Title, Name or Game'
          : 'That doesn\u2019t look like a library export',
        'alert-circle'
      );
      return;
    }

    setImporting({ done: 0, total: rows.length });
    const { matched, unmatched } = await importTitles(
      rows.map((row) => row.title),
      (done, total) => setImporting({ done, total })
    );

    const byTitle = new Map(rows.map((row) => [row.title, row]));
    addGames(
      matched.map(({ title, game }) => ({
        game,
        status: byTitle.get(title)?.status ?? ('wishlist' as const),
        hoursPlayed: byTitle.get(title)?.hours,
      }))
    );

    setImporting(null);
    setImportOpen(false);
    setImportText('');
    toast(
      unmatched.length === 0
        ? `Imported ${matched.length} ${matched.length === 1 ? 'game' : 'games'}`
        : `Imported ${matched.length}, couldn\u2019t match ${unmatched.length}`,
      'download'
    );
  };

  /** Everything still ahead, as hours — the bar's raw material. */
  const aheadHours = useMemo(
    () =>
      Object.values(entries)
        .filter((entry) => entry.status !== 'finished')
        .map((entry) => hoursOf(entry.game))
        .filter((h) => h > 0),
    [entries, hoursOf]
  );

  const games = sortLibrary(byStatus(tab), sort, hoursOf)
    .filter((entry) => shelf == null || (entry.tags ?? []).includes(shelf))
    .map((entry) => entry.game);

  return (
    <Textured style={styles.background}>
      <PageTitle>My Library — Sidequest</PageTitle>
      {/* Wide gets the header; compact WEB gets a back button; compact
          native gets neither, because it has the tab bar.
          This screen is a tab root now. A back chevron on a tab root is
          a control with nowhere to go — `BackButton` falls back to
          replacing the route with home when there is no history, so
          tapping it would silently throw you onto Home from a tab you
          had deliberately opened. iOS tab roots never carry one. Web
          still does, because web has no tab bar and this would
          otherwise be a screen with no way out on a phone. */}
      {isExpanded ? (
        <AppHeader />
      ) : Platform.OS === 'web' ? (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      ) : null}

      <Screen>
        <FadeInView style={styles.container}>
          <View
            style={[
              styles.inner,
              {
                paddingTop: topPad,
              },
            ]}
          >
            <SectionHeader
              title="My Library"
              eyebrow={
                count > 0
                  ? `${count} ${count === 1 ? 'game' : 'games'}`
                  : undefined
              }
              actionLabel={count > 0 ? 'Plan my backlog →' : undefined}
              onAction={count > 0 ? () => router.push('/plan') : undefined}
              onAccount={() => router.push('/you')}
            />
            {count > 0 && (
              <View style={styles.hero}>
                <View style={styles.heroLine}>
                  <Text style={styles.heroValue}>
                    {formatHours(stats.hoursAhead)}
                  </Text>
                  <Text style={styles.heroLabel}>ahead of you</Text>
                </View>

                <BacklogBar hours={aheadHours} />

                {/* The supporting counts, quiet and on one line. They
                    were three stats the same size as each other, which
                    made the only meaningful one — the hours — no louder
                    than a zero. */}
                <Text style={styles.heroSub}>
                  {stats.waiting + stats.playing} still to play
                  {stats.finished > 0 && ` · ${stats.finished} finished`}
                  {stats.hoursFinished > 0 &&
                    ` · ${formatHours(stats.hoursFinished)} of credits`}
                </Text>
              </View>
            )}

            {/* Two chips rather than two full-width bars.
              Before the first game you passed four stats, two banners,
              three tabs, four sort options and two more links — fifteen
              controls ahead of the thing the page is for. These two are
              worth keeping up here because they act on what the numbers
              above just told you; the transfer links are not, and have
              gone to the foot. */}
            {count > 0 && (
              <View style={styles.quickRow}>
                {count > 3 && (
                  <Chip
                    title="Backlog amnesty"
                    iconName="sparkles"
                    iconType="ionicon"
                    onPress={() => router.push('/tidy')}
                  />
                )}
                {stats.finished > 0 && (
                  <Chip
                    title="Your Memcard"
                    iconName="albums"
                    iconType="ionicon"
                    onPress={() => router.push('/memcard')}
                  />
                )}
                {/* Up here with the other things you can do to a
                    library, rather than in a footer beneath it. */}
                <Chip
                  title="Import"
                  iconName="download-outline"
                  iconType="ionicon"
                  onPress={() => setImportOpen(true)}
                />
              </View>
            )}

            <View style={styles.tabs}>
              {TABS.map((status) => (
                <Chip
                  key={status}
                  title={STATUS_META[status].label}
                  selected={tab === status}
                  onPress={() => setTab(status)}
                />
              ))}
            </View>

            {tags.length > 0 && (
              <View style={styles.shelfRow}>
                <Chip
                  title="All shelves"
                  selected={shelf == null}
                  onPress={() => setShelf(null)}
                />
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    title={tag}
                    selected={shelf === tag}
                    onPress={() => setShelf(shelf === tag ? null : tag)}
                  />
                ))}
              </View>
            )}

            {/* The grid is two across, so six is the point at which a
                shelf stops fitting on a screen and an order starts
                mattering. Below that this was four more controls in
                front of a list you could already see all of.
                Gated on the whole library rather than the filtered view,
                so narrowing to a status with three games in it does not
                make the control vanish mid-use. */}
            {count >= 6 && (
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort</Text>
                {(Object.keys(SORT_LABELS) as LibrarySort[]).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setSort(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sort === option }}
                  >
                    <Text
                      style={[
                        styles.sortOption,
                        sort === option && styles.sortOptionOn,
                      ]}
                    >
                      {SORT_LABELS[option]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {games.length === 0 ? (
              <View style={styles.emptyFrame}>
                <Message
                  icon="library-outline"
                  title={EMPTY_COPY[tab].title}
                  detail={EMPTY_COPY[tab].detail}
                />
                {/* The one moment importing is the obvious next thing to
                    do, so it is offered as an action rather than as a
                    link in the footer. An empty screen is an invitation
                    to act; it was telling the reader there was nothing
                    here and hiding the fix below the fold. */}
                {count === 0 && (
                  <Pressable
                    onPress={() => setImportOpen(true)}
                    style={styles.emptyAction}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="download-outline"
                      size={16}
                      color={COLORS.white}
                    />
                    <Text style={styles.emptyActionText}>Import a library</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              /* No bottom clearance here. It was meant to clear the tab
                 bar, but the transfer links sit BELOW this grid — so all
                 it did was wedge seventy points of nothing between the
                 games and the links. `Screen` already insets for the
                 bar, and `inner` carries the page's own footer space. */
              <View style={styles.gridContent}>
                {chunk(padToRows(games, columns), columns).map((row, r) => (
                  <View key={r} style={styles.gridRow}>
                    {row.map((item, i) =>
                      isSpacer(item) ? (
                        <View key={`s-${r}-${i}`} style={styles.gridSpacer} />
                      ) : (
                        <GameTile key={item.id} game={item} />
                      )
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Moving a library in or out is housekeeping, not the reason
              anyone opened this page. */}
            {/* No data actions down here any more.
                "Copy library" sat at the foot of this page, which reads
                as reasonable on a library of two and is unreachable on a
                library of two hundred — you would scroll past every
                game you own to find it. Exporting is a settings action
                and lives on /you with the rest of them. */}
          </View>
        </FadeInView>
        <SiteFooter />
      </Screen>

      <Modal
        visible={importOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setImportOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setImportOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Import a library</Text>
            <Text style={styles.modalHint}>
              On your other device: Library → Copy library. Or paste a CSV
              export from Backloggd, HowLongToBeat or a spreadsheet — a column
              called Title, Name or Game is all it needs.
            </Text>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              multiline
              placeholder="Paste your library export…"
              placeholderTextColor={COLORS.mediumGrey}
              style={styles.modalInput}
            />
            <Pressable
              onPress={runImport}
              disabled={importText.trim() === '' || importing != null}
              style={[
                styles.modalButton,
                importText.trim() === '' && styles.modalButtonDisabled,
              ]}
            >
              <Text style={styles.modalButtonText}>
                {importing
                  ? `Matching ${importing.done} of ${importing.total}…`
                  : 'Merge into my library'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  container: {},
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: SPACING.md,
    paddingBottom: SPACING.xl * 1.5,
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  /**
   * Two by two, deliberately.
   *
   * Four stats on one row do not fit a phone, so they wrapped three and
   * one — which reads as a row that broke rather than a grid that was
   * meant. Fixed halves make the wrap the layout.
   */
  /**
   * The hero: the hours, then what they are made of.
   *
   * This block was four stats of identical weight, which made the only
   * number worth reading no louder than a zero.
   */
  hero: { paddingVertical: SPACING.sm, gap: SPACING.sm },
  heroLine: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  heroValue: {
    fontFamily: 'Noah-Black',
    fontSize: 46,
    lineHeight: 50,
    color: COLORS.white,
  },
  heroLabel: { ...TYPE.body, color: COLORS.mediumGrey },
  heroSub: { ...TYPE.caption, color: COLORS.mediumGrey },

  bar: {
    flexDirection: 'row',
    gap: 3,
    height: 10,
    marginTop: SPACING.xs,
  },
  barSeg: { borderRadius: 3, flexBasis: 0 },

  /**
   * Sized by how many there are, not by a guess at how many there will
   * be. At a fixed 50% basis the row fitted two, so the three a normal
   * library shows left the third stranded on a line of its own and the
   * block read as a mistake. Growing from a 100pt basis gives two a half
   * each, three a third each, and lets four wrap to a tidy pair of rows.
   */
  shelfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  sortLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  sortOption: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
  sortOptionOn: { color: COLORS.white },
  gridRow: { flexDirection: 'row', gap: LAYOUT.gridGap },
  gridContent: { gap: LAYOUT.gridGap },
  gridSpacer: { flex: 1 },
  emptyFrame: { minHeight: 320, alignItems: 'center', gap: SPACING.lg },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
  },
  emptyActionText: { ...TYPE.body, color: COLORS.white },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 19, 28, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    ...TYPE.h2,
    color: COLORS.lightGrey,
  },
  modalHint: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
  },
  modalInput: {
    ...TYPE.body,
    minHeight: 96,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: SPACING.sm,
    padding: SPACING.sm + 2,
    // See SearchInput: under 16px iOS zooms on focus.
    color: COLORS.lightGrey,
    textAlignVertical: 'top',
  },
  modalButton: {
    backgroundColor: COLORS.blue,
    borderRadius: SPACING.md,
    paddingVertical: SPACING.sm + 3,
    alignItems: 'center',
  },
  modalButtonDisabled: { opacity: 0.45 },
  modalButtonText: {
    ...TYPE.label,
    color: COLORS.white,
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
