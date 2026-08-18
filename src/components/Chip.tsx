import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { BRAND_GRADIENT, COLORS } from '@/styles/colors';
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
      {selected && !quiet ? (
        <LinearGradient
          colors={[...BRAND_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
          pointerEvents="none"
        />
      ) : null}
      {iconName && iconType ? (
        <DynamicIcon
          type={iconType}
          name={iconName}
          size={16}
          color={selected ? COLORS.white : COLORS.lightGrey}
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
  solid: { borderWidth: 0 },
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
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  title: {
    fontFamily: 'Noah-Bold',
    color: COLORS.lightGrey,
    fontSize: 13,
  },
  selectedTitle: { color: COLORS.white },
  quietTitle: { fontSize: 11, color: COLORS.mediumGrey },
});
