import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { CoverImage } from '@/components/CoverImage';
import { Message } from '@/components/Message';
import { PageHeading } from '@/components/PageHeading';
import { PageTitle } from '@/components/PageTitle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { RouteError } from '@/components/RouteError';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { Touchable } from '@/components/Touchable';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { recordDrop, type DropReason } from '@/lib/drops';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import {
  STATUS_META,
  useLibrary,
  type LibraryEntry,
  type LibraryStatus,
} from '@/lib/library';
import { LetGoBar } from '@/components/LetGoBar';
import { COLORS, alpha } from '@/styles/colors';
import { GUTTER, ICON, LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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
  const topPad = useTopPad(true);
  const { isDesk } = useBreakpoint();
  const { entries, removeMany, moveMany, importJson } = useLibrary();
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

  /**
   * Let them go, and hold the door open behind them: the entries are
   * kept whole first, so Undo puts back exactly what was there — status,
   * dates, notes — and takes the reason back with them.
   */
  const letGo = (reason?: DropReason) => {
    const ids = asking ?? chosen();
    const kept = Object.fromEntries(
      ids
        .map((id) => [String(id), entries[String(id)]] as const)
        .filter(([, entry]) => entry != null)
    );
    const count = removeMany(ids);
    if (reason) recordDrop(reason, count);
    setPicked(new Set());
    setAsking(null);
    toast(
      count === 1
        ? 'One let go. Nothing owed.'
        : `${count} let go. Nothing owed.`,
      'checkmark-circle',
      count > 0
        ? {
            label: 'Undo',
            onPress: () => {
              importJson(JSON.stringify(kept));
              if (reason) recordDrop(reason, -count);
            },
          }
        : undefined
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

  const hasBar = asking != null || picked.size > 0;
  const bars = (
    <>
      {asking && (
        <LetGoBar
          count={asking.length}
          onLetGo={letGo}
          onCancel={() => setAsking(null)}
          floating={!STICKY}
        />
      )}

      {picked.size > 0 && !asking && (
        <View
          style={[
            styles.bar,
            !STICKY && styles.barFloating,
            { paddingBottom: insets.bottom + SPACING.md },
          ]}
        >
          <Text
            style={styles.barCount}
            maxFontSizeMultiplier={FONT_SCALE.label}
          >
            {picked.size} chosen
            {hours > 0 ? ` · ${formatHours(hours)} back` : ''}
          </Text>
          <View style={styles.barActions}>
            <PrimaryButton
              label="Actually finished"
              variant="secondary"
              haptic="celebrate"
              onPress={() => move('finished')}
            />
            <PrimaryButton
              label="Let these go"
              variant="danger"
              haptic="tap"
              onPress={() => setAsking(chosen())}
            />
          </View>
        </View>
      )}
    </>
  );

  return (
    <Textured style={styles.background}>
      <PageTitle>Backlog amnesty — Sidequest</PageTitle>
      {isDesk ? (
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
              paddingTop: topPad,
            },
          ]}
        >
          <PageHeading
            title="Backlog amnesty"
            eyebrow={
              shown.length > 0 ? `${shown.length} unfinished` : 'Amnesty'
            }
          />
          <Text style={styles.lede}>
            You were never going to get to all of these, and that is fine.
            Choose the ones you are done pretending about — nothing is deleted
            anywhere else, and you can always save them again.
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
              tone="finished"
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
                  <Touchable
                    onPress={() => toggle(item.game.id)}
                    feedback="tint"
                    haptic="tap"
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
                          size={ICON.sm}
                          color={COLORS.navy}
                        />
                      )}
                    </View>
                    <CoverImage
                      uri={item.game.background_image}
                      style={styles.thumb}
                      size="thumb"
                      iconSize={ICON.md}
                    />
                    <View style={styles.body}>
                      <Text
                        style={styles.title}
                        numberOfLines={1}
                        maxFontSizeMultiplier={FONT_SCALE.label}
                      >
                        {item.game.name}
                      </Text>
                      <Text style={styles.meta}>
                        {STATUS_META[item.status].label}
                        {duration.hours > 0
                          ? ` · ${formatHours(duration.hours)}`
                          : ''}
                      </Text>
                    </View>
                  </Touchable>
                );
              }}
            />
          )}
        </View>

        {/* On the web the bars are sticky and live here, in the
            document. Native has no sticky — see `floating` below — so
            there they are siblings of the scroller and this is only
            the room they need at the foot of the list. */}
        {STICKY ? (
          bars
        ) : hasBar ? (
          <View style={[styles.barRoom, asking && styles.barRoomAsking]} />
        ) : null}
        <SiteFooter />
      </Screen>
      {STICKY ? null : bars}
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
    paddingBottom: SPACING.xxxl + SPACING.xl,
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
    minHeight: 56,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  /** Chosen to go: a breath of the colour letting go is. */
  rowPicked: { backgroundColor: alpha(COLORS.coral, 0.08) },
  box: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * Coral, because what a tick here means is "let this go". Amber said
   * "hours", about a choice that is not one.
   */
  boxOn: { backgroundColor: COLORS.coral, borderColor: COLORS.coral },
  /** The one row's art: a 40pt square at the thumbnail radius. */
  thumb: { width: 40, height: 40, borderRadius: RADIUS.xs },
  body: { flex: 1, gap: SPACING.xxs },
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
    ...(STICKY
      ? { position: 'sticky' as unknown as 'absolute', bottom: 0 }
      : null),
    left: 0,
    right: 0,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.darkGrey,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  barFloating: { position: 'absolute', bottom: 0 },
  /**
   * The height a floating bar covers, paid back under the list. The
   * question bar is the taller of the two — five answers and a way back.
   */
  barRoom: { height: 148 },
  barRoomAsking: { height: 280 },
  barCount: {
    ...TYPE.tag,
    // Letting go has its own colour in this app; the question that
    // opens the act should be asked in it.
    color: COLORS.coralText,
    textAlign: 'center',
  },
  barActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
