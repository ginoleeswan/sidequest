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
import { DesktopShell } from '@/components/DesktopShell';
import { SiteFooter } from '@/components/SiteFooter';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { Mark } from '@/components/Mark';
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
import { GUTTER, LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE, WORDMARK } from '@/styles/typography';

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
    <Pressable
      style={styles.addCell}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.addArt, pressed && styles.addArtPressed]}>
            <Ionicons name={icon} size={24} color={COLORS.mediumGrey} />
          </View>
          {/* Capped to a line like every tile caption: an uncapped
              label reports its own text as the cell's minimum width,
              which is how this cell ended up fifty points wider than
              the artwork beside it. */}
          <Text style={styles.addLabel} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
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
          <Pressable
            onPress={() => router.push('/you')}
            style={[styles.youButton, { top: insets.top + SPACING.sm }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="You"
          >
            <Ionicons
              name="person-circle-outline"
              size={23}
              color={COLORS.lightGrey}
            />
          </Pressable>
        </>
      ) : (
        /* Native, compact: the wordmark row Home has, so the three tab
           roots open on the same chrome - the brand on the left, You on
           the right, at one height - instead of You appearing lower in
           the section header on two of them. */
        <View
          style={[styles.nativeChrome, { paddingTop: insets.top + SPACING.sm }]}
        >
          <View style={styles.nativeBrand}>
            <Mark size={20} />
            <Text style={styles.nativeWordmark}>sidequest</Text>
          </View>
          <Pressable
            onPress={() => router.push('/you')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="You"
          >
            <Ionicons
              name="person-circle-outline"
              size={23}
              color={COLORS.lightGrey}
            />
          </Pressable>
        </View>
      )}

      <Screen>
        <FadeInView style={styles.container}>
          <View
            style={[
              styles.inner,
              isExpanded && styles.innerDesk,
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
              // The chrome row carries You on a compact web page; the
              // eyebrow row keeps it only where there is no chrome row -
              // native tab roots, and the desk.
              onAccount={undefined}
            />
            {/* The backlog and what you can do to it, as one object.
                These were three loose lines and a row of chips sitting
                directly on the page, so the top of the shelf had no
                shape at all — the same flatness the Plan had before it
                got a plane to sit on. Content, rule, actions: the shape
                the week panel uses over there. */}
            {count > 0 && (
              <View style={styles.hero}>
                {/* "ahead of you" put the debt in the largest numeral
                    in the app, on the page opened most — a hundred and
                    twenty-two hours you are BEHIND on. Every other
                    surface was rewritten to answer rather than accuse:
                    the Plan says what will get done, the misfits say
                    "and that's allowed", a free evening says "free".
                    The shelf was still keeping score.

                    Same number, and it earns its size — it is the raw
                    material the Plan runs on. What changed is what it
                    claims to be. "On your shelf" is an inventory;
                    "ahead of you" is a road you are late down, and
                    §2.1 says this app does not have that voice. */}
                <View style={styles.heroLine}>
                  <Text style={styles.heroValue}>
                    {formatHours(stats.hoursAhead)}
                  </Text>
                  <Text style={styles.heroLabel}>on your shelf</Text>
                </View>

                {/* Bringing a library in is an action on this panel, and
                    it stays in fixed chrome for a reason: at the foot of
                    the shelf — where it and Copy library both started —
                    you would scroll past two hundred games to reach it.
                    As a lone outlined chip under a rule it read as an
                    orphan; in the corner of the thing it fills, it
                    reads as what it is.

                    `download-outline` because that is already this
                    app's word for importing — the row on You and the
                    action in the empty state below both use it, and a
                    third glyph for one idea is a third thing to learn.

                    Positioned rather than laid out. In the flow it sat
                    in a baseline-aligned row whose height is set by a
                    46pt numeral, so "centre" meant halfway down the
                    figure rather than in the corner. */}
                <Pressable
                  onPress={() => setImportOpen(true)}
                  hitSlop={14}
                  style={styles.heroImport}
                  accessibilityRole="button"
                  accessibilityLabel="Import a library"
                >
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={COLORS.mediumGrey}
                  />
                </Pressable>

                <BacklogBar hours={aheadHours} />

                {longest && aheadHours.length > 1 && (
                  <Text style={styles.heroBarNote}>
                    Longest: {longest.name} · {formatHours(longest.hours)}
                  </Text>
                )}

                {/* The supporting counts, quiet and on one line. They
                    were three stats the same size as each other, which
                    made the only meaningful one — the hours — no louder
                    than a zero. */}
                {/* Credits first when there are any. This line read
                    "5 still to play · 2 finished · 16h of credits" —
                    the one achievement on the shelf, arriving last and
                    quietest after two counts of what is outstanding.
                    The app's whole thesis is finishing; where the shelf
                    has evidence of it, it goes first. */}
                <Text style={styles.heroSub}>
                  {stats.finished > 0 &&
                    `${stats.finished} finished${
                      stats.hoursFinished > 0
                        ? ` · ${formatHours(stats.hoursFinished)} of credits`
                        : ''
                    } · `}
                  {stats.waiting + stats.playing} still to play
                </Text>

                {/* Only what acts on the numbers above it. Import used
                    to sit here too and had nothing to do with them —
                    a lone outlined chip under a rule, which is what an
                    orphan looks like. It is at the foot of the shelf
                    now, beside the other way of filling one. */}
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
                    accessibilityLabel="Import a library"
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
                {chunk(padToRows([...games, ADD], columns), columns).map(
                  (row, r) => (
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
                  )
                )}
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
        {/* Out past the shell column's padding on a desk, so the shore
            runs the column's full width the way Home's does; on a phone
            the footer is already the page's width. */}
        <SiteFooter inset={isExpanded ? SPACING.xl : 0} />
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
            {/* The list goes first now, because it is the thing most
                people can actually do. The exports still work and are
                still worth naming, but leading with them told the
                reader without a Steam account to go and produce a
                spreadsheet before the app would help — which is the
                door shut on exactly the person this path exists for. */}
            <Text style={styles.modalHint}>
              Just type or paste your games, one a line — that is enough. A CSV
              from Backloggd, HowLongToBeat or a spreadsheet works too, and
              brings your hours and shelves with it. From another device:
              Library → Copy library.
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
    height: 40 + SPACING.sm,
  },
  nativeBrand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nativeWordmark: { ...WORDMARK },
  innerDesk: { paddingHorizontal: 0 },
  youButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 30,
    height: 40,
    justifyContent: 'center',
  },
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
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    ...SHADOW.card,
  },
  heroRule: {
    height: 1,
    backgroundColor: COLORS.stroke,
    marginTop: SPACING.xs,
  },
  heroBarNote: { ...TYPE.fine, color: COLORS.mediumGrey },
  heroLine: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  /**
   * Inset by sixteen against the panel's twenty.
   *
   * A glyph carries less visual mass than its box, so setting it on the
   * padding line leaves it looking adrift of the corner; four points
   * tighter reads as aligned. The row it used to sit in is untouched,
   * which keeps the figure and its label on their shared baseline.
   */
  heroImport: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: 2,
  },
  heroValue: {
    fontFamily: 'Geom-ExtraBold',
    fontSize: 46,
    lineHeight: 50,
    // Amber marks time everywhere else the app states an hour figure -
    // the game page's masthead, every tile caption. The shelf total is
    // the biggest time statement in the app and was the one in white.
    color: COLORS.accent,
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
  addCell: { flex: 1, flexBasis: 0, minWidth: 0, gap: SPACING.xs + 1 },
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
  addArtPressed: { backgroundColor: COLORS.raised },
  addLabel: { ...TYPE.label, color: COLORS.mediumGrey },
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
    // The primary action in a sheet, so it wears the app's primary
    // colour rather than the blue that belonged to nothing.
    backgroundColor: COLORS.accent,
    borderRadius: SPACING.md,
    paddingVertical: SPACING.sm + 3,
    alignItems: 'center',
  },
  modalButtonDisabled: { opacity: 0.45 },
  modalButtonText: {
    ...TYPE.label,
    // Navy, not white: white on the amber face is about 1.9:1 and
    // fails AA outright. The amber is light, so its label is dark.
    color: COLORS.navy,
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
