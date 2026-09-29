import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Touchable } from './Touchable';
import { COLORS } from '@/styles/colors';
import { ICON, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Which part of the app a page belongs to, said in that part's colour.
 * The Plan is the evening, so violet. The Library is the shelf, which
 * owns no colour of its own — amber is hours and a heading is not a
 * number of them — so it takes the lighter grey, a step above the
 * secondary pages' quieter one.
 */
export type HeadingTone = 'plan' | 'library' | 'neutral';

const TONE: Record<HeadingTone, string> = {
  plan: COLORS.violetText,
  library: COLORS.lightGrey,
  neutral: COLORS.mediumGrey,
};

interface Props {
  /** Two words at most: where you are, not what it means. */
  eyebrow: string;
  title: string;
  tone?: HeadingTone;
  /** One quiet action on the title's line, e.g. Share. */
  actionLabel?: string;
  actionIcon?: IconName;
  /** A way somewhere rather than an act: a chevron after the label. */
  actionChevron?: boolean;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
}

/**
 * A page's name, at the size of a page's name.
 *
 * The tab roots were titled "My Library" and "The Plan" in the 19pt
 * light-grey section heading every shelf uses — quieter than the 22pt
 * wordmark above them, so the app's name outranked the place you were
 * standing in. The secondary pages each chose their own: 19 on Tidy
 * and the Memcard, 26 on Account, 32 on You. One treatment now: display
 * type in white, and a short eyebrow over it in the colour of the part
 * of the app it belongs to.
 */
export function PageHeading({
  eyebrow,
  title,
  tone = 'neutral',
  actionLabel,
  actionIcon,
  actionChevron = false,
  actionAccessibilityLabel,
  onAction,
}: Props) {
  return (
    <View style={styles.heading}>
      <Text
        style={[styles.eyebrow, { color: TONE[tone] }]}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {eyebrow}
      </Text>
      <View style={styles.row}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={FONT_SCALE.display}
        >
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Touchable
            onPress={onAction}
            hitSlop="text"
            style={styles.action}
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          >
            {actionIcon ? (
              <Ionicons
                name={actionIcon}
                size={ICON.sm}
                color={COLORS.mediumGrey}
              />
            ) : null}
            <Text
              style={styles.actionText}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              {actionLabel}
            </Text>
            {actionChevron ? (
              <Ionicons
                name="chevron-forward"
                size={ICON.sm}
                color={COLORS.mediumGrey}
              />
            ) : null}
          </Touchable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: SPACING.xxs },
  eyebrow: { ...TYPE.micro },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  title: { ...TYPE.display, color: COLORS.white, flexShrink: 1 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 20,
  },
  actionText: { ...TYPE.labelSmall, color: COLORS.mediumGrey },
});
