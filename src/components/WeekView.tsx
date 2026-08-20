import { StyleSheet, Text, View } from 'react-native';

import { formatHours } from '@/lib/duration';
import type { ScheduledItem } from '@/lib/scheduler';
import { eveningLabel, planWeek } from '@/lib/week';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The next seven evenings.
 *
 * The route below this says what and by when; this says when. An empty
 * evening is drawn as empty on purpose — seeing Thursday free is what
 * makes the plan feel possible rather than owed.
 */
export function WeekView({
  scheduled,
  now,
}: {
  scheduled: ScheduledItem[];
  now: number;
}) {
  const week = planWeek(scheduled, now);
  if (week.every((evening) => evening.games.length === 0)) return null;

  return (
    <View style={styles.week}>
      {week.map((evening) => {
        const label = eveningLabel(evening, now);
        return (
          <View
            key={evening.date}
            style={[styles.evening, evening.games.length === 0 && styles.free]}
          >
            <Text style={styles.day}>{label}</Text>
            {evening.games.length === 0 ? (
              <Text style={styles.nothing}>free</Text>
            ) : (
              evening.games.map((game, index) => (
                <View key={`${game.id}-${index}`} style={styles.game}>
                  <Text style={styles.name} numberOfLines={1}>
                    {game.name}
                  </Text>
                  <Text
                    style={[styles.hours, game.finishes && styles.finishes]}
                  >
                    {game.finishes
                      ? `${formatHours(game.hours)} · credits`
                      : formatHours(game.hours)}
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  evening: {
    flexGrow: 1,
    flexBasis: 128,
    minHeight: 92,
    gap: 4,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  free: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  day: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  nothing: {
    ...TYPE.fine,
    color: COLORS.stroke,
  },
  game: { gap: 1 },
  name: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  hours: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
  finishes: { color: COLORS.accent },
});
