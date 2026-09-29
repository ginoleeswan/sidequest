import { StyleSheet, Text, View } from 'react-native';

import { alpha, COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

interface Props {
  score: number;
  size?: 'sm' | 'md';
}

/**
 * Metacritic score, on a plate, in the neutral grey every rating wears.
 *
 * It was Metacritic's own green / amber / red — three colours from
 * nobody's palette, and a traffic light laid over the app's meanings:
 * amber here said "mixed reviews" beside an amber that everywhere else
 * says "how long". A score is a fact to read, not a verdict to colour;
 * the plate keeps it legible over any cover, and the figure does the
 * rest.
 */
export function ScorePill({ score, size = 'md' }: Props) {
  const small = size === 'sm';
  return (
    <View
      style={[styles.pill, small && styles.pillSm]}
      accessibilityLabel={`Metacritic ${score}`}
    >
      <Text
        style={[styles.score, small && styles.scoreSm]}
        maxFontSizeMultiplier={FONT_SCALE.label}
      >
        {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: alpha(COLORS.inkRaised, 0.72),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.strokeOnImage,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    alignSelf: 'flex-start',
  },
  pillSm: { paddingHorizontal: SPACING.xs, paddingVertical: 1 },
  score: { ...TYPE.label, color: COLORS.lightGrey },
  scoreSm: { ...TYPE.labelTiny, color: COLORS.lightGrey },
});
