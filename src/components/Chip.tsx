import { Pressable, StyleSheet, Text } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  title: string;
  selected?: boolean;
  onPress?: () => void;
  iconName?: string;
  iconType?: IconType;
  /** Muted, non-interactive styling — used for tag lists. */
  quiet?: boolean;
  /**
   * Sitting over artwork rather than over the page.
   *
   * The outline chip is a hairline ring with no fill, which is right on
   * a flat surface and illegible over a photograph — a ring and some
   * light grey text on whatever the picture happened to be. This gives
   * it a plate of its own.
   */
  onImage?: boolean;
  /**
   * A word on a plate and nothing else - no ring, no glyph. For a row
   * that lives in the feed rather than in the chrome: the outline chip
   * is a control's costume, and eight of them in a row over artwork
   * read as a toolbar. Bare, four fit a phone's width where two and a
   * half did, and the row reads as a set of doors rather than buttons.
   */
  bare?: boolean;
}

export function Chip({
  title,
  selected = false,
  onPress,
  iconName,
  iconType,
  quiet = false,
  onImage = false,
  bare = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        quiet
          ? styles.quiet
          : selected
            ? styles.solid
            : bare
              ? styles.bare
              : onImage
                ? styles.onImage
                : styles.outline,
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
  onImage: {
    /**
     * Dark enough for the worst artwork, not the average.
     *
     * Nothing automated checks this: axe cannot see what is behind a
     * translucent plate, so the sum was done by hand against a blown-out
     * white frame — the scrims above it, then this — and lands near 5:1
     * where the header's gradient is weakest. Everything realistic is
     * far better than that.
     */
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
  },
  bare: { backgroundColor: COLORS.plate },
  quiet: {
    backgroundColor: 'transparent',
    borderColor: COLORS.stroke,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  selectedTitle: { color: COLORS.darkGrey },
  quietTitle: { fontSize: 11, color: COLORS.mediumGrey },
});
