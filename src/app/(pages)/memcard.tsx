import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { LandingMemcard } from '@/components/LandingMemcard';
import { Message } from '@/components/Message';
import { PageTitle } from '@/components/PageTitle';
import { Screen } from '@/components/Screen';
import { RouteError } from '@/components/RouteError';
import { SectionHeader } from '@/components/SectionHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Textured } from '@/components/Textured';
import { useToast } from '@/components/Toast';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTopPad } from '@/hooks/useTopPad';
import { useHydrated } from '@/hooks/useHydrated';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { dropInsight, readDrops, totalDrops } from '@/lib/drops';
import { buildMemcard, memcardYears } from '@/lib/memcard';
import { formatMinutes } from '@/lib/sessions';
import { yearStats } from '@/lib/yearStats';
import { celebrate } from '@/lib/haptics';
import { buildIcs, downloadIcs, memcardEvents } from '@/lib/ics';
import { insertEvents } from '@/lib/nativeCalendar';
import { shareMemcard } from '@/lib/memcardImage';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The year, as a memory card.
 *
 * Every other year-in-review celebrates volume, which is a flex only if
 * you had the time. This one celebrates finishing — because for someone
 * with an hour a night, seeing the credits twice in a year is the
 * achievement, and nothing else tells them so.
 */
