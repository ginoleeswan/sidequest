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
 * The next seven evenings, written as an agenda.
 *
 * This has been a grid of named boxes, a column of collapsed runs, and
 * most recently a strip of seven vertical bars with the route standing
 * in as its legend — and the bars still asked the reader to decode: a
 * mint sliver in Thursday's column is a puzzle, where "THU 28 · Hades ·
 * 1.5h" is an answer. The question a week view exists for is "what am
 * I doing Thursday?", and an agenda answers it literally.
 *
 * So: one row per evening, in reading order. The date on the left makes
 * it a calendar — a calendar is a thing that names dates, not a thing
 * that draws boxes. The block's width is the evening you actually have
 * (a Saturday is twice a Tuesday), it wears the game's plan colour, and
 * it says the game's name and hours inside itself, so there is no
 * legend anywhere to cross-reference.
 *
 * Two deliberate quietnesses. A free evening is DRAWN — dashed, and
 * labelled "free evening" — because an empty row reads as a gap you
 * failed to fill, and a row that says free reads as a night you get
 * back; that is the relief stance (§2.1) made visible, and it is the
 * most important decision in this file. And a game that spans several
 * evenings is named once, on the evening it starts: seven rows all
 * reading "Grand Theft Aut…" is a worse way to say "this week is one
 * game" than one named block and six in its colour.
 */

/** The longest evening in `lib/week`, and so the full track width. */
const MAX_EVENING_HOURS = 3;

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

/** Anything shorter reads as a sliver, not as time worth drawing. */
const MIN_DRAWN_HOURS = 0.5;

/**
 * Name each game's run exactly once, in a block wide enough to hold
 * the name. A run often starts as the tail of a shared evening — half
 * an hour of Sunday after something else finished — and naming it
 * there prints "Tu…" in a sliver while the full evening below goes
 * unlabelled. So: the first block of the run that is at least an hour
 * wide gets the name, or the run's widest block when none is.
 * (A plain function, not inline in render — the walk carries state
 * between evenings.)
 */
function nameRuns(week: ReturnType<typeof planWeek>) {
  const flat: { evening: number; seg: number; id: number; hours: number }[] =
    [];
  week.forEach((evening, e) =>
    evening.games.forEach((game, s) =>
      flat.push({ evening: e, seg: s, id: game.id, hours: game.hours })
    )
  );

  const named = new Set<string>();
  let start = 0;
  for (let i = 1; i <= flat.length; i++) {
    if (i === flat.length || flat[i].id !== flat[start].id) {
      const run = flat.slice(start, i);
      const best =
        run.find((block) => block.hours >= 1) ??
        run.reduce((a, b) => (b.hours > a.hours ? b : a));
      named.add(`${best.evening}-${best.seg}`);
      start = i;
    }
  }

  return week.map((evening, e) => ({
    ...evening,
    segments: evening.games.map((game, s) => ({
      ...game,
      named: named.has(`${e}-${s}`),
    })),
  }));
}

