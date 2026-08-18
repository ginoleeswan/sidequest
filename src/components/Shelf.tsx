import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DynamicIcon } from './DynamicIcon';
import { GameTile } from './GameTile';
import { Rail } from './Rail';
import type { Category } from '@/constants/categories';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';

interface Props {
  category: Category;
  games: Game[];
  onViewAll: (category: Category) => void;
  /** Horizontal page padding the rail should bleed across. */
  inset?: number;
}

/** Horizontal storefront row: heading, tiles, "view all". */
export function Shelf({ category, games, onViewAll, inset = 0 }: Props) {
  const [linkHovered, setLinkHovered] = useState(false);
  if (games.length === 0) return null;

  return (
    <View style={styles.shelf}>
      <View style={styles.headingRow}>
        <View style={styles.headingLeft}>
          <DynamicIcon
            type={category.iconType}
            name={category.iconName}
            size={16}
            color={COLORS.mediumGrey}
          />
          <Text style={styles.heading}>{category.title}</Text>
        </View>
        <Pressable
          onPress={() => onViewAll(category)}
          onHoverIn={() => setLinkHovered(true)}
          onHoverOut={() => setLinkHovered(false)}
          hitSlop={8}
        >
          <Text style={[styles.viewAll, linkHovered && styles.viewAllHovered]}>
            View all →
          </Text>
        </Pressable>
      </View>
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heading: {
    fontFamily: 'Noah-Black',
    fontSize: 17,
    color: COLORS.lightGrey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAll: {
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  viewAllHovered: { color: COLORS.blue },
  row: { gap: LAYOUT.gridGap },
});
