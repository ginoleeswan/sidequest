import { StyleSheet, Text } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { Touchable } from './Touchable';
import { COLORS, alpha } from '@/styles/colors';
import { ICON, RADIUS, SPACING, TOUCH } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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

/** Drawn at 36 and made up to a thumb's 44 with slop. */
const DRAWN = 36;
const SLOP = (TOUCH.min - DRAWN) / 2;

/**
 * A choice you can stack.
 *
 * Selected used to be solid white with no border beside an outline chip
 * with a hairline, so a chip shrank by two points as you picked it, and
 * two white pills on the Library shouted over the page's one amber
 * number. Picked is now a lifted fill and white type inside the
 * same one-point ring: the state reads, the size holds, and nothing that
 * is merely a filter outranks the figures the page is about.
 */
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
  const tint = selected ? COLORS.white : COLORS.lightGrey;
  return (
    <Touchable
      onPress={onPress}
      disabled={!onPress}
      haptic="tap"
      hitSlop={
        quiet ? undefined : { top: SLOP, bottom: SLOP, left: 2, right: 2 }
      }
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      style={[
        styles.chip,
        quiet
          ? styles.quiet
          : [
              bare ? styles.bare : onImage ? styles.onImage : styles.outline,
              selected && (onImage || bare ? styles.onImageOn : styles.on),
            ],
      ]}
    >
      {iconName && iconType ? (
        <DynamicIcon
          type={iconType}
          name={iconName}
          size={ICON.md - 2}
          color={tint}
        />
      ) : null}
      <Text
        style={[
          styles.title,
          quiet && styles.quietTitle,
          selected && styles.selectedTitle,
        ]}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {title}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    minHeight: DRAWN,
    paddingHorizontal: 14,
    // Every state carries the same ring, coloured or clear, so choosing
    // a chip never changes its size.
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  outline: { borderColor: COLORS.strokeStrong },
  /** Picked, on the page: a lifted fill inside the same ring. */
  on: {
    backgroundColor: alpha(COLORS.white, 0.12),
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
    borderColor: COLORS.strokeOnImage,
  },
  /**
   * Picked, over artwork: the plate stays — a 12% lift is invisible
   * over a bright frame — and the ring goes white.
   */
  onImageOn: { borderColor: COLORS.white },
  bare: { backgroundColor: COLORS.plate },
  quiet: {
    borderColor: COLORS.stroke,
    minHeight: 0,
    paddingHorizontal: SPACING.sm2,
    paddingVertical: 5,
  },
  title: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  selectedTitle: { color: COLORS.white },
  quietTitle: { ...TYPE.labelTiny, color: COLORS.mediumGrey },
});
