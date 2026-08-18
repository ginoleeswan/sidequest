import { FlatList, StyleSheet } from 'react-native';

import { LAYOUT } from '@/styles/theme';

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
}

/** Edge-to-edge horizontal scroller. All horizontal rails go through this. */
export function Rail<T>({
  data,
  renderItem,
  keyExtractor,
  inset = 0,
  gap = LAYOUT.gridGap,
  snapInterval,
}: Props<T>) {
  return (
    <FlatList
      horizontal
      data={data}
      showsHorizontalScrollIndicator={false}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      style={inset > 0 ? { marginHorizontal: -inset } : undefined}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: inset, gap },
      ]}
      snapToInterval={snapInterval}
      decelerationRate={snapInterval ? 'fast' : undefined}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 4 },
});
