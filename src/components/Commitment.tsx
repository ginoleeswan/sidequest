import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useToast } from './Toast';
import { Touchable } from './Touchable';
import { useLibrary } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { ICON, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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
      <Touchable
        onPress={() => {
          setWant(gameId, must ? 2 : 3);
          toast(
            must ? 'No longer a must' : 'Must play — the plan will keep it',
            must ? 'star-outline' : 'star'
          );
        }}
        // A commitment made is felt landing; 25pt of text grows to a
        // thumb's height without growing into the next word.
        haptic="impact"
        hitSlop="text"
        style={styles.chip}
        accessibilityState={{ selected: must }}
        accessibilityLabel={
          must ? 'Stop insisting on this game' : 'Insist on playing this game'
        }
      >
        <Ionicons
          name={must ? 'star' : 'star-outline'}
          size={ICON.sm}
          color={must ? COLORS.violetText : COLORS.mediumGrey}
        />
        <Text
          style={[styles.chipText, must && styles.chipTextOn]}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
          Must play
        </Text>
      </Touchable>

      <Touchable
        onPress={() => {
          setDeadline(gameId, next.days == null ? null : now + next.days * DAY);
          toast(
            next.days == null
              ? 'Deadline cleared'
              : `Finish ${next.label} — the plan will schedule it first`,
            'calendar'
          );
        }}
        haptic="impact"
        hitSlop="text"
        style={styles.chip}
        accessibilityLabel={`${phrase}. Tap to change.`}
      >
        <Ionicons
          name="calendar-outline"
          size={ICON.sm}
          color={entry.deadline != null ? COLORS.violetText : COLORS.mediumGrey}
        />
        <Text
          style={[styles.chipText, entry.deadline != null && styles.chipTextOn]}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
          {phrase}
        </Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Quiet actions, not lozenges.
   *
   * These were two more outlined pills in a page already full of them,
   * floating under the status control with nothing to sit on. Inside
   * the decision panel they are icon-and-label, and violet says which
   * are on: both are instructions to the plan ("the plan will keep
   * it", "the plan will schedule it first"), and violet is the plan's
   * colour. Amber here made a commitment look like the status control
   * above it, which is the page's primary action.
   */
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  chipTextOn: { color: COLORS.violetText },
});
