import { StyleSheet, Text, View } from 'react-native';

import { DynamicIcon } from './DynamicIcon';
import { Rail } from './Rail';
import { ScaleButton } from './ScaleButton';
import { SectionHeader } from './SectionHeader';
import { Textured } from './Textured';
import { DISCOVER, type Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/**
 * The discover sections as doors into the shop.
 *
 * They used to float over the masthead's artwork - eight outlined,
 * iconed pills across the most expensive pixels on the page - and then
 * stood as the feed's first row, where they spent the space under the
 * stage that "Finish it this weekend" needed. They sit under Trending
 * now: the row that says "there is more of this" is followed by the
 * doors to the rest of it. Built from the brand's own material, as the
 * mood shelf's are, but smaller and in the furniture face, so the two
 * rows of doors read as related rather than as one row twice. The six
 * editorial sections only; genres are the mood shelf's job.
 */
const TINTS: Record<string, string> = {
  trending: 'rgba(122,138,196,0.20)',
  'out-this-week': 'rgba(126,166,140,0.18)',
  'new-releases': 'rgba(110,170,196,0.18)',
  'coming-soon': 'rgba(158,122,180,0.18)',
  'top-rated': 'rgba(196,140,120,0.18)',
  'must-play': 'rgba(214,105,86,0.16)',
};

export function DiscoverRail({
  onOpen,
  inset = 0,
}: {
  onOpen: (section: Section) => void;
  inset?: number;
}) {
  return (
    <View style={styles.row}>
      <SectionHeader title="Browse the shop" />
      <Rail
        data={DISCOVER}
        keyExtractor={(section) => section.key}
        inset={inset}
        gap={SPACING.sm2}
        renderItem={(section) => (
          <ScaleButton
            onPress={() => onOpen(section)}
            style={styles.door}
            activeScale={0.97}
            hoverScale={1.03}
            accessibilityLabel={`Browse ${section.title}`}
          >
            <Textured fill />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: TINTS[section.key] ?? 'transparent' },
              ]}
            />
            <DynamicIcon
              type={section.iconType}
              name={section.iconName}
              size={ICON.md}
              color={COLORS.lightGrey}
            />
            <Text
              style={styles.name}
              numberOfLines={1}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              {section.title}
            </Text>
          </ScaleButton>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // A row's own air beneath it, the same as every shelf keeps.
  row: { marginBottom: SPACING.xl, gap: SPACING.sm2 },
  // A minimum, not a height: at a larger text size the name needs room
  // to grow into rather than a box that clips it.
  door: {
    width: 148,
    minHeight: 84,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    padding: SPACING.sm + SPACING.xs,
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  name: {
    ...TYPE.h3,
    color: COLORS.white,
  },
});
