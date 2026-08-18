import { useEffect } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';

/** Pulsing placeholder block — the atom every skeleton is built from. */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useAnimatedValue(0.45);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

/** Cover tile silhouette: art block plus two text lines. */
export function SkeletonTile({ width }: { width?: number }) {
  return (
    <View style={[styles.tile, width != null ? { width } : styles.flexCell]}>
      <Skeleton style={styles.tileArt} />
      <Skeleton style={styles.lineWide} />
      <Skeleton style={styles.lineNarrow} />
    </View>
  );
}

/** Storefront shelf silhouette: heading plus a row of tiles. */
export function SkeletonShelf({ tiles = 6 }: { tiles?: number }) {
  return (
    <View style={styles.shelf}>
      <Skeleton style={styles.heading} />
      <View style={styles.row}>
        {Array.from({ length: tiles }, (_, i) => (
          <SkeletonTile key={i} width={LAYOUT.shelfTileWidth} />
        ))}
      </View>
    </View>
  );
}

/** Desktop hero silhouette: lead block plus a rail of three. */
export function SkeletonHero() {
  return (
    <View style={styles.hero}>
      <Skeleton style={styles.heroLead} />
      <View style={styles.heroRail}>
        <Skeleton style={styles.heroRailItem} />
        <Skeleton style={styles.heroRailItem} />
        <Skeleton style={styles.heroRailItem} />
      </View>
    </View>
  );
}

/** Grid silhouette for category / search views. */
export function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: columns * 3 }, (_, i) => (
        <View key={i} style={{ width: `${100 / columns}%`, padding: 9 }}>
          <SkeletonTile />
        </View>
      ))}
    </View>
  );
}

/** Compact row-card silhouette. */
export function SkeletonRow() {
  return (
    <View style={styles.rowCard}>
      <Skeleton style={styles.rowThumb} />
      <View style={styles.rowLines}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
      </View>
    </View>
  );
}

/** Compact home silhouette: wide carousel plus row cards. */
export function SkeletonCompactHome() {
  return (
    <View style={styles.compact}>
      <View style={styles.row}>
        <Skeleton style={styles.wideCard} />
        <Skeleton style={styles.wideCard} />
      </View>
      <View style={styles.compactList}>
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.sm,
  },
  flexCell: { flex: 1 },
  tile: { gap: SPACING.xs + 2 },
  tileArt: { width: '100%', aspectRatio: LAYOUT.tileAspect },
  lineWide: { height: 12, width: '80%' },
  lineNarrow: { height: 10, width: '45%' },
  heading: { height: 16, width: 140, marginBottom: SPACING.sm },
  shelf: { marginBottom: SPACING.xl, gap: SPACING.sm },
  row: { flexDirection: 'row', gap: LAYOUT.gridGap, overflow: 'hidden' },
  hero: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  heroLead: { flex: 2, height: 320, borderRadius: RADIUS.lg },
  heroRail: { flex: 1, gap: SPACING.md },
  heroRailItem: { flex: 1, borderRadius: RADIUS.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -9 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  rowThumb: { width: 80, height: 80, borderRadius: RADIUS.md },
  rowLines: { flex: 1, gap: SPACING.sm },
  wideCard: {
    width: LAYOUT.cardWideWidth,
    height: LAYOUT.cardHeight,
    borderRadius: RADIUS.xl,
  },
  compact: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
  compactList: { marginTop: SPACING.sm },
});
