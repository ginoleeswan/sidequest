import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { buildIcs, downloadIcs, planEvents } from '@/lib/ics';
import { insertEvents } from '@/lib/nativeCalendar';
import { planColour } from '@/lib/planColours';
import { REMINDER_LEAD_MINUTES, scheduleEvenings } from '@/lib/reminders';
import type { ScheduledItem } from '@/lib/scheduler';
import { formatHours } from '@/lib/duration';
import { eveningHours, eveningLabel, planWeek } from '@/lib/week';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The next seven evenings, drawn as seven evenings.
 *
 * This has been a grid of named boxes and then a column of collapsed
 * runs, and both were the same mistake in different clothes: a week is
 * a shape, and both of them described the shape in words. "5h across 3
 * evenings" is a sentence about a bar chart.
 *
 * Worse, the run version added up every game in the evenings it
 * spanned, so a run that ended halfway through Tuesday claimed the hour
 * the NEXT game took — the reader saw "Oxenfree · 5h" here and
 * "Oxenfree · ~4h" on the route below, with nothing to explain the
 * difference. One number per game, and it is that game's own.
 *
 * So: one column per evening. Its height is the evening you actually
 * have — a Saturday is twice a Tuesday, which is the single most useful
 * thing a week can tell someone with a job — and it fills with the
 * colour of whatever the plan puts there. The names go underneath, once
 * each, next to their colour.
 */

