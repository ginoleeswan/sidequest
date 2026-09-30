import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Game } from '@/api/types';
import { RouteError } from '@/components/RouteError';
import { BackButton } from '@/components/BackButton';
import { BottomSheet } from '@/components/BottomSheet';
import { Chip } from '@/components/Chip';
import { FadeInView } from '@/components/FadeInView';
import { DesktopShell } from '@/components/DesktopShell';
import { SiteFooter } from '@/components/SiteFooter';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { Mark } from '@/components/Mark';
import { PageHeading } from '@/components/PageHeading';
import { PageTitle } from '@/components/PageTitle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen, useRefreshControl } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { IconButton, Touchable } from '@/components/Touchable';
import type { Tone } from '@/components/Message';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { importTitles } from '@/api/steamImport';
import { parseCsv } from '@/lib/csvImport';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { useSync } from '@/lib/sync/SyncProvider';
import {
  libraryStats,
  SORT_LABELS,
  sortLibrary,
  type LibrarySort,
} from '@/lib/libraryStats';
import { COLORS } from '@/styles/colors';
import {
  GUTTER,
  ICON,
  LAYOUT,
  MATERIAL,
  RADIUS,
  SPACING,
  TOUCH,
} from '@/styles/theme';
import { FONT_SCALE, TYPE, WORDMARK } from '@/styles/typography';

const TABS: LibraryStatus[] = ['wishlist', 'playing', 'finished'];

const EMPTY_COPY: Record<
  LibraryStatus,
  {
    title: string;
    detail: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    tone: Tone;
  }
> = {
  wishlist: {
    title: 'Nothing saved yet',
    detail:
      'Tap the bookmark on any game — or “Want to play” on its page — and it lands here.',
    icon: 'bookmark-outline',
    tone: 'neutral',
  },
  playing: {
    title: 'Nothing in progress',
    detail: 'Mark a game as Playing and it will wait for you here.',
    icon: 'moon',
    tone: 'evening',
  },
  finished: {
    title: 'No credits rolled yet',
    detail: 'Finish something and give it a home on this shelf.',
    icon: 'flag',
    tone: 'finished',
  },
};

/**
 * The last cell: somewhere to put the next one.
 *
 * A shelf of two games left seven hundred points of nothing under it
 * and no sign that it was meant to grow. This is the shape a game would
 * take, waiting for one — the gesture a photo library or a playlist
 * makes, and the reason those never look abandoned at three items.
 *
 * An INVITATION, not a control, and the distinction is what decides
 * where it can live. Import belongs to fixed chrome because somebody
 * looking for it has to be able to find it; at the foot of a shelf of
 * two hundred games they would scroll past all of them, which is
 * exactly why Copy library was moved off this page. This is different:
 * nobody comes to the Library hunting for it, Home is the real way to
 * find games, and the end of the shelf is the only place a "more goes
 * here" mark means anything.
 */
function AddCell({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      style={styles.addCell}
      onPress={onPress}
      feedback="scale"
      accessibilityLabel={hint}
    >
      <View style={styles.addArt}>
        <Ionicons name={icon} size={ICON.lg} color={COLORS.mediumGrey} />
      </View>
      {/* Capped to a line like every tile caption: an uncapped
          label reports its own text as the cell's minimum width,
          which is how this cell ended up fifty points wider than
          the artwork beside it. */}
      <Text
        style={styles.addLabel}
        numberOfLines={1}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {label}
      </Text>
    </Touchable>
  );
}

/**
 * The empty shelf, drawn as the shelf it will be: four dashed places
 * where games go. A picture, not a control — the buttons beside it are
 * the ways in — so it is hidden from VoiceOver.
 */
