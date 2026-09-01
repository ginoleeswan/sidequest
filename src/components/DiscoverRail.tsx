import { StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';
import { Rail } from './Rail';
import { DISCOVER, type Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The discover sections as the feed's first row, not the chrome's last.
 *
 * They used to float over the masthead's artwork - eight outlined,
 * iconed pills across the most expensive pixels on the page, a third
 * stratum of UI before the picture got to speak. Down here they are
 * part of the browsing rhythm: text on a plate, the six editorial
 * sections only. Genres are better served by the mood shelf below,
 * where "Get lost somewhere" is a warmer door than a pill saying RPG.
 */
export function DiscoverRail({
  onOpen,
  inset = 0,
}: {
  onOpen: (section: Section) => void;
  inset?: number;
}) {
  return (
    <View style={styles.row}>
      {/* A row's own eyebrow, set like every other row's. Without it the
          chips sat sixty points under "Surprise me" on the same plate at
          the same radius, and read as a second line of the stage's
          buttons. The label makes them a row of doors with a name. */}
      <Text style={styles.eyebrow}>Browse</Text>
      <Rail
        data={DISCOVER}
        keyExtractor={(section) => section.key}
        inset={inset}
        gap={SPACING.sm}
        renderItem={(section) => (
          <Chip title={section.title} bare onPress={() => onOpen(section)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // A row's own air beneath it, the same as every shelf keeps.
  row: { marginBottom: SPACING.xl, gap: SPACING.sm + 2 },
  eyebrow: { ...TYPE.micro, color: COLORS.mediumGrey },
});
