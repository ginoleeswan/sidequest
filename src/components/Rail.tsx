import { FlatList } from 'react-native';

import { LAYOUT, SHADOW_ROOM } from '@/styles/theme';

interface Props<T> {
  data: T[];
  renderItem: (item: T) => React.ReactElement;
  keyExtractor: (item: T) => string;
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
  data,
  renderItem,
  keyExtractor,
  inset = 0,
  gap = LAYOUT.gridGap,
  snapInterval,
  shadowRoom = SHADOW_ROOM.card,
}: Props<T>) {
  const topRoom = Math.round(shadowRoom / 3);

  return (
    <FlatList
      horizontal
      data={data}
      showsHorizontalScrollIndicator={false}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
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
