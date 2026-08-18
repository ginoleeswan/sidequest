import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';

interface Props {
  title: string;
  /** Small muted line above the title, e.g. a count. */
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** The one way section titles are rendered, everywhere. */
export function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  onAction,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          hitSlop={8}
        >
          <Text style={[styles.action, hovered && styles.actionHovered]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titles: { gap: 2, flexShrink: 1 },
  eyebrow: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
  },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 20,
    color: COLORS.lightGrey,
  },
  action: {
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.mediumGrey,
    paddingBottom: 3,
  },
  actionHovered: { color: COLORS.blue },
});
