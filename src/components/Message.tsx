import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  /** Optional call to action, e.g. "Clear search". */
  actionLabel?: string;
  onAction?: () => void;
}

/** Centred empty / error state with an optional action. */
export function Message({ icon, title, detail, actionLabel, onAction }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.iconPlate}>
        <Ionicons name={icon} size={40} color={COLORS.mediumGrey} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          style={[styles.action, hovered && styles.actionHovered]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  iconPlate: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPE.label,
    color: COLORS.lightGrey,
    textAlign: 'center',
  },
  detail: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  actionHovered: { opacity: 0.85 },
  actionText: {
    ...TYPE.labelSmall,
    color: COLORS.white,
  },
});