export default function MemcardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = useTopPad(true);
  const { isExpanded, width } = useBreakpoint();
  const { entries } = useLibrary();
  const { durationOf } = useDurations();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  /** What view-shot rasterises on native: the on-screen card itself. */
  const shotRef = useRef<View>(null);

  const all = useMemo(() => Object.values(entries), [entries]);
  const years = useMemo(() => memcardYears(all), [all]);
  const hydrated = useHydrated();
  const [thisYear] = useState(() => new Date().getFullYear());
  const [year, setYear] = useState<number | null>(null);
  const shown = year ?? years[0] ?? thisYear;

  const card = useMemo(
    () => buildMemcard(all, (game) => durationOf(game).hours, shown),
    [all, durationOf, shown]
  );

  /** Cover art for the save slots, by game id. */
  const byId = useMemo(
    () => new Map(all.map((entry) => [entry.game.id, entry.game])),
    [all]
  );
  const cardWidth = Math.min(
    isExpanded ? 900 : LAYOUT.maxContentWidth,
    width - SPACING.lg * 2
  );

  /**
   * The card is the brag; this is the mirror. Same year, the questions a
   * share artifact would never put on itself: did the pile grow, how
   * long was the longest silence, how much of this is measured rather
   * than estimated.
   */
  const stats = useMemo(
    () => yearStats(all, (entry) => durationOf(entry.game).hours, shown),
    [all, durationOf, shown]
  );
  const drops = useMemo(() => (hydrated ? readDrops() : {}), [hydrated]);

  /**
   * The year, on the calendar you actually keep.
   *
   * The card is a thing you post; this is the same year filed where you
   * look for your life. A `.ics` rather than an integration, because
   * Google's API wants OAuth and a server and Apple's has no web API at
   * all — and both would mean this app growing the account and backend
   * it promises not to have. Every calendar worth the name opens one.
   */
  const addToCalendar = async () => {
    const events = memcardEvents(all, (game) => durationOf(game).hours, shown);
    if (Platform.OS === 'web') {
      downloadIcs(
        buildIcs(events, {
          name: `Sidequest ${shown}`,
          now: new Date(),
        }),
        `sidequest-${shown}.ics`
      );
      toast(
        events.length === 1
          ? 'One finish, ready for your calendar'
          : `${events.length} finishes, ready for your calendar`,
        'calendar-outline'
      );
      return;
    }
    // Installed, the device's calendar store is one permission away — no
    // file hand-off, and still no account: see nativeCalendar.
    try {
      await insertEvents(events);
      toast(
        events.length === 1
          ? 'One finish, filed in your calendar'
          : `${events.length} finishes, filed in your calendar`,
        'calendar-outline'
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Couldn't reach your calendar",
        'alert-circle'
      );
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        const how = await shareMemcard(card);
        toast(
          how === 'shared' ? 'Card shared' : 'Card saved to your downloads',
          'image'
        );
      } else {
        // The share image is the card on screen, captured as pixels —
        // no DOM, no canvas, so the web rasteriser can't run here.
        const { captureRef } = await import('react-native-view-shot');
        const uri = await captureRef(shotRef, { format: 'png', quality: 1 });
        const Sharing = await import('expo-sharing');
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error('Sharing is not available on this device');
        }
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Your ${shown} on Sidequest`,
        });
        celebrate();
        toast('Card shared', 'image');
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'The card could not be made',
        'alert-circle'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Textured style={styles.background}>
      <PageTitle>{`Your ${shown} — Sidequest`}</PageTitle>
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
              paddingTop: topPad,
            },
          ]}
        >
          <SectionHeader title="Your Memcard" eyebrow={`${shown}`} />
          <Text style={styles.lede}>
            One block per game you finished. Not how much you played — what you
            saw the end of.
          </Text>

          {years.length > 1 && (
            <View style={styles.years}>
              {years.map((option) => (
                <Chip
                  key={option}
                  title={String(option)}
                  selected={option === shown}
                  onPress={() => setYear(option)}
                />
              ))}
            </View>
          )}

          {card.count === 0 ? (
            <Message
              icon="albums-outline"
              title="No credits rolled yet"
              detail="Finish a game and it takes a block here. One short game is all it takes."
              actionLabel="Find something short"
              onAction={() => router.push('/plan')}
            />
          ) : (
            <>
              {/* The save-slot card, not the share image.
                What gets posted is 1200x630 with its metadata down the
                left — the right shape for a link preview and the wrong
                one to look at, which on a phone rendered as small print
                beside a thumbnail of the only part that matters. On
                screen the grid IS the card, and every month you
                finished something keeps that game's cover as its save
                icon. Same object, two stages; shareMemcard still
                rasterises the social layout. */}
              <View ref={shotRef} collapsable={false}>
                <LandingMemcard
                  card={card}
                  width={cardWidth}
                  landed={card.blocks.length}
                  images={card.blocks.map(
                    (block) => byId.get(block.id)?.background_image ?? undefined
                  )}
                />
              </View>
              <View style={styles.stats}>
                <SectionHeader title="How the year is going" />
                <Text style={styles.verdict}>{stats.verdict}</Text>
                <View style={styles.statRow}>
                  <Stat value={String(stats.added)} label="saved this year" />
                  <Stat
                    value={String(stats.finished)}
                    label="finished"
                    accent={stats.finished > 0}
                  />
                  {stats.medianLength > 0 && (
                    <Stat
                      value={`${Math.round(stats.medianLength)}h`}
                      label="typical length"
                    />
                  )}
                  {stats.longestGap > 14 && (
                    <Stat
                      value={`${stats.longestGap}d`}
                      label="longest quiet spell"
                    />
                  )}
                  {stats.measuredMinutes > 0 && (
                    <Stat
                      value={formatMinutes(stats.measuredMinutes)}
                      label="timed here"
                      accent
                    />
                  )}
                  {totalDrops(drops) > 0 && (
                    <Stat
                      value={String(totalDrops(drops))}
                      label="let go, guilt-free"
                    />
                  )}
                </View>
                {dropInsight(drops) && (
                  <Text style={styles.insight}>{dropInsight(drops)}</Text>
                )}
              </View>

              <Pressable
                onPress={save}
                disabled={busy}
                style={[styles.save, busy && styles.saveBusy]}
                accessibilityRole="button"
              >
                <Ionicons
                  name="share-outline"
                  size={16}
                  color={COLORS.darkGrey}
                />
                <Text style={styles.saveText}>
                  {busy ? 'Drawing…' : 'Save or share this card'}
                </Text>
              </Pressable>

              {/* Second, and quieter than the share. Posting the card is
                what most people came for; filing the year is what the
                few who keep a calendar will be glad of. */}
              <Pressable
                onPress={addToCalendar}
                style={styles.calendar}
                accessibilityRole="button"
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={COLORS.lightGrey}
                />
                <Text style={styles.calendarText}>
                  Add these to my calendar
                </Text>
              </Pressable>
              <Text style={styles.calendarNote}>
                {Platform.OS === 'web'
                  ? 'Downloads a file Google Calendar, Apple Calendar and Outlook can all open. Nothing is sent anywhere.'
                  : 'Filed into a calendar of their own on this device — one checkbox to hide, one deletion to undo. Nothing is sent anywhere.'}
              </Text>
            </>
          )}
        </View>
        <SiteFooter />
      </Screen>
    </Textured>
  );
}

/** One number and what it means, matching the library's stat strip. */
function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xl * 2,
    gap: SPACING.md,
  },
  lede: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    marginTop: -SPACING.xs,
  },
  years: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  saveBusy: { opacity: 0.6 },
  saveText: {
    ...TYPE.label,
    color: COLORS.darkGrey,
  },
  /**
   * The second action, outlined rather than filled.
   *
   * Two solid buttons in a column read as a choice the reader has to
   * make; a filled one and an outlined one read as the thing to do and
   * the thing you can also do. Same height and radius as the share, so
   * the pair sits as a pair.
   */
  calendar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  calendarText: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
  calendarNote: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    maxWidth: 420,
    marginTop: SPACING.xs,
  },
  stats: { gap: SPACING.sm, marginTop: SPACING.lg },
  verdict: {
    ...TYPE.p,
    color: COLORS.lightGrey,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  /**
   * Even columns, not content-sized cells.
   *
   * Sized to their contents these made a ragged strip — "0 / SAVED THIS
   * YEAR" is three times the width of "8 / FINISHED", so no two numbers
   * in the row lined up with anything, and the wrap fell in a different
   * place at every count. A fixed basis with no growth makes it a grid
   * at any width and leaves the leftover space at the right, where a
   * grid's leftover space belongs, instead of stretching whichever
   * stats happen to land on the last row.
   */
  stat: { gap: 2, flexBasis: 132, flexGrow: 0 },
  statValue: {
    ...TYPE.h3,
    color: COLORS.white,
  },
  statAccent: { color: COLORS.accent },
  statLabel: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  insight: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
});

export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
