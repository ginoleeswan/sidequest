import { StyleSheet, Text, View } from 'react-native';

import { Touchable } from './Touchable';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING, TOUCH, innerRadius } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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
 *
 * Each option is a full 44pt target and clicks under the thumb when the
 * choice changes — a dial that moves silently reads as a dial that did
 * not move.
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
  showLabel = true,
}: {
  /** Spoken before the option — "Hours a week: 8h" — and drawn above it. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  onImage?: boolean;
  /**
   * Draw the label above the group. Off where the page already says
   * what the choice is — a status switch under the Library's own title
   * does not need "STATUS" printed over it — but it is still spoken.
   */
  showLabel?: boolean;
}) {
  return (
    <View style={styles.block}>
      {showLabel ? (
        <Text
          style={[styles.label, onImage && styles.labelOnImage]}
          maxFontSizeMultiplier={FONT_SCALE.label}
        >
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View style={[styles.group, onImage && styles.groupOnImage]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Touchable
              key={String(option.value)}
              onPress={() => {
                if (!selected) onChange(option.value);
              }}
              feedback="none"
              haptic={selected ? undefined : 'tap'}
              hitSlop={{ top: INSET + 1, bottom: INSET + 1 }}
              style={[styles.option, selected && styles.optionOn]}
              pressedStyle={!selected && styles.optionPressed}
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
                maxFontSizeMultiplier={FONT_SCALE.label}
              >
                {option.label}
              </Text>
            </Touchable>
          );
        })}
      </View>
    </View>
  );
}

/** The group's own padding, which the options sit concentric inside. */
const INSET = 3;

const styles = StyleSheet.create({
  block: { gap: SPACING.sm },
  label: { ...TYPE.micro, color: COLORS.mediumGrey },
  labelOnImage: { color: COLORS.lightGrey },
  group: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    padding: INSET,
    gap: INSET,
  },
  groupOnImage: {
    backgroundColor: COLORS.plate,
    borderColor: COLORS.strokeOnImage,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // The group's padding and hairline make up the rest of the 44.
    minHeight: TOUCH.min - INSET * 2 - 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: innerRadius(RADIUS.sm, INSET),
  },
  optionOn: { backgroundColor: COLORS.accent },
  optionPressed: { backgroundColor: COLORS.raised },
  optionText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
  optionTextOnImage: { color: COLORS.lightGrey },
  optionTextOn: { color: COLORS.navy },
});
