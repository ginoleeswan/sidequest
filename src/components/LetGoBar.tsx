import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DROP_REASONS, type DropReason } from '@/lib/drops';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The question that opens the act of letting something go.
 *
 * Not a guilt trip and not a confirmation dialogue: the shelves cannot
 * learn anything from a silent delete, and "too long" and "bounced off
 * it" mean opposite things about what to offer next. Every answer
 * completes the drop, including "Rather not say" — nothing here can
 * trap somebody who has already decided.
 *
 * It lives on its own because it is asked in two places now. The
 * amnesty screen asks it of a shelf-full; a deadline alert asks it of
 * the one game that cannot be finished, which is the moment the
 * product exists for — PRODUCT.md §6.4 calls that one "the honest
 * one". Two copies of this bar would have been two copies of a
 * question about somebody's guilt, drifting apart.
 */
export function LetGoBar({
  /** How many are being let go, so the question can be plural or not. */
  count,
  onLetGo,
  floating = false,
}: {
  count: number;
  onLetGo: (reason?: DropReason) => void;
  /**
   * Pinned to the foot of the screen, over the scroller.
   *
   * On the web the bar is sticky and pins itself wherever it is in the
   * document. Native has no sticky: rendered inside the scroller it sat
   * in flow at the very end of the list, so the button that commits
   * the act was a full library's scroll away. A floating bar is
   * rendered by its screen as a sibling OUTSIDE the scroller, absolute
   * at the bottom, which is what sticky was standing in for.
   */
  floating?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        floating && styles.floating,
        { paddingBottom: insets.bottom + SPACING.md },
      ]}
    >
      <Text style={styles.barCount}>
        Why {count === 1 ? 'this one' : 'these'}? Optional.
      </Text>
      <View style={styles.barActions}>
        {DROP_REASONS.map((reason) => (
          <Pressable
            key={reason.key}
            onPress={() => onLetGo(reason.key)}
            style={styles.secondary}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>{reason.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => onLetGo()}
          style={styles.primary}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Rather not say</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    // Sticky is CSS. Yoga does not know the word and drops the whole
    // position, so it is only asked for where it exists.
    ...(Platform.OS === 'web'
      ? { position: 'sticky' as unknown as 'absolute', bottom: 0 }
      : null),
    left: 0,
    right: 0,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.darkGrey,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  floating: { position: 'absolute', bottom: 0 },
  barCount: {
    ...TYPE.tag,
    // Letting go has its own colour in this app; the question that
    // opens the act should be asked in it.
    color: COLORS.coral,
    textAlign: 'center',
  },
  barActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  primaryText: {
    ...TYPE.label,
    color: COLORS.darkGrey,
  },
  secondary: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  secondaryText: {
    ...TYPE.label,
    color: COLORS.lightGrey,
  },
});
