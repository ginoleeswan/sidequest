import { StyleSheet, Text, View } from 'react-native';

import { DynamicIcon } from './DynamicIcon';
import { Rail } from './Rail';
import { ScaleButton } from './ScaleButton';
import { Textured } from './Textured';
import { DISCOVER, type Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The discover sections as the feed's first row, not the chrome's last.
 *
 * They used to float over the masthead's artwork - eight outlined,
 * iconed pills across the most expensive pixels on the page. Down
 * here they are doors, built from the brand's own material the way the
 * mood shelf's are: a textured plate, a tint, the section's glyph and
 * its name. Same language at a smaller scale, so the two rows of doors
 * read as one system rather than as a toolbar and then some cards.
 * The six editorial sections only; genres are the mood shelf's job.
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
      <Text style={styles.eyebrow}>Browse</Text>
      <Rail
        data={DISCOVER}
        keyExtractor={(section) => section.key}
        inset={inset}
        gap={SPACING.sm + 2}
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
              size={18}
              color={COLORS.lightGrey}
            />
            <Text style={styles.name} numberOfLines={1}>
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
  row: { marginBottom: SPACING.xl, gap: SPACING.sm + 2 },
  eyebrow: { ...TYPE.micro, color: COLORS.mediumGrey },
  door: {
    width: 148,
    height: 84,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    padding: SPACING.md - 2,
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: 'Noah-Black',
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
    color: COLORS.white,
  },
});
