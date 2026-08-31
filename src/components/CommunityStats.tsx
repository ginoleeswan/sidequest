import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { AddedByStatus } from '@/api/types';
import { compact } from '@/lib/format';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const ROWS: {
  key: keyof AddedByStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'playing', label: 'Playing now', icon: 'game-controller' },
  { key: 'beaten', label: 'Beaten', icon: 'checkmark-circle' },
  /**
   * The one no store will print.
   *
   * HowLongToBeat shows "1.4% Retired" and it is the most useful number
   * on their page: how many people put it down. RAWG has sent `dropped`
   * in this same payload all along and nothing read it. An app whose
   * whole stance is permission to let go should say out loud that other
   * people did — it is the relief position (§2.1) as a statistic
   * rather than a sentence.
   */
  { key: 'dropped', label: 'Put it down', icon: 'arrow-undo' },
  { key: 'toplay', label: 'Want to play', icon: 'bookmark' },
  { key: 'owned', label: 'In libraries', icon: 'albums' },
];

/** What the community is doing with this game. */
export function CommunityStats({ status }: { status: AddedByStatus }) {
  const rows = ROWS.filter((r) => (status[r.key] ?? 0) > 0);
  if (rows.length === 0) return null;

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.key} style={styles.cell}>
          <Ionicons name={row.icon} size={16} color={COLORS.mediumGrey} />
          <View>
            <Text style={styles.value}>{compact(status[row.key] ?? 0)}</Text>
            <Text style={styles.label}>{row.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  /**
   * No chrome. These four sat in bordered tiles, which put boxes inside
   * whatever held the section — a crate on the phone, a flush rail on
   * the wide page — and a statistic does not need a container to be
   * one: the number is the object. Icon, figure, label, in a wrapping
   * two-up.
   */
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    /*
     * Equal shares, not content widths. The bordered tiles hid this:
     * with flexGrow alone each cell took the width of its own number
     * and label, so the second column started at 210 on one row and
     * 205 on the next — invisible behind a border, obvious once the
     * border went. A zero basis makes every cell on a row the same
     * width, and the min forces the wrap to two-up on a phone.
     */
    flexBasis: 0,
    flexGrow: 1,
    // 120, not 140: five stats at 140 measure 732 in a 722 column, so
    // the last one wrapped alone — an orphan row for the sake of 10pt.
    // At 120 all five sit on one line wide, and the phone still wraps
    // two-up exactly as before.
    minWidth: 120,
  },
  value: {
    ...TYPE.h3,
    color: COLORS.lightGrey,
  },
  label: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
});