function EmptyShelf() {
  return (
    <View
      style={styles.emptyShelf}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1].map((row) => (
        <View key={row} style={styles.gridRow}>
          {[0, 1].map((cell) => (
            <View key={cell} style={styles.addCell}>
              <View style={styles.addArt} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Sentinel filling an incomplete final grid row so tiles keep their width. */
const SPACER = { spacer: true } as const;
/** The invitation, carried through the grid like a game. */
const ADD = { add: true } as const;
type GridItem = Game | typeof SPACER | typeof ADD;
const isSpacer = (item: GridItem): item is typeof SPACER => 'spacer' in item;
const isAdd = (item: GridItem): item is typeof ADD => 'add' in item;

function padToRows(items: GridItem[], columns: number): GridItem[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  return [...items, ...Array(columns - remainder).fill(SPACER)];
}

/** The gap between grid rows, as the list's separator. */
function RowGap() {
  return <View style={styles.rowGap} />;
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
    learnDurations(Object.values(entries).map((entry) => entry.game));
  }, [entries, learnDurations]);

  const stats = useMemo(
    () => libraryStats(Object.values(entries), hoursOf),
    [entries, hoursOf]
  );
  const { columns, isExpanded } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const topPad = useTopPad(false);

  /**
   * Pull to refresh: a sync round when signed in, then everything on
   * screen asks again. A library is this device's own data, so offline
   * the pull simply settles — nothing here has to come from anywhere.
   */
  const queryClient = useQueryClient();
  const sync = useSync();
  const refresh = async () => {
    if (sync.active) await sync.syncNow();
    await queryClient.refetchQueries({ type: 'active' });
  };
  const refreshControl = useRefreshControl(refresh);
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
          : 'Nothing to import. One game a line, or a CSV export.',
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

  /**
   * The one the backlog is mostly made of.
   *
   * The bar draws the longest game in amber and says nothing about
   * which it is, so at two games it reads as a progress bar somebody
   * is halfway through. Naming it turns the picture into the app's
   * actual argument: most of what is ahead of you is one game.
   */
  const longest = useMemo(() => {
    let best: { name: string; hours: number } | null = null;
    for (const entry of Object.values(entries)) {
      if (entry.status === 'finished') continue;
      const hours = hoursOf(entry.game);
      if (hours > 0 && (best == null || hours > best.hours)) {
        best = { name: entry.game.name, hours };
      }
    }
    return best;
  }, [entries, hoursOf]);

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

  /**
   * The desk's one shell. Home stands in the sidebar layout and so
   * does this page now; a top bar of text links over a centred column
   * made walking from Home to here feel like leaving for another site.
   */
  /** The grid, row by row, with the invitation to find a game last. */
  const rows =
    games.length === 0
      ? []
      : chunk(padToRows([...games, ADD], columns), columns);
  const renderRow = (row: GridItem[], r: number) => (
    <View key={r} style={styles.gridRow}>
      {row.map((item, i) =>
        isSpacer(item) ? (
          <View key={`s-${r}-${i}`} style={styles.gridSpacer} />
        ) : isAdd(item) ? (
          <AddCell
            key="find"
            icon="add"
            label="Find a game"
            hint="Find a game to add"
            onPress={() => router.push('/')}
          />
        ) : (
          <GameTile key={item.id} game={item} />
        )
      )}
    </View>
  );

  /**
   * The three states as one single choice, each with its count.
   *
   * These were three chips, and the selected one was solid white — so
   * the loudest thing at the top of the shelf was a filter, louder than
   * the hours figure the page is about. A segmented control says "pick
   * one of these" by its shape, and the counts answer the question a
   * reader was tapping through the chips to ask.
   */
  const statusOptions = TABS.map((status) => {
    const n = byStatus(status).length;
    return {
      value: status,
      label:
        n > 0 ? `${STATUS_META[status].label} ${n}` : STATUS_META[status].label,
    };
  });
  const sortOptions = (Object.keys(SORT_LABELS) as LibrarySort[]).map(
    (option) => ({ value: option, label: SORT_LABELS[option] })
  );

  const head = (
    <FadeInView style={styles.container}>
      <View
        style={[
          styles.inner,
          isExpanded && styles.innerDesk,
          rows.length === 0 && styles.innerLast,
          {
            paddingTop: topPad,
          },
        ]}
      >
        <PageHeading
          eyebrow={
            count > 0
              ? `${count} ${count === 1 ? 'game' : 'games'}`
              : 'Your shelf'
          }
          title="My Library"
          tone="library"
          actionLabel={count > 0 ? 'Plan my backlog' : undefined}
          actionChevron
          onAction={count > 0 ? () => router.push('/plan') : undefined}
        />

        {count === 0 ? (
          /* The first-run shelf. It was the status chips over a grey
             disc and one outlined button — three filters for nothing,
             and a template where the product should be. Now it is the
             figure this page is built around, at zero, the two ways to
             change that, and the shape the shelf will take. */
          <View style={styles.firstRun}>
            <View style={styles.heroLine}>
              <Text
                style={[styles.heroValue, styles.heroValueEmpty]}
                maxFontSizeMultiplier={FONT_SCALE.figure}
              >
                0h
              </Text>
              <Text style={styles.heroLabel}>on your shelf</Text>
            </View>
            <View style={styles.firstRunWords}>
              <Text style={styles.firstRunTitle} accessibilityRole="header">
                {EMPTY_COPY.wishlist.title}
              </Text>
              <Text style={styles.firstRunDetail}>
                {EMPTY_COPY.wishlist.detail}
              </Text>
            </View>
            {/* Importing is the obvious other thing to do here, so it
                is offered beside finding a game rather than hidden in a
                footer. */}
            <View style={styles.firstRunActions}>
              <PrimaryButton
                label="Find a game"
                onPress={() => router.push('/')}
              />
              <PrimaryButton
                label="Import a library"
                variant="secondary"
                icon="download-outline"
                onPress={() => setImportOpen(true)}
              />
            </View>
            <EmptyShelf />
          </View>
        ) : (
          <>
            {/* The backlog and what you can do to it, as one object:
                content, rule, actions — the shape the Plan's panel has. */}
            <View style={styles.hero}>
              {/* "On your shelf", not "ahead of you": the same number,
                  said as an inventory rather than as a road you are late
                  down. §2.1 says this app does not have that voice. */}
              <View style={styles.heroLine}>
                <Text
                  style={styles.heroValue}
                  maxFontSizeMultiplier={FONT_SCALE.figure}
                >
                  {formatHours(stats.hoursAhead)}
                </Text>
                <Text style={styles.heroLabel}>on your shelf</Text>
              </View>

              {/* Import, in the corner of the thing it fills: in fixed
                  chrome, because at the foot of the shelf you would
                  scroll past two hundred games to reach it. Positioned
                  rather than laid out, so the figure keeps its line. */}
              <Touchable
                onPress={() => setImportOpen(true)}
                hitSlop="md"
                style={styles.heroImport}
                accessibilityLabel="Import a library"
              >
                <Ionicons
                  name="download-outline"
                  size={ICON.sm}
                  color={COLORS.mediumGrey}
                />
                <Text style={styles.heroImportText}>Import</Text>
              </Touchable>

              {/* A bar is a comparison, and one game has nothing to be
                  compared with: alone it was a full amber stripe that
                  said only "100%". */}
              {aheadHours.length > 1 && <BacklogBar hours={aheadHours} />}

              {longest && aheadHours.length > 1 && (
                <Text style={styles.heroBarNote}>
                  Longest: {longest.name} · {formatHours(longest.hours)}
                </Text>
              )}

              {/* The supporting counts, quiet and on one line — credits
                  first when there are any, because the app's thesis is
                  finishing and where the shelf has evidence of it, it
                  goes first. */}
              <Text style={styles.heroSub}>
                {stats.finished > 0 &&
                  `${stats.finished} finished${
                    stats.hoursFinished > 0
                      ? ` · ${formatHours(stats.hoursFinished)} of credits`
                      : ''
                  } · `}
                {stats.waiting + stats.playing} still to play
              </Text>

              {/* Only what acts on the numbers above it. */}
              {(count > 3 || stats.finished > 0) && (
                <>
                  <View style={styles.heroRule} />
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
                  </View>
                </>
              )}
            </View>

            <Segmented
              label="Show"
              showLabel={false}
              options={statusOptions}
              value={tab}
              onChange={setTab}
            />

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
                mattering. Gated on the whole library rather than the
                filtered view, so narrowing to a status with three games
                in it does not make the control vanish mid-use. It was
                four 17pt text links; it is a control a thumb can hit. */}
            {count >= 6 && (
              <Segmented
                label="Sort"
                options={sortOptions}
                value={sort}
                onChange={setSort}
              />
            )}

            {games.length === 0 ? (
              <View style={styles.emptyFrame}>
                <Message
                  icon={EMPTY_COPY[tab].icon}
                  tone={EMPTY_COPY[tab].tone}
                  title={EMPTY_COPY[tab].title}
                  detail={EMPTY_COPY[tab].detail}
                  actionLabel="Find a game"
                  onAction={() => router.push('/')}
                />
              </View>
            ) : /* The grid lives outside this column — see `rows` below —
                 so a long library is a virtualised list on native
                 rather than every cover mounted at once. */
            null}
          </>
        )}
        {/* No data actions down here. Exporting is a settings action
            and lives on /you with the rest of them. */}
      </View>
    </FadeInView>
  );

  // Out past the shell column's padding on a desk, so the shore runs
  // the column's full width the way Home's does; on a phone the footer
  // is already the page's width.
  const foot = <SiteFooter inset={isExpanded ? SPACING.xl : 0} />;

  const page = (
    <>
      <PageTitle>My Library — Sidequest</PageTitle>
      {/* Wide gets the header; compact WEB gets a back button; compact
          native gets neither, because it has the tab bar.
          This screen is a tab root now. A back chevron on a tab root is
          a control with nowhere to go — `BackButton` falls back to
          replacing the route with home when there is no history, so
          tapping it would silently throw you onto Home from a tab you
          had deliberately opened. iOS tab roots never carry one. Web
          keeps the brand lockup in this corner - the same anchor the
          game page has - now that a phone on the web has the tab bar
          for getting between the three roots. */}
      {isExpanded ? null : Platform.OS === 'web' ? (
        <>
          <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
            <BackButton />
          </View>
          {/* You, in the chrome row where every page keeps it - the same
              height as the lockup on the left and as the icon on Home.
              It used to sit a hundred points lower, in the section
              header's eyebrow row, which is where the page's title
              lives, not the app's identity. */}
          <IconButton
            icon="person-circle-outline"
            color={COLORS.lightGrey}
            onPress={() => router.push('/you')}
            style={[styles.youButton, { top: insets.top + SPACING.xxs }]}
            accessibilityLabel="You"
          />
        </>
      ) : (
        /* Native, compact: the wordmark row Home has, so the three tab
           roots open on the same chrome - the brand on the left, You on
           the right, at one height. The wordmark steps down here: on a
           tab root the page's own title is the loudest thing. */
        <View
          style={[styles.nativeChrome, { paddingTop: insets.top + SPACING.xs }]}
        >
          <View style={styles.nativeBrand}>
            <Mark size={18} />
            <Text
              style={styles.nativeWordmark}
              maxFontSizeMultiplier={FONT_SCALE.display}
            >
              sidequest
            </Text>
          </View>
          <IconButton
            icon="person-circle-outline"
            color={COLORS.lightGrey}
            onPress={() => router.push('/you')}
            style={styles.youNative}
            accessibilityLabel="You"
          />
        </View>
      )}

      {Platform.OS === 'web' ? (
        <Screen>
          {head}
          {rows.length > 0 ? (
            <View style={[styles.gridWrap, isExpanded && styles.innerDesk]}>
              {rows.map(renderRow)}
            </View>
          ) : null}
          {foot}
        </Screen>
      ) : (
        /* A list, not a scroller full of rows.

           Every cover in the library used to be mounted at once: two
           hundred games was two hundred decoded images and their
           gradients held in memory for a screen showing eight. As a
           FlatList the rows come and go with the scroll, the header is
           the page above the grid exactly as it was, and the footer is
           the shore. Web keeps the document flow — the browser
           virtualises nothing and a windowed list would cut the page
           off at the fold. */
        <FlatList
          data={rows}
          extraData={columns}
          keyExtractor={(_, index) => String(index)}
          renderItem={({ item, index }) => (
            <View style={styles.gridRowNative}>{renderRow(item, index)}</View>
          )}
          ItemSeparatorComponent={RowGap}
          ListHeaderComponent={head}
          ListFooterComponent={
            <>
              {rows.length > 0 ? <View style={styles.gridFoot} /> : null}
              {foot}
            </>
          }
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews
        />
      )}

      {/* A sheet from the bottom edge: this was a centred dialog with a
          multiline field, and the keyboard rose straight over its
          button. */}
      <BottomSheet
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        accessibilityLabel="Import a library"
      >
        <View style={styles.sheet}>
          <Text
            style={styles.modalTitle}
            accessibilityRole="header"
            maxFontSizeMultiplier={FONT_SCALE.display}
          >
            Import a library
          </Text>
          {/* The list goes first, because it is the thing most people
              can actually do; leading with the exports told the reader
              without one to go and produce a spreadsheet first. */}
          <Text style={styles.modalHint}>
            Just type or paste your games, one a line — that is enough. A CSV
            from Backloggd, HowLongToBeat or a spreadsheet works too, and brings
            your hours and shelves with it. From another device: You → Copy
            library.
          </Text>
          <TextInput
            value={importText}
            onChangeText={setImportText}
            multiline
            placeholder={'Hades\nElden Ring\nOuter Wilds…'}
            placeholderTextColor={COLORS.mediumGrey}
            // A real label, not just the placeholder: the placeholder
            // is an example now rather than an instruction, and a
            // screen reader was only ever getting the instruction.
            accessibilityLabel="Your games, one a line, or a CSV export"
            style={styles.modalInput}
          />
          <PrimaryButton
            label={
              importing
                ? `Matching ${importing.done} of ${importing.total}…`
                : 'Merge into my library'
            }
            onPress={runImport}
            disabled={importText.trim() === '' || importing != null}
            block
          />
        </View>
      </BottomSheet>
    </>
  );
  return isExpanded ? (
    <DesktopShell activeKey="library">{page}</DesktopShell>
  ) : (
    <Textured style={styles.background}>{page}</Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  nativeChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    // A floor, not a fixed height: the safe-area inset is padding INSIDE
    // this box, and at 48 the box was shorter than its own padding on a
    // notched phone, so the wordmark rendered below it and the list
    // scrolled over the top of the brand.
    minHeight: TOUCH.min + SPACING.xs,
  },
  nativeBrand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  /** The brand, a step below the page's own title on a tab root. */
  nativeWordmark: { ...WORDMARK, fontSize: 17, lineHeight: 21 },
  /** The glyph lines up with the gutter; its 44pt target reaches past it. */
  youNative: { marginRight: -SPACING.sm2 },
  innerDesk: { paddingHorizontal: 0 },
  youButton: { position: 'absolute', right: SPACING.sm2, zIndex: 30 },
  container: {},
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: SPACING.md,
    // The grid follows as its own block; the space under the page is
    // its, unless there is no grid and this column is the last thing.
    paddingBottom: SPACING.md,
  },
  innerLast: { paddingBottom: SPACING.xxl },
  /**
   * The backlog, on a plane of its own.
   *
   * `raised`, not `surface`: surface is a step DOWN from the page's
   * navy and reads as a recess. Matches the Plan's panels, because the
   * two tabs are the same product and a reader moving between them
   * should not have to relearn what a card is.
   */
  hero: {
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...MATERIAL.plate,
  },
  heroRule: {
    height: 1,
    backgroundColor: COLORS.stroke,
    marginTop: SPACING.xs,
  },
  heroBarNote: { ...TYPE.fine, color: COLORS.mediumGrey },
  heroLine: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  /**
   * The glyph sits sixteen in from the corner against the panel's
   * twenty — a glyph carries less mass than its box, so four points
   * tighter reads as aligned — and its 44pt target reaches past it.
   */
  /**
   * Import, named. An unlabelled tray-and-arrow in the corner of the
   * hero read as decoration; the word makes it the action it is.
   */
  heroImport: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  heroImportText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
  /**
   * The page's one hero number. Amber, because it is hours — the
   * biggest time statement in the app.
   */
  heroValue: {
    ...TYPE.hero,
    color: COLORS.accent,
  },
  /** At zero it is a place to start, not a sum: no colour to claim yet. */
  heroValueEmpty: { color: COLORS.mediumGrey },
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
  gridRow: { flexDirection: 'row', gap: LAYOUT.gridGap },
  /** The grid's column, on the web: the page's own width and gutter. */
  gridWrap: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    gap: LAYOUT.gridGap,
    paddingBottom: SPACING.xxl,
  },
  /** One row of the native list, in the same column. */
  gridRowNative: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
  },
  rowGap: { height: LAYOUT.gridGap },
  gridFoot: { height: SPACING.xxl },
  gridSpacer: { flex: 1 },
  fill: { flex: 1 },
  emptyFrame: { minHeight: 320 },
  /** The first-run shelf: the figure at zero, the words, the ways in. */
  firstRun: { gap: SPACING.lg },
  firstRunWords: { gap: SPACING.xs },
  firstRunTitle: { ...TYPE.h2, color: COLORS.white },
  firstRunDetail: { ...TYPE.body, color: COLORS.mediumGrey, maxWidth: 420 },
  firstRunActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm2 },
  /** Two by two, at the grid's own measure, so it is the shelf to come. */
  emptyShelf: { gap: LAYOUT.gridGap, marginTop: SPACING.sm, maxWidth: 400 },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  /**
   * The add cell, drawn as the absence of a tile.
   *
   * Dashed and unfilled so it never competes with the artwork beside
   * it: it is the shape a game would take, waiting for one. Its art box
   * matches GameTile's aspect exactly, or the last row of the grid
   * would sit a few points out of true.
   */
  addCell: { flex: 1, flexBasis: 0, minWidth: 0, gap: SPACING.xs },
  addArt: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...TYPE.label, color: COLORS.mediumGrey },
  sheet: { gap: SPACING.md },
  modalTitle: {
    ...TYPE.h2,
    color: COLORS.white,
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
    borderRadius: RADIUS.sm,
    padding: SPACING.sm2,
    // See SearchInput: under 16px iOS zooms on focus.
    color: COLORS.lightGrey,
    textAlignVertical: 'top',
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
