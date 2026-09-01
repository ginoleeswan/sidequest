import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTonightPick } from '@/hooks/useTonightPick';
import { formatHours } from '@/lib/duration';
import { sessionMinutesFor } from '@/lib/sessions';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Tonight's clock, at the foot of the rail.
 *
 * A rail is navigation; every app's says where you can go. The one
 * fact this app owns is your time, so the bottom of its rail says what
 * tonight is for: the evening you have, and the game the plan would
 * spend it on. It is the Plan's first line item, kept in view from
 * every page, and it opens the Plan. Collapsed, only the hour figure
 * survives - in the colour reserved for time.
 */
export function RailClock({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const tonight = useTonightPick();
  const minutes = sessionMinutesFor();
  const hours = formatHours(minutes / 60);
  // The stage's own answer for tonight - the same game and verb the
  // masthead leads with, so the rail never disagrees with the page.
  const pick = tonight?.game ?? null;
  const verb = tonight?.verb ?? 'Start';
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  if (collapsed) {
    return (
      <Pressable
        onPress={() => router.push('/plan')}
        style={styles.compact}
        accessibilityRole="link"
        accessibilityLabel={`Tonight: ${hours}. Open the plan`}
      >
        <Text style={styles.compactHours}>{hours}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/plan')}
      style={styles.clock}
      accessibilityRole="link"
      accessibilityLabel={`Tonight, ${hours} free${pick ? `: ${verb} ${pick.name}` : ''}. Open the plan`}
    >
      <View style={styles.row}>
        <Text style={styles.eyebrow}>{weekday.toUpperCase()} · TONIGHT</Text>
        <Text style={styles.hours}>{hours}</Text>
      </View>
      <Text style={styles.line} numberOfLines={2}>
        {pick
          ? `${verb} ${pick.name}`
          : 'Save a game and the plan fills this in.'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clock: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    // The rail's one plate - the active item's, search's - and no ring:
    // one rail, one material.
    backgroundColor: COLORS.raised,
    gap: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  eyebrow: { ...TYPE.micro, color: COLORS.mediumGrey, flexShrink: 1 },
  hours: { ...TYPE.label, color: COLORS.accent },
  line: { ...TYPE.labelSmall, color: COLORS.lightGrey },
  compact: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.raised,
  },
  compactHours: { ...TYPE.labelSmall, color: COLORS.accent },
});
