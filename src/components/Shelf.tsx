import { StyleSheet, View } from 'react-native';

import { GameTile } from './GameTile';
import { Rail } from './Rail';
import { RankedTile } from './RankedTile';
import { SectionHeader } from './SectionHeader';
import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';
import { LAYOUT, SPACING } from '@/styles/theme';

const shortDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        .toUpperCase()
    : undefined;

interface Props {
  section: Section;
  games: Game[];
  /** Omitted for rows derived on the client, which have no page to open. */
  onViewAll?: (section: Section) => void;
  /** Horizontal page padding the rail should bleed across. */
  inset?: number;
}

/**
 * Horizontal storefront row. Variants keep the page from becoming a wall
 * of identical rails: ranked (top-10 numerals), dated (release badges),
 * large (bigger frames for prestige), default.
 */
export function Shelf({ section, games, onViewAll, inset = 0 }: Props) {
  if (games.length === 0) return null;

  const variant = section.variant ?? 'default';
  const data = variant === 'ranked' ? games.slice(0, 10) : games;

  const renderItem = (item: Game) => {
    switch (variant) {
      case 'ranked':
        return (
          <RankedTile
            game={item}
            rank={data.indexOf(item) + 1}
            width={LAYOUT.shelfTileWidth}
          />
        );
      case 'dated':
        return (
          <GameTile
            game={item}
            width={LAYOUT.shelfTileWidth}
            badge={shortDate(item.released)}
          />
        );
      case 'large':
        return <GameTile game={item} width={LAYOUT.shelfTileLarge} />;
      default:
        return <GameTile game={item} width={LAYOUT.shelfTileWidth} />;
    }
  };

  return (
    <View style={styles.shelf}>
      <SectionHeader
        title={section.title}
        eyebrow={
          section.eyebrow ?? (variant === 'ranked' ? 'Top 10' : undefined)
        }
        actionLabel={onViewAll ? 'View all →' : undefined}
        onAction={onViewAll ? () => onViewAll(section) : undefined}
      />
      <Rail
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        inset={inset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: SPACING.sm + 2, marginBottom: SPACING.xl },
});
