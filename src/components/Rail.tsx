import { FlatList } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { LAYOUT, SHADOW_ROOM } from '@/styles/theme';

/**
 * A phone's rail: tiles and the gap between them.
 *
 * At 168 + 18 on a 393pt phone the third tile showed one point, so every
 * rail read as a fixed two-up grid and nothing said it scrolled. At 150
 * + 12 about 49 points of the third tile show — the cheapest "there is
 * more this way" there is. The desk keeps its wider tiles and gap; it
 * pages by chevron.
 */
export const COMPACT_RAIL = {
  tileWidth: LAYOUT.shelfTileCompact,
  gap: LAYOUT.railGapCompact,
} as const;

interface Props<T> {
  data: T[];
  /**
   * The index comes through because callers legitimately need to know
   * which one is first — a gallery that opens on a running trailer has
   * to be able to ask.
   */
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T) => string;
  /**
   * A handle for paging. Desktop shelves page by chevron rather than
   * mystery-scroll, and the buttons live with the caller's header —
   * so the caller owns the ref and this list obeys it.
   */
  listRef?: React.RefObject<FlatList<T> | null>;
  /**
   * The parent's horizontal padding. The rail bleeds across it with negative
   * margins so content scrolls to the true edge, while the first and last
   * items stay aligned with the page via matching content insets.
   */
  inset?: number;
  gap?: number;
  /** Snap to fixed-width items (e.g. the compact hero carousel). */
  snapInterval?: number;
  /**
   * Vertical room for item shadows. A horizontal scroller clips anything
   * outside its content box, so a shadowed card needs padding at least as
   * deep as its shadow reaches or the bottom edge is sliced off.
   */
  shadowRoom?: number;
}

/** Edge-to-edge horizontal scroller. All horizontal rails go through this. */
export function Rail<T>({
  listRef,
  data,
  renderItem,
  keyExtractor,
  inset = 0,
  gap: gapProp,
  snapInterval,
  shadowRoom = SHADOW_ROOM.card,
}: Props<T>) {
  const { isCompact } = useBreakpoint();
  const gap = gapProp ?? (isCompact ? COMPACT_RAIL.gap : LAYOUT.gridGap);
  const topRoom = Math.round(shadowRoom / 3);

  return (
    <FlatList
      ref={listRef}
      horizontal
      data={data}
      showsHorizontalScrollIndicator={false}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => renderItem(item, index)}
      style={[
        inset > 0 && { marginHorizontal: -inset },
        // Pull the surrounding layout back over the shadow room so it
        // doesn't read as unintended extra spacing.
        { marginTop: -topRoom, marginBottom: -shadowRoom * 0.6 },
      ]}
      contentContainerStyle={{
        paddingHorizontal: inset,
        gap,
        paddingTop: topRoom,
        paddingBottom: shadowRoom,
      }}
      snapToInterval={snapInterval}
      decelerationRate={snapInterval ? 'fast' : undefined}
    />
  );
}
