import { Ionicons } from '@expo/vector-icons';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
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
import { SectionHeader } from '@/components/SectionHeader';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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
import { LAYOUT, SPACING } from '@/styles/theme';
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

function Stat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { byStatus, entries, count, exportJson, importJson } = useLibrary();
  const { durationOf } = useDurations();
  const [sort, setSort] = useState<LibrarySort>('added');

  const hoursOf = useCallback(
    (game: Parameters<typeof durationOf>[0]) => durationOf(game).hours,
    [durationOf]
  );
  const stats = useMemo(
    () => libraryStats(Object.values(entries), hoursOf),
    [entries, hoursOf]
  );
  const { columns, isExpanded } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tab, setTab] = useState<LibraryStatus>('wishlist');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const copyLibrary = async () => {
    try {
      await navigator.clipboard?.writeText(exportJson());
      toast('Library copied — paste it on another device', 'copy');
    } catch {
      toast(
        'Copy failed — your browser blocked clipboard access',
        'alert-circle'
      );
    }
  };

  const runImport = () => {
    try {
      const total = importJson(importText.trim());
      setImportOpen(false);
      setImportText('');
      toast(`Imported ${total} ${total === 1 ? 'game' : 'games'}`, 'download');
    } catch {
      toast('That doesn\u2019t look like a library export', 'alert-circle');
    }
  };

  const games = sortLibrary(byStatus(tab), sort, hoursOf).map(
    (entry) => entry.game
  );

  return (
    <Textured style={styles.background}>
      <Head>
        <title>My Library — Sidequest</title>
      </Head>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

      <FadeInView style={styles.container}>
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
            title="My Library"
            eyebrow={
              count > 0
                ? `${count} ${count === 1 ? 'game' : 'games'}`
                : undefined
            }
            actionLabel={count > 0 ? 'Plan my backlog →' : undefined}
            onAction={count > 0 ? () => router.push('/plan') : undefined}
          />
          {count > 0 && (
            <View style={styles.stats}>
              <Stat
                value={String(stats.waiting + stats.playing)}
                label="still to play"
              />
              <Stat
                value={formatHours(stats.hoursAhead)}
                label="ahead of you"
              />
              <Stat
                value={String(stats.finished)}
                label="finished"
                accent={stats.finished > 0}
              />
              {stats.hoursFinished > 0 && (
                <Stat
                  value={formatHours(stats.hoursFinished)}
                  label="credits rolled"
                  accent
                />
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

          {games.length > 1 && (
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

          <View style={styles.transferRow}>
            {count > 0 && (
              <Pressable onPress={copyLibrary} style={styles.transferLink}>
                <Ionicons
                  name="copy-outline"
                  size={13}
                  color={COLORS.mediumGrey}
                />
                <Text style={styles.transferText}>Copy library</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setImportOpen(true)}
              style={styles.transferLink}
            >
              <Ionicons
                name="download-outline"
                size={13}
                color={COLORS.mediumGrey}
              />
              <Text style={styles.transferText}>Import</Text>
            </Pressable>
          </View>

          {games.length === 0 ? (
            <View style={styles.emptyFrame}>
              <Message
                icon="library-outline"
                title={EMPTY_COPY[tab].title}
                detail={EMPTY_COPY[tab].detail}
              />
            </View>
          ) : (
            <View
              style={[
                styles.gridContent,
                { paddingBottom: insets.bottom + 40 },
              ]}
            >
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
        </View>
      </FadeInView>
      <SiteFooter />

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
              On your other device: Library → Copy library. Then paste it here.
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
              disabled={importText.trim() === ''}
              style={[
                styles.modalButton,
                importText.trim() === '' && styles.modalButtonDisabled,
              ]}
            >
              <Text style={styles.modalButtonText}>Merge into my library</Text>
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
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    paddingBottom: SPACING.xl * 1.5,
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: SPACING.xl,
    rowGap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  stat: { gap: 1 },
  statValue: {
    ...TYPE.h2,
    color: COLORS.white,
  },
  statValueAccent: { color: COLORS.accent },
  statLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
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
  emptyFrame: { minHeight: 320 },
  transferRow: { flexDirection: 'row', gap: SPACING.lg },
  transferLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  transferText: {
    ...TYPE.labelTiny,
    color: COLORS.mediumGrey,
  },
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
