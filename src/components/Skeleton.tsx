import { useEffect } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { HOME_SHELVES } from '@/constants/categories';
import { DURATION, EASING } from '@/styles/motion';
import { LAYOUT, RADIUS, SHADOW_ROOM, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/*
 * Line boxes of the real components, so the bones occupy exactly the
 * space the content will.
 *
 * Read from the type scale rather than measured by hand: these were
 * transcribed numbers once, and they silently went stale the moment the
 * scale changed. Taken from the same token the component uses, a bone
 * cannot drift from the text it stands in for.
 */
/** GameTile title. */
const TILE_TITLE_H = TYPE.h4.lineHeight;
/** GameTile meta. */
const TILE_META_H = TYPE.fine.lineHeight;
/** SectionHeader title. */
const HEADING_H = TYPE.h2.lineHeight;
/** SectionHeader eyebrow. */
const EYEBROW_H = TYPE.micro.lineHeight;
/**
 * A Rail reserves shadow room below its items and pulls most of it back
 * with a negative margin; what's left is real space the bones must leave
 * too, or every shelf below lands high.
 */
const RAIL_NET = Math.round(SHADOW_ROOM.card * 0.4);

/** Pulsing placeholder block — the atom every skeleton is built from. */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useAnimatedValue(0.45);
  const reduced = useReducedMotion();

  useEffect(() => {
    // A pulse is decorative: without it the bones still say "loading".
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: DURATION.pulse,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: DURATION.pulse,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

/** Cover tile silhouette: art block plus two text lines. */
export function SkeletonTile({ width }: { width?: number }) {
  return (
    <View style={[styles.tile, width != null ? { width } : styles.flexCell]}>
      <Skeleton style={styles.tileArt} />
      <Skeleton style={styles.tileTitle} />
      <Skeleton style={styles.tileMeta} />
    </View>
  );
}

/** Storefront shelf silhouette: heading plus a row of tiles. */
export function SkeletonShelf({
  tiles = 6,
  inset = 0,
  eyebrow = false,
  tileWidth = LAYOUT.shelfTileWidth,
}: {
  tiles?: number;
  /**
   * The parent's horizontal padding. The tile row bleeds across it the
   * same way Rail does, so the bones sit exactly where the real
   * edge-to-edge scroller will land.
   */
  inset?: number;
  /** Ranked shelves carry a "Top 10" line above the title. */
  eyebrow?: boolean;
  /** Wider frames for the prestige rows. */
  tileWidth?: number;
}) {
  return (
    <View style={styles.shelf}>
      <View style={styles.headingGroup}>
        {eyebrow && <Skeleton style={styles.eyebrow} />}
        <Skeleton style={styles.heading} />
      </View>
      <View
        style={[
          styles.row,
          styles.railRoom,
          inset > 0 && {
            marginHorizontal: -inset,
            paddingHorizontal: inset,
          },
        ]}
      >
        {Array.from({ length: tiles }, (_, i) => (
          <SkeletonTile key={i} width={tileWidth} />
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

/**
 * Category / discover page bones: the editorial masthead, the refinement
 * chip row, then the grid — the same three beats the loaded page opens
 * with, so nothing jumps when the data lands.
 */
export function SkeletonCategory({ columns }: { columns: number }) {
  return (
    <View style={styles.category}>
      <Skeleton style={styles.masthead} />
      <View style={styles.chipRow}>
        {[74, 66, 82, 52, 96].map((width) => (
          <Skeleton key={width} style={[styles.chip, { width }]} />
        ))}
      </View>
      <SkeletonGrid columns={columns} />
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
      {/* One full-bleed block: the stage is a single picture, so a pair of
          card-shaped bones here would be a silhouette of a layout the page
          no longer has. */}
      <Skeleton style={styles.stage} />
      <View style={styles.compactShelves}>
        {/* One row per shelf the home page actually renders: the ranked
            trending row, then HOME_SHELVES. Two stand-ins for six left the
            loading document barely taller than the viewport, which on iOS
            means Safari's translucent toolbar blurs over bare canvas
            instead of over content. */}
        <SkeletonShelf tiles={3} inset={SPACING.md} eyebrow />
        {HOME_SHELVES.map((shelf) => (
          <SkeletonShelf key={shelf.key} tiles={3} inset={SPACING.md} />
        ))}
      </View>
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
  tile: { gap: SPACING.xs + 1 },
  tileArt: { width: '100%', aspectRatio: LAYOUT.tileAspect },
  lineWide: { height: 12, width: '80%' },
  lineNarrow: { height: 10, width: '45%' },
  tileTitle: { height: TILE_TITLE_H, width: '82%', marginTop: 2 },
  tileMeta: { height: TILE_META_H, width: '52%' },
  headingGroup: { gap: 2 },
  heading: { height: HEADING_H, width: 118 },
  eyebrow: { height: EYEBROW_H, width: 52 },
  railRoom: { marginBottom: RAIL_NET },
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
  category: { gap: SPACING.md },
  masthead: { minHeight: 168, borderRadius: RADIUS.lg },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, overflow: 'hidden' },
  chip: { height: 36, borderRadius: 18 },
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
  compact: { gap: 0 },
  compactShelves: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  /** Matches the stage's floor: see stageHeight on the home screen. */
  stage: { height: 440, borderRadius: 0 },
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
