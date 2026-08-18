import { StyleSheet, View } from 'react-native';

import { GameTile } from './GameTile';
import { Rail } from './Rail';
import { SectionHeader } from './SectionHeader';
import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';
import { LAYOUT, SPACING } from '@/styles/theme';

interface Props {
  section: Section;
  games: Game[];
  onViewAll: (section: Section) => void;
  /** Horizontal page padding the rail should bleed across. */
  inset?: number;
}

/** Horizontal storefront row: heading, tiles, "view all". */
export function Shelf({ section, games, onViewAll, inset = 0 }: Props) {
  if (games.length === 0) return null;

  return (
    <View style={styles.shelf}>
      <SectionHeader
        title={section.title}
        actionLabel="View all →"
        onAction={() => onViewAll(section)}
      />
      <Rail
        data={games}
        keyExtractor={(item) => String(item.id)}
        renderItem={(item) => (
          <GameTile game={item} width={LAYOUT.shelfTileWidth} />
        )}
        inset={inset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: SPACING.sm + 2, marginBottom: SPACING.xl },
});
