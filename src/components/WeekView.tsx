import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { buildIcs, downloadIcs, planEvents } from '@/lib/ics';
import type { ScheduledItem } from '@/lib/scheduler';
import { formatHours } from '@/lib/duration';
import { eveningLabel, planWeek, type PlannedEvening } from '@/lib/week';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The next seven evenings, as a column.
 *
 * This was a grid of seven boxes, each naming its game. That reads
 * beautifully when the week holds four different games and absurdly
 * when it holds one: a seventy-hour game fills every evening, so the
 * week became seven identical cards all reading "Grand Theft Aut…".
 *
 * The unit is a run, not an evening. One game across five nights is one
 * block that says so, with the nights listed down its side — which is
 * both less repetitive and more honest, because "this is your whole
 * week" is the actual finding.
 */

interface Run {
  key: string;
  name: string | null;
  evenings: PlannedEvening[];
  hours: number;
  finishes: boolean;
}

/** Consecutive evenings on the same game, collapsed. */
function runs(week: PlannedEvening[]): Run[] {
  const out: Run[] = [];
  for (const evening of week) {
    const lead = evening.games[0];
    const name = lead?.name ?? null;
    const last = out[out.length - 1];
    // A finished run is closed: the next evening starts something new
    // even when the name happens to repeat.
    if (last && last.name === name && !last.finishes) {
      last.evenings.push(evening);
      last.hours += evening.games.reduce((sum, g) => sum + g.hours, 0);
      last.finishes = evening.games.some((g) => g.finishes);
    } else {
      out.push({
        key: `${evening.date}-${name ?? 'free'}`,
        name,
        evenings: [evening],
        hours: evening.games.reduce((sum, g) => sum + g.hours, 0),
        finishes: evening.games.some((g) => g.finishes),
      });
    }
  }
  return out;
}

export function WeekView({
  scheduled,
  now,
  leadId,
}: {
  scheduled: ScheduledItem[];
  now: number;
  /** Tonight's pick, so the first evening agrees with the card above. */
  leadId?: number;
}) {
  const toast = useToast();
  const week = planWeek(scheduled, now, 7, leadId);
  if (week.every((evening) => evening.games.length === 0)) return null;

  /**
   * The week, moved somewhere it can actually interrupt you.
   *
   * This column is the app's best answer and its weakest position: it
   * is right, and it is on a page nobody has open on a Tuesday at
   * eight. One event per planned evening, at eight, running as long as
   * the games in it — floating local time, so it stays "your evening"
   * if you travel, and skipping free nights, because filing "nothing"
   * in someone's calendar is not the same gesture as showing them a
   * free Tuesday here.
   */
  const putInCalendar = () => {
    const events = planEvents(week);
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
  };

  return (
    <View style={styles.week}>
      {runs(week).map((run) => {
        const span = run.evenings.length;
        const first = eveningLabel(run.evenings[0], now);
        const last = eveningLabel(run.evenings[span - 1], now);
        const when = span === 1 ? first : `${first} – ${last}`;

        if (run.name == null) {
          return (
            <View key={run.key} style={[styles.run, styles.free]}>
              <Text style={styles.when}>{when.toUpperCase()}</Text>
              <Text style={styles.nothing}>
                {span === 1 ? 'Nothing planned' : `${span} evenings free`}
              </Text>
            </View>
          );
        }

        return (
          <View key={run.key} style={styles.run}>
            <View style={styles.runHead}>
              <Text style={styles.when}>{when.toUpperCase()}</Text>
              {run.finishes && (
                <View style={styles.credits}>
                  <Ionicons name="flag" size={11} color={COLORS.accent} />
                  <Text style={styles.creditsText}>CREDITS</Text>
                </View>
              )}
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {run.name}
            </Text>
            <Text style={styles.hours}>
              {span === 1
                ? formatHours(run.hours)
                : `${formatHours(run.hours)} across ${span} evenings`}
            </Text>
          </View>
        );
      })}

      {/* Quiet, and last: the plan is the thing, this is what you do
          with it. Text-and-icon rather than a button, because a second
          filled control here would compete with the plan's own
          actions. */}
      {Platform.OS === 'web' && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { gap: SPACING.sm },
  toCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
  },
  toCalendarText: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
  run: {
    gap: 3,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
  },
  /** An empty evening is information, so it is drawn rather than skipped. */
  free: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  runHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  when: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  credits: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditsText: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  nothing: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
  name: {
    ...TYPE.h3,
    color: COLORS.white,
  },
  hours: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
});