/** The longest evening in `lib/week`, and so the tallest column. */
const MAX_EVENING_HOURS = 3;
const TRACK_HEIGHT = 84;
/** Small enough to read as "barely anything", big enough to see. */
const MIN_SEGMENT = 4;

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function WeekView({
  scheduled,
  now,
  leadId,
  children,
}: {
  scheduled: ScheduledItem[];
  now: number;
  /** Tonight's pick, so the first evening agrees with the card above. */
  leadId?: number;
  /**
   * What sits where the legend would.
   *
   * The plan page passes the route here, because the route already IS
   * the legend: same games, same order, same colours (both sides key
   * off planColour by route position). Rendering both meant every name
   * on the page twice, a bar chart's key repeated as a list directly
   * beneath itself. With children the built-in legend stays out of the
   * way; without, standalone use keeps it.
   */
  children?: React.ReactNode;
}) {
  const toast = useToast();
  const week = planWeek(scheduled, now, 7, leadId);

  if (week.every((evening) => evening.games.length === 0)) return null;

  /** Route position decides the colour, so the week and the list agree. */
  const colourOf = (id: number) =>
    planColour(scheduled.findIndex((item) => item.id === id));

  /**
   * What each game gets out of the week — its OWN hours, and the
   * evening it ends on. This is the number the legend prints, and the
   * reason the legend exists at all.
   */
  const legend: {
    id: number;
    name: string;
    hours: number;
    creditsOn?: number;
  }[] = [];
  for (const evening of week) {
    for (const game of evening.games) {
      const seen = legend.find((row) => row.id === game.id);
      const row = seen ?? { id: game.id, name: game.name, hours: 0 };
      row.hours += game.hours;
      if (game.finishes) row.creditsOn = evening.date;
      if (!seen) legend.push(row);
    }
  }

  /**
   * The week, moved somewhere it can actually interrupt you.
   *
   * This is the app's best answer and its weakest position: it is
   * right, and it is on a page nobody has open on a Tuesday at eight.
   * One event per planned evening, at eight, running as long as the
   * games in it — floating local time, so it stays "your evening" if
   * you travel, and skipping free nights, because filing "nothing" in
   * someone's calendar is not the same gesture as showing them a free
   * Tuesday here.
   */
  const putInCalendar = async () => {
    const events = planEvents(week);
    if (Platform.OS === 'web') {
      downloadIcs(
        buildIcs(events, { name: 'Sidequest — this week', now: new Date() }),
        'sidequest-week.ics'
      );
      toast(
        events.length === 1
          ? 'One evening, ready for your calendar'
          : `${events.length} evenings, ready for your calendar`,
        'calendar-outline'
      );
      return;
    }
    // Installed, the events go straight into the device's calendar
    // store — no file hand-off, still no account: see nativeCalendar.
    try {
      await insertEvents(events);
      /**
       * And a nudge before each one, asked for in the same breath.
       *
       * This is the only place the app schedules a notification, and it
       * is deliberately here rather than behind a settings toggle
       * nobody visits: the reader has just said "put these evenings in
       * my week", and a reminder is that sentence finished. The
       * permission sheet therefore arrives while they are asking for
       * exactly this, instead of at launch with no context.
       *
       * A decline returns 0 rather than throwing — but the module
       * itself CAN throw (Expo Go, notifications unavailable), and an
       * uncaught throw here used to fall into the calendar catch below
       * and report "Couldn't reach your calendar" about a write that
       * had already succeeded. The calendar's toast tells the
       * calendar's truth; reminders that could not be set are simply
       * not mentioned, same as reminders that were declined.
       */
      const nudges = await scheduleEvenings(events).catch(() => 0);
      toast(
        (events.length === 1
          ? 'One evening, filed in your calendar'
          : `${events.length} evenings, filed in your calendar`) +
          (nudges > 0
            ? ` · reminders ${REMINDER_LEAD_MINUTES} min before`
            : ''),
        'calendar-outline'
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Couldn't reach your calendar",
        'alert-circle'
      );
    }
  };

  return (
    <View style={styles.week}>
      <View style={styles.strip}>
        {week.map((evening, index) => {
          const capacity = eveningHours(evening.weekday);
          const height = (capacity / MAX_EVENING_HOURS) * TRACK_HEIGHT;
          const planned = evening.games.reduce((sum, g) => sum + g.hours, 0);
          const credits = evening.games.some((g) => g.finishes);
          const label = eveningLabel(evening, now);

          return (
            <View
              key={evening.date}
              style={styles.column}
              accessible
              accessibilityRole="image"
              accessibilityLabel={
                evening.games.length === 0
                  ? `${label}, free`
                  : `${label}, ${formatHours(planned)} on ${evening.games
                      .map((g) => g.name)
                      .join(' then ')}`
              }
            >
              <View style={styles.flagSlot}>
                {credits ? (
                  <Ionicons name="flag" size={11} color={COLORS.accent} />
                ) : null}
              </View>
              <View
                style={[
                  styles.track,
                  { height },
                  evening.games.length === 0 && styles.trackFree,
                ]}
              >
                {evening.games.map((game, at) => (
                  <View
                    key={`${game.id}-${at}`}
                    style={{
                      height: Math.max(
                        MIN_SEGMENT,
                        (game.hours / capacity) * height
                      ),
                      backgroundColor: colourOf(game.id),
                    }}
                  />
                ))}
              </View>
              <Text style={[styles.day, index === 0 && styles.dayTonight]}>
                {DAY_LETTERS[evening.weekday]}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.rule} />

      {children ?? (
        <>
          <View style={styles.legend}>
            {legend.map((row) => (
              <View key={row.id} style={styles.legendRow}>
                <View
                  style={[styles.swatch, { backgroundColor: colourOf(row.id) }]}
                />
                <Text style={styles.legendName} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.legendMeta}>
                  {formatHours(row.hours)} this week
                  {row.creditsOn != null
                    ? ` · credits ${eveningLabel(
                        {
                          date: row.creditsOn,
                          weekday: 0,
                          hours: 0,
                          games: [],
                        },
                        now
                      )}`
                    : ''}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.rule} />

      {/* Quiet, and last: the plan is the thing, this is what you do
          with it. Text-and-icon rather than a button, because a second
          filled control here would compete with the plan's own
          actions — and inside the panel rather than under it, because
          it acts on the week the panel is holding. */}
      <Pressable
        onPress={putInCalendar}
        style={styles.toCalendar}
        accessibilityRole="button"
        accessibilityLabel="Add this week to your calendar"
      >
        <Ionicons name="calendar-outline" size={14} color={COLORS.mediumGrey} />
        <Text style={styles.toCalendarText}>Put this week in my calendar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * One object, with three tiers inside it.
   *
   * The strip, the names and the calendar hand-off used to float
   * separately on the page, which made a week look like three unrelated
   * things that happened to be adjacent. A panel groups them, and the
   * rules inside say which is which — picture, then key, then what you
   * can do with it.
   *
   * `raised` rather than `surface`: surface is a step down from the
   * page's navy and reads as a recess.
   */
  week: {
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    ...SHADOW.card,
  },
  rule: { height: 1, backgroundColor: COLORS.stroke },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm - 2,
  },
  column: { flex: 1, alignItems: 'center', gap: SPACING.xs },
  /** Reserved whether or not a flag lands here, so nothing jumps. */
  flagSlot: { height: 12, justifyContent: 'center' },
  track: {
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: COLORS.raised,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    // First game at the bottom: earlier in the evening reads as lower.
    flexDirection: 'column-reverse',
  },
  /** An empty evening is information, so it is drawn rather than skipped. */
  trackFree: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  day: { ...TYPE.micro, color: COLORS.mediumGrey },
  /** Seven identical letters need one of them to be today. */
  dayTonight: { color: COLORS.accent },

  legend: { gap: SPACING.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  legendName: { ...TYPE.labelSmall, color: COLORS.lightGrey, flexShrink: 1 },
  legendMeta: { ...TYPE.fine, color: COLORS.mediumGrey, flexShrink: 1 },

  toCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  toCalendarText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
});
