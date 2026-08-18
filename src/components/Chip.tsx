import { Pressable, StyleSheet, Text } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { COLORS } from '@/styles/colors';

interface Props {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  iconName?: string;
  iconType?: IconType;
}

export function Chip({
  title,
  selected = false,
  onPress,
  iconName,
  iconType,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.solid : styles.outline]}
    >
      {iconName && iconType ? (
        <DynamicIcon
          type={iconType}
          name={iconName}
          size={18}
          color={COLORS.lightGrey}
        />
      ) : null}
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 5,
  },
  solid: { backgroundColor: COLORS.blue },
  outline: { backgroundColor: 'transparent' },
  title: {
    fontFamily: 'Noah-Bold',
    color: COLORS.lightGrey,
    fontSize: 13,
  },
});
