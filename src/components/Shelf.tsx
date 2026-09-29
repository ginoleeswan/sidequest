import { StyleSheet, View } from 'react-native';

import { GameTile } from './GameTile';
import type { Tone } from './Message';
import { COMPACT_RAIL, Rail } from './Rail';
import { SectionHeader } from './SectionHeader';
import type { Game } from '@/api/types';
import type { Section } from '@/constants/categories';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { calendarDate } from '@/lib/format';
import { LAYOUT, SPACING } from '@/styles/theme';

const shortDate = (iso: string | null | undefined) =>
  iso ? calendarDate(iso, 'short').toUpperCase() : undefined;

/** A phone's wide tile: 16:9 at a width that still lets the next one peek. */
const COMPACT_WIDE = LAYOUT.shelfTileWideCompact;

interface Props {
  section: Section;
  games: Game[];
  /** Omitted for rows derived on the client, which have no page to open. */
  onViewAll?: (section: Section) => void;
  /** Horizontal page padding the rail should bleed across. */
  inset?: number;
  /** What the eyebrow is about: time, finishing, the evening. */
  tone?: Tone;
  /**
   * Where a ranked row's count starts.
   *
   * Trending hands its first few games to the stage and ranks the rest,
   * so the tile marked "1" was the sixth-most-played game. The numerals
   * are only worth drawing if they are true.
   */
  rankOffset?: number;
}

/**
 * Horizontal storefront row. Variants keep the page from becoming a wall
 * of identical rails: ranked (top-10 numerals), dated (release badges),
 * large (bigger frames for prestige), wide (16:9 screenshots), default.
 */
export function Shelf({
  section,
  games,
  onViewAll,
  inset = 0,
  tone,
  rankOffset = 0,
}: Props) {
  const { isCompact } = useBreakpoint();
  if (games.length === 0) return null;

  const variant = section.variant ?? 'default';
  const tileWidth = isCompact ? COMPACT_RAIL.tileWidth : LAYOUT.shelfTileWidth;
  const data = variant === 'ranked' ? games.slice(0, 10) : games;

  /**
   * The prestige row, on a phone, is the wide frame with the hours set
   * large.
   *
   * At 220 a portrait tile on a 390pt phone is nearly 300pt tall and the
   * row shows one and a half of them, so the phone used to shrink this
   * row to the standard poster — and the one row the app is for looked
   * like every genre row under it. Landscape keeps it short enough to
   * sit above the fold, and the hours become the loudest thing in it.
   */
  const renderItem = (item: Game, index: number) => {
    switch (variant) {
      case 'ranked':
        return (
          <GameTile
            game={item}
            rank={index + 1 + rankOffset}
            width={tileWidth}
          />
        );
      case 'dated':
        return (
          <GameTile
            game={item}
            width={tileWidth}
            badge={shortDate(item.released)}
          />
        );
      case 'wide':
        return (
          <GameTile
            game={item}
            shape="wide"
            width={isCompact ? COMPACT_WIDE : LAYOUT.shelfTileWide}
          />
        );
      case 'large':
        return isCompact ? (
          <GameTile game={item} shape="wide" width={COMPACT_WIDE} bigHours />
        ) : (
          <GameTile game={item} width={LAYOUT.shelfTileLarge} bigHours />
        );
      default:
        return <GameTile game={item} width={tileWidth} />;
    }
  };

  const rankedEyebrow =
    rankOffset > 0
      ? `Nos. ${rankOffset + 1}–${rankOffset + data.length}`
      : 'Top 10';

  return (
    <View style={styles.shelf}>
      <SectionHeader
        title={section.title}
        eyebrow={
          section.eyebrow ?? (variant === 'ranked' ? rankedEyebrow : undefined)
        }
        tone={tone}
        actionLabel={onViewAll ? 'View all' : undefined}
        actionAccessibilityLabel={`View all ${section.title}`}
        actionChevron
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
  shelf: { gap: SPACING.sm2, marginBottom: SPACING.xl },
});
