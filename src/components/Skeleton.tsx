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
export function SkeletonShelf({
  tiles = 6,
  inset = 0,
}: {
  tiles?: number;
  /**
   * The parent's horizontal padding. The tile row bleeds across it the
   * same way Rail does, so the bones sit exactly where the real
   * edge-to-edge scroller will land.
   */
  inset?: number;
}) {
  return (
    <View style={styles.shelf}>
      <Skeleton style={styles.heading} />
      <View
        style={[
          styles.row,
          inset > 0 && {
            marginHorizontal: -inset,
            paddingHorizontal: inset,
          },
        ]}
      >
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

/** Compact home silhouette: the hero carousel peeking, then tile shelves. */
export function SkeletonCompactHome() {
  return (
    <View style={styles.compact}>
      <View style={[styles.row, styles.bleed]}>
        <Skeleton style={styles.wideCard} />
        <Skeleton style={styles.wideCard} />
      </View>
      <SkeletonShelf tiles={3} inset={SPACING.md} />
      <SkeletonShelf tiles={3} inset={SPACING.md} />
    </View>
  );
}

/**
 * Desktop detail silhouette: mirrors the expanded hero (title block beside
 * a framed 16:9 art card) and the two-column body, so the loaded page
 * lands exactly where the bones were.
 */
export function SkeletonDetailExpanded() {
  return (
    <View>
      <View style={styles.deskHero}>
        <View style={styles.deskHeroCopy}>
          <Skeleton style={styles.lineNarrow} />
          <Skeleton style={styles.deskTitle} />
          <View style={styles.row}>
            <Skeleton style={styles.detailStat} />
            <Skeleton style={styles.detailStat} />
            <Skeleton style={styles.detailStat} />
            <Skeleton style={styles.detailStat} />
          </View>
          <View style={styles.row}>
            <Skeleton style={styles.detailChip} />
            <Skeleton style={styles.detailChip} />
            <Skeleton style={styles.detailChip} />
          </View>
        </View>
        <Skeleton style={styles.deskArt} />
      </View>
      <View style={styles.deskColumns}>
        <View style={styles.deskMain}>
          <Skeleton style={styles.lineFull} />
          <Skeleton style={styles.lineFull} />
          <Skeleton style={styles.lineWide} />
          <SkeletonShelf tiles={3} />
        </View>
        <View style={styles.deskRail}>
          <Skeleton style={styles.deskRailCard} />
          <Skeleton style={styles.deskRailCard} />
        </View>
      </View>
    </View>
  );
}

/** Detail-page silhouette: full-bleed hero, title stack, stats, prose. */
export function SkeletonDetail() {
  return (
    <View>
      <Skeleton style={styles.detailHero} />
      <View style={styles.detailBody}>
        <Skeleton style={styles.detailTitle} />
        <View style={styles.row}>
          <Skeleton style={styles.detailStat} />
          <Skeleton style={styles.detailStat} />
          <Skeleton style={styles.detailStat} />
        </View>
        <View style={styles.row}>
          <Skeleton style={styles.detailChip} />
          <Skeleton style={styles.detailChip} />
        </View>
        <Skeleton style={styles.lineFull} />
        <Skeleton style={styles.lineFull} />
        <Skeleton style={styles.lineWide} />
        <SkeletonShelf tiles={3} />
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
  heading: { height: 18, width: 140 },
  shelf: { marginBottom: SPACING.xl, gap: SPACING.sm + 2 },
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
  bleed: {
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  detailHero: { height: 420, borderRadius: 0 },
  detailBody: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  detailTitle: { height: 26, width: '62%' },
  detailStat: { height: 34, width: 64 },
  detailChip: { height: 26, width: 84, borderRadius: 14 },
  lineFull: { height: 12, width: '100%' },
  deskHero: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl * 1.5,
    paddingHorizontal: SPACING.xl * 2,
    paddingVertical: SPACING.xl * 1.6,
  },
  deskHeroCopy: { flex: 1, gap: SPACING.sm },
  deskTitle: { height: 44, width: '70%' },
  deskArt: {
    width: '42%',
    maxWidth: 520,
    aspectRatio: 16 / 9,
    borderRadius: RADIUS.lg,
  },
  deskColumns: {
    flexDirection: 'row',
    gap: SPACING.xl,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl * 2,
    paddingTop: SPACING.lg,
  },
  deskMain: { flex: 2, gap: SPACING.md },
  deskRail: { flex: 1, maxWidth: 360, gap: SPACING.md },
  deskRailCard: { height: 180, borderRadius: RADIUS.md },
});
