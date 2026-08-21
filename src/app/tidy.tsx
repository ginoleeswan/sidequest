import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { CoverImage } from '@/components/CoverImage';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { DROP_REASONS, recordDrop, type DropReason } from '@/lib/drops';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import {
  STATUS_META,
  useLibrary,
  type LibraryEntry,
  type LibraryStatus,
} from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Backlog amnesty.
 *
 * The product's whole stance is that you were never going to get to
 * eleven of these and that is fine — but letting them go one at a time
 * is a chore, and a chore quietly argues against doing it. So this is
 * the screen that makes dropping things as easy as saving them was, and
 * says nothing disapproving while you do it.
 */

type Filter = 'all' | LibraryStatus | 'stale';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'wishlist', label: 'Want to play' },
  { key: 'playing', label: 'Playing' },
  { key: 'stale', label: 'Saved a year ago' },
];

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function matches(entry: LibraryEntry, filter: Filter, now: number): boolean {
  if (filter === 'all') return entry.status !== 'finished';
  if (filter === 'stale')
    return entry.status !== 'finished' && now - entry.addedAt > YEAR_MS;
  return entry.status === filter;
}

export default function TidyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();
  const { entries, removeMany, moveMany } = useLibrary();
  const { durationOf } = useDurations();
  const toast = useToast();

  const [now] = useState(() => Date.now());
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  /** Set while asking why, holding the games about to go. */
  const [asking, setAsking] = useState<number[] | null>(null);

  const shown = useMemo(
    () =>
      Object.values(entries)
        .filter((entry) => matches(entry, filter, now))
        .sort((a, b) => a.addedAt - b.addedAt),
    [entries, filter, now]
  );

  const hours = useMemo(
    () =>
      shown
        .filter((entry) => picked.has(entry.game.id))
        .reduce((sum, entry) => sum + durationOf(entry.game).hours, 0),
    [shown, picked, durationOf]
  );

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = () => [...picked];

  const letGo = (reason?: DropReason) => {
    const ids = asking ?? chosen();
    const count = removeMany(ids);
    if (reason) recordDrop(reason, count);
    setPicked(new Set());
    setAsking(null);
    toast(
      count === 1
        ? 'One let go. Nothing owed.'
        : `${count} let go. Nothing owed.`,
      'checkmark-circle'
    );
  };

  const move = (status: LibraryStatus) => {
    const count = moveMany(chosen(), status);
    setPicked(new Set());
    toast(
      `${count} moved to ${STATUS_META[status].label}`,
      STATUS_META[status].icon as never
    );
  };

  return (
    <Textured style={styles.background}>
      <PageTitle>Backlog amnesty — Sidequest</PageTitle>
      {isExpanded ? (
        <AppHeader />
      ) : (
        <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
          <BackButton />
        </View>
      )}

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
          title="Backlog amnesty"
          eyebrow={shown.length > 0 ? `${shown.length} unfinished` : undefined}
        />
        <Text style={styles.lede}>
          You were never going to get to all of these, and that is fine. Choose
          the ones you are done pretending about — nothing is deleted anywhere
          else, and you can always save them again.
        </Text>

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

        {shown.length === 0 ? (
          <Message
            icon="sparkles-outline"
            title="Nothing to let go of"
            detail="Your library is either empty or entirely honest. Both are fine."
            actionLabel="Back to the library"
            onAction={() => router.push('/library')}
          />
        ) : (
          <FlatList
            data={shown}
            scrollEnabled={false}
            keyExtractor={(entry) => String(entry.game.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const checked = picked.has(item.game.id);
              const duration = durationOf(item.game);
              return (
                <Pressable
                  onPress={() => toggle(item.game.id)}
                  style={[styles.row, checked && styles.rowPicked]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  // react-native-web maps aria-checked from this prop
                  // rather than from accessibilityState, and a checkbox
                  // without it is a critical axe violation.
                  aria-checked={checked}
                  accessibilityLabel={item.game.name}
                >
                  <View style={[styles.box, checked && styles.boxOn]}>
                    {checked && (
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color={COLORS.darkGrey}
                      />
                    )}
                  </View>
                  <CoverImage
                    uri={item.game.background_image}
                    style={styles.thumb}
                    size="thumb"
                    iconSize={14}
                  />
                  <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.game.name}
                    </Text>
                    <Text style={styles.meta}>
                      {STATUS_META[item.status].label}
                      {duration.hours > 0
                        ? ` · ${formatHours(duration.hours)}`
                        : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {asking && (
        <View
          style={[styles.bar, { paddingBottom: insets.bottom + SPACING.md }]}
        >
          {/* Not a guilt trip: the shelves cannot learn anything from a
              silent delete, and "too long" and "bounced off it" mean
              opposite things about what to offer next. */}
          <Text style={styles.barCount}>
            Why {asking.length === 1 ? 'this one' : 'these'}? Optional.
          </Text>
          <View style={styles.barActions}>
            {DROP_REASONS.map((reason) => (
              <Pressable
                key={reason.key}
                onPress={() => letGo(reason.key)}
                style={styles.secondary}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>{reason.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => letGo()}
              style={styles.primary}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Rather not say</Text>
            </Pressable>
          </View>
        </View>
      )}

      {picked.size > 0 && !asking && (
        <View
          style={[styles.bar, { paddingBottom: insets.bottom + SPACING.md }]}
        >
          <Text style={styles.barCount}>
            {picked.size} chosen
            {hours > 0 ? ` · ${formatHours(hours)} back` : ''}
          </Text>
          <View style={styles.barActions}>
            <Pressable
              onPress={() => move('finished')}
              style={styles.secondary}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Actually finished</Text>
            </Pressable>
            <Pressable
              onPress={() => setAsking(chosen())}
              style={styles.primary}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Let these go</Text>
            </Pressable>
          </View>
        </View>
      )}
      <SiteFooter />
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 3,
    gap: SPACING.md,
  },
  lede: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
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
  thumb: { width: 52, height: 33, borderRadius: 5 },
  body: { flex: 1, gap: 1 },
  title: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
  meta: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
  separator: { height: 1, backgroundColor: COLORS.stroke },
  bar: {
    position: 'sticky' as unknown as 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.darkGrey,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  barCount: {
    ...TYPE.tag,
    // Letting go has its own colour in this app; the question that
    // opens the act should be asked in it.
    color: COLORS.coral,
    textAlign: 'center',
  },
  barActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  primaryText: {
    ...TYPE.label,
    color: COLORS.darkGrey,
  },
  secondary: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  secondaryText: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
