import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * A choice, with all of its options visible.
 *
 * The Plan used to hide its settings inside the sentence that described
 * them — "I play about [8h] a week" — where each tap advanced to the
 * next value. It reads beautifully and it is the worst affordance in
 * the app: six options behind one control, no way to see them, no way
 * to go back, and the whole page recomputing between every blind tap.
 * Going from 8h to 4h was five presses.
 *
 * Everything here is on screen, one tap away, and the current value is
 * visible without touching anything.
 *
 * @param onImage Sitting over artwork, where a hairline group vanishes
 * and the unselected labels have to survive whatever the publisher shot.
 */
export interface SegmentedOption<T> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  onImage = false,
}: {
  /** Spoken before the option — "Hours a week: 8h" — and drawn above it. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  onImage?: boolean;
}) {
  return (
    <View style={styles.block}>
      <Text style={[styles.label, onImage && styles.labelOnImage]}>
        {label.toUpperCase()}
      </Text>
      <View style={[styles.group, onImage && styles.groupOnImage]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionOn,
                pressed && !selected && styles.optionPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${option.label}`}
            >
              <Text
                style={[
                  styles.optionText,
                  onImage && styles.optionTextOnImage,
                  selected && styles.optionTextOn,
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACING.sm },
  label: { ...TYPE.micro, color: COLORS.mediumGrey },
  labelOnImage: { color: COLORS.lightGrey },
  group: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    padding: 3,
    gap: 3,
  },
  groupOnImage: {
    backgroundColor: COLORS.plate,
    borderColor: COLORS.strokeOnImage,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm - 4,
  },
  optionOn: { backgroundColor: COLORS.accent },
  optionPressed: { backgroundColor: COLORS.raised },
  optionText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
  optionTextOnImage: { color: COLORS.lightGrey },
  optionTextOn: { color: COLORS.navy },
});
