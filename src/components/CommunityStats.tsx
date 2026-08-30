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
    minWidth: 140,
    flexGrow: 1,
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
