import { Pressable, StyleSheet, Text } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';

interface Props {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  iconName?: string;
  iconType?: IconType;
  /** Muted, non-interactive styling — used for tag lists. */
  quiet?: boolean;
}

export function Chip({
  title,
  selected = false,
  onPress,
  iconName,
  iconType,
  quiet = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        quiet ? styles.quiet : selected ? styles.solid : styles.outline,
      ]}
    >
      {iconName && iconType ? (
        <DynamicIcon
          type={iconType}
          name={iconName}
          size={16}
          color={selected ? COLORS.darkGrey : COLORS.lightGrey}
        />
      ) : null}
      <Text
        style={[
          styles.title,
          quiet && styles.quietTitle,
          selected && styles.selectedTitle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
    overflow: 'hidden',
  },
  solid: { backgroundColor: COLORS.white },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
  },
  quiet: {
    backgroundColor: 'transparent',
    borderColor: COLORS.stroke,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    fontFamily: 'Noah-Bold',
    color: COLORS.lightGrey,
    fontSize: 13,
  },
  selectedTitle: { color: COLORS.darkGrey },
  quietTitle: { fontSize: 11, color: COLORS.mediumGrey },
});