export function WeekView({
  scheduled,
  now,
  leadId,
  readOnly = false,
  bare = false,
}: {
  scheduled: ScheduledItem[];
  now: number;
  /** Tonight's pick, so the first evening agrees with the card above. */
  leadId?: number;
  /** Inside a plate that is not its own: no card of its own to draw. */
  bare?: boolean;
  /**
   * Somebody else's week, so the calendar hand-off stays out of it.
   *
   * A shared plan draws the same seven evenings, and offering to file
   * them in YOUR calendar would be the app misreading whose week it is
   * holding — a friend's Thursday is not an appointment you have.
   */
  readOnly?: boolean;
}) {
  const toast = useToast();
  const week = planWeek(scheduled, now, 7, leadId);

  if (week.every((evening) => evening.games.length === 0)) return null;

  /** Route position decides the colour, so the week and the month agree. */
  const colourOf = (id: number) =>
    planColour(scheduled.findIndex((item) => item.id === id));

  const rows = nameRuns(week);

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
    <View style={bare ? styles.weekBare : styles.week}>
      <View style={styles.agenda}>
        {rows.map((evening, index) => {
          const capacity = eveningHours(evening.weekday);
          const planned = evening.games.reduce((sum, g) => sum + g.hours, 0);
          const credits = evening.games.some((g) => g.finishes);
          const label = eveningLabel(evening, now);
          const spare = capacity - planned;

          return (
            <View
              key={evening.date}
              style={styles.eveningRow}
              accessible
              accessibilityRole="image"
              accessibilityLabel={
                evening.games.length === 0
                  ? `${label}, free`
                  : `${label}, ${formatHours(planned)} on ${evening.games
                      .map((g) => g.name)
                      .join(' then ')}${credits ? ' — the credits roll' : ''}`
              }
            >
              <View style={styles.dayCell}>
                <Text style={[styles.dayName, index === 0 && styles.dayToday]}>
                  {DAY_NAMES[evening.weekday]}
                </Text>
                <Text style={styles.dayDate}>
                  {new Date(evening.date).getDate()}
                </Text>
              </View>

              <View style={styles.track}>
                {evening.games.length === 0 ? (
                  /* Drawn, not skipped: a free evening is the plan
                     giving a night back, and it has to LOOK given
                     back rather than missed. */
                  <View
                    style={[
                      styles.freeBlock,
                      { width: `${(capacity / MAX_EVENING_HOURS) * 100}%` },
                    ]}
                  >
                    <Text style={styles.freeText}>free evening</Text>
                  </View>
                ) : (
                  <>
                    {evening.segments.map((game, at) => (
                      <View
                        key={`${game.id}-${at}`}
                        style={[
                          styles.block,
                          {
                            width: `${(game.hours / MAX_EVENING_HOURS) * 100}%`,
                            backgroundColor: colourOf(game.id),
                          },
                        ]}
                      >
                        <Text style={styles.blockText} numberOfLines={1}>
                          {game.named
                            ? `${game.name} · ${formatHours(game.hours)}`
                            : formatHours(game.hours)}
                        </Text>
                      </View>
                    ))}
                    {/* An evening the plan only half fills ends in
                        free time, and that remainder is drawn the way
                        a whole free evening is. */}
                    {spare >= MIN_DRAWN_HOURS && (
                      <View
                        style={[
                          styles.freeBlock,
                          { width: `${(spare / MAX_EVENING_HOURS) * 100}%` },
                        ]}
                      />
                    )}
                  </>
                )}
              </View>

              {/* Reserved whether or not a flag lands, so rows align. */}
              <View style={styles.flagSlot}>
                {credits ? (
                  <Ionicons name="flag" size={12} color={COLORS.accent} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {!readOnly && (
        <>
          <View style={styles.rule} />

          {/* Quiet, and last: the plan is the thing, this is what you
              do with it. Text-and-icon rather than a button, because a
              second filled control here would compete with the plan's
              own actions — and inside the panel rather than under it,
              because it acts on the week the panel is holding. */}
          <Pressable
            onPress={putInCalendar}
            style={styles.toCalendar}
            accessibilityRole="button"
            accessibilityLabel="Add this week to your calendar"
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.mediumGrey}
            />
            <Text style={styles.toCalendarText}>
              Put this week in my calendar
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * One panel: the agenda, then what you can do with it.
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
  weekBare: { gap: SPACING.md },
  rule: { height: 1, backgroundColor: COLORS.stroke },

  // Tighter than it was: seven rows at thirty points with eight between
  // them was a chart the height of a screenshot for a week that mostly
  // says "an hour and a half". The rows keep their meaning at twenty-four.
  agenda: { gap: 6 },
  eveningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  /**
   * The date, because a calendar is a thing that names dates. Wide
   * enough for "WED 30", fixed so the tracks share a left edge —
   * without which the widths stop being comparable, which is the
   * whole point of drawing them.
   */
  dayCell: { width: 44, flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  dayName: { ...TYPE.micro, color: COLORS.mediumGrey, letterSpacing: 0.5 },
  /** Seven near-identical rows need one of them to be tonight. */
  dayToday: { color: COLORS.accent },
  dayDate: { ...TYPE.labelSmall, color: COLORS.lightGrey },

  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  block: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  /** Dark on amber, violet and mint alike — the one ink all three take. */
  blockText: { ...TYPE.labelTiny, color: COLORS.navy },
  freeBlock: {
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeText: { ...TYPE.micro, color: COLORS.mediumGrey },
  flagSlot: { width: 16, alignItems: 'center' },

  toCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  toCalendarText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
});
