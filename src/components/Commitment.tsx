import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from './Toast';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The two things a person knows about a game that the arithmetic cannot:
 * that they have to finish this one, and that there is a date it stops
 * mattering.
 *
 * Both are deliberately coarse. A date picker would be a form; the
 * point is a decision, and "before the end of the month" is how anyone
 * actually thinks about a backlog.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Labels that finish the sentence "Finish …".
 *
 * They used to finish "Finish by …", which produced "Finish by no date"
 * and "Finish by in 3 months" — neither of them English. The verb owns
 * the preposition now, so every option reads as a sentence.
 */
const BY: { label: string; days: number | null }[] = [
  { label: 'no date', days: null },
  { label: 'this month', days: 30 },
  { label: 'within 3 months', days: 90 },
  { label: 'this year', days: 365 },
];

/** The label whose window this deadline falls in. */
function labelFor(deadline: number | undefined, now: number): string {
  if (deadline == null) return 'no date';
  const days = Math.ceil((deadline - now) / DAY);
  return (
    BY.find((option) => option.days != null && days <= option.days)?.label ??
    'this year'
  );
}

export function Commitment({ gameId }: { gameId: number }) {
  const { entries, setDeadline, setWant } = useLibrary();
  const toast = useToast();
  const entry = entries[String(gameId)];
  // Captured once: reading the clock during render is impure, and the
  // labels only need to know roughly when "now" was.
  const [now] = useState(() => Date.now());

  // Nothing to commit to until the game is actually saved.
  if (!entry) return null;

  const must = (entry.want ?? 2) >= 3;
  const current = labelFor(entry.deadline, now);
  // The absence of a deadline is its own state, not a date to finish by.
  const phrase = entry.deadline == null ? 'No deadline' : `Finish ${current}`;
  const nextIndex =
    (BY.findIndex((option) => option.label === current) + 1) % BY.length;
  const next = BY[nextIndex];

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          setWant(gameId, must ? 2 : 3);
          toast(
            must ? 'No longer a must' : 'Must play — the plan will keep it',
            must ? 'star-outline' : 'star'
          );
        }}
        style={[styles.chip, must && styles.chipOn]}
        accessibilityRole="button"
        accessibilityState={{ selected: must }}
        accessibilityLabel={
          must ? 'Stop insisting on this game' : 'Insist on playing this game'
        }
      >
        <Ionicons
          name={must ? 'star' : 'star-outline'}
          size={14}
          color={must ? COLORS.accent : COLORS.mediumGrey}
        />
        <Text style={[styles.chipText, must && styles.chipTextOn]}>
          Must play
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          setDeadline(gameId, next.days == null ? null : now + next.days * DAY);
          toast(
            next.days == null
              ? 'Deadline cleared'
              : `Finish ${next.label} — the plan will schedule it first`,
            'calendar'
          );
        }}
        style={[styles.chip, entry.deadline != null && styles.chipOn]}
        accessibilityRole="button"
        accessibilityLabel={`${phrase}. Tap to change.`}
      >
        <Ionicons
          name="calendar-outline"
          size={14}
          color={entry.deadline != null ? COLORS.accent : COLORS.mediumGrey}
        />
        <Text
          style={[styles.chipText, entry.deadline != null && styles.chipTextOn]}
        >
          {phrase}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Quiet actions, not lozenges.
   *
   * These were two more outlined pills in a page already full of them,
   * floating under the status control with nothing to sit on. Inside
   * the decision panel they are icon-and-label, and the accent — the
   * app's one selection colour — says which are on.
   */
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: SPACING.xs,
  },
  chipOn: {},
  chipText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  chipTextOn: { color: COLORS.accent },
});
