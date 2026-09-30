import { useEffect } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  DESK_BAND,
  TITLE_SLOT,
  bannerHeight,
  deskBandCeiling,
} from '@/lib/detailHero';
import { STAGE_BOUNDS, stageHeight } from '@/lib/stage';
import { HOME_SHELVES } from '@/constants/categories';
import { EASING } from '@/styles/motion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { GUTTER, LAYOUT, RADIUS, SHADOW_ROOM, SPACING } from '@/styles/theme';
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
/** GameTile's lead line: the hours, in the tile's own step. */
const TILE_LEAD_H = TYPE.labelSmall.lineHeight;
/** The same line on the quick-wins row, where hours are a figure. */
const TILE_LEAD_BIG_H = TYPE.figureSmall.lineHeight;
/** GameTile title: two lines held open, as the tile holds them. */
const TILE_TITLE_H = TYPE.labelSmall.lineHeight * 2;
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
/** The desk game page's cap and rail ceiling, mirrored from the page. */
const DESK_PAGE_MAX = 1200;
const DESK_RAIL = 340;

/**
 * The breath of a bone.
 *
 * It swung from 45% to full and back every 700ms, which on a screen of
 * twenty bones is a flicker — the page looked like it was failing to
 * load rather than loading. Slower and shallower reads as patience.
 */
const PULSE_STEP = 1200;
const PULSE_LOW = 0.55;

/**
 * One breath for every bone on screen.
 *
 * Each bone used to run its own loop: a home page loading was sixty
 * animations started in the same frame the splash curtain was trying
 * to leave in, and sixty clocks that drifted out of phase within a few
 * seconds, so the page shimmered unevenly instead of breathing. One
 * value, one loop, read by all of them — started by the first bone to
 * mount and stopped when the last one goes.
 */
const pulse = new Animated.Value(PULSE_LOW);
let breathing: Animated.CompositeAnimation | null = null;
let bones = 0;

function holdBreath(): () => void {
  bones += 1;
  if (!breathing) {
    breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_STEP,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: PULSE_LOW,
          duration: PULSE_STEP,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();
  }
  return () => {
    bones -= 1;
    if (bones === 0 && breathing) {
      breathing.stop();
      breathing = null;
      pulse.setValue(PULSE_LOW);
    }
  };
}

/** Pulsing placeholder block — the atom every skeleton is built from. */
export function Skeleton({
  style,
}: {
  style?: ViewStyle | (ViewStyle | undefined)[];
}) {
  const reduced = useReducedMotion();

  // A pulse is decorative: without it the bones still say "loading".
  useEffect(() => (reduced ? undefined : holdBreath()), [reduced]);

  return (
    <Animated.View
      style={[styles.block, style, { opacity: reduced ? PULSE_LOW : pulse }]}
    />
  );
}

/**
 * Cover tile silhouette: the art, then the caption the tile sets under
 * it — hours first, a title held at two lines, one fact.
 */
export function SkeletonTile({
  width,
  wide = false,
  bigHours = false,
}: {
  width?: number;
  /** The 16:9 frame of the quick-wins row. */
  wide?: boolean;
  bigHours?: boolean;
}) {
  return (
    <View style={[styles.tile, width != null ? { width } : styles.flexCell]}>
      <Skeleton
        style={[styles.tileArt, wide ? styles.tileArtWide : undefined]}
      />
      <Skeleton
        style={[styles.tileLead, bigHours ? styles.tileLeadBig : undefined]}
      />
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
  tileWidth,
  wide = false,
  bigHours = false,
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
  /** Wider frames for the prestige rows. Defaults to the rail's own. */
  tileWidth?: number;
  wide?: boolean;
  bigHours?: boolean;
}) {
  const { isCompact } = useBreakpoint();
  // The rail's own measures, so the bones peek exactly as the tiles do.
  const width =
    tileWidth ?? (isCompact ? LAYOUT.shelfTileCompact : LAYOUT.shelfTileWidth);
  const gap = isCompact ? LAYOUT.railGapCompact : LAYOUT.gridGap;
  return (
    <View style={styles.shelf}>
      <View style={styles.headingGroup}>
        {eyebrow && <Skeleton style={styles.eyebrow} />}
        <Skeleton style={styles.heading} />
      </View>
      <View
        style={[
          styles.row,
          { gap },
          styles.railRoom,
          inset > 0 && {
            marginHorizontal: -inset,
            paddingHorizontal: inset,
          },
        ]}
      >
        {Array.from({ length: tiles }, (_, i) => (
          <SkeletonTile key={i} width={width} wide={wide} bigHours={bigHours} />
        ))}
      </View>
    </View>
  );
}

/** Desktop hero silhouette: lead block plus a rail of three. */
/**
 * The desk's home page, in the shape it actually opens with: the stage
 * running to the sheet's edges at the height it will be, the row of
 * doors under it, then shelves. It used to be `SkeletonHero` - a hero
 * split two-thirds/one-third with a rail of three cards beside it -
 * which the page has not looked like since the stage became one
 * picture, so the bones rearranged themselves the moment data landed.
 */
export function SkeletonDeskHome({
  windowHeight,
  inset,
}: {
  windowHeight: number;
  inset: number;
}) {
  return (
    <View>
      <Skeleton
        style={[
          styles.homeStage,
          {
            marginHorizontal: -inset,
            marginTop: -SPACING.lg,
            height: stageHeight(windowHeight, true),
          },
        ]}
      />
      <View style={[styles.row, styles.deskDoors]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={styles.deskDoor} />
        ))}
      </View>
      <SkeletonShelf tiles={5} inset={inset} eyebrow />
      <SkeletonShelf tiles={5} inset={inset} />
    </View>
  );
}

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
export function SkeletonCategory({
  columns,
  bleed = null,
}: {
  columns: number;
  /** The hero's own bleed, so the bones stand where the art will. */
  bleed?: { top: number; sides: number } | null;
}) {
  return (
    <View style={styles.category}>
      <Skeleton
        style={[
          styles.masthead,
          bleed
            ? {
                marginHorizontal: -bleed.sides,
                marginTop: -bleed.top,
                minHeight: 300 + bleed.top,
                borderRadius: 0,
              }
            : undefined,
        ]}
      />
      {/* Bled like the bar it stands for, so the bones do not stop at a
          gutter the loaded row runs past. */}
      <View
        style={[
          styles.chipRow,
          bleed ? { marginHorizontal: -bleed.sides } : undefined,
          bleed ? { paddingHorizontal: bleed.sides } : undefined,
        ]}
      >
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
/** A search result's bones: the poster, and the lines beside it. */
export function SkeletonRow() {
  return (
    <View style={styles.rowCard}>
      <Skeleton style={styles.rowThumb} />
      <View style={styles.rowLines}>
        <Skeleton style={styles.lineWide} />
        <Skeleton style={styles.lineNarrow} />
        <Skeleton style={styles.lineTiny} />
      </View>
    </View>
  );
}

/**
 * Compact home silhouette: the stage, then the rows in the order the
 * page actually renders them.
 *
 * Reveal's contract is that the bones occupy the pixels the content
 * will, so the swap is a dissolve rather than a jump. Measured against
 * the loaded page these had drifted badly: the stage bone was 117px
 * short of the real stage, the first row's art 50px short and 82px
 * narrow because that row now uses the large frames, the band below it
 * was missing entirely, and the document came out a thousand pixels —
 * nearly a third — under the real one.
 */
export function SkeletonCompactHome() {
  const { height } = useWindowDimensions();

  return (
    <View style={styles.compact}>
      {/* Full bleed and starting at the top of the document, because the
          stage runs up behind the floating header rather than below it. */}
      <Skeleton style={[styles.stage, stageBone(height)]} />
      <View style={styles.compactShelves}>
        {/* "Finish it this weekend" — the signature row, directly under
            the stage in wide frames with the hours set as a figure. */}
        <SkeletonShelf
          tiles={2}
          inset={GUTTER}
          eyebrow
          tileWidth={LAYOUT.shelfTileWideCompact}
          wide
          bigHours
        />
        {/* Trending: ranked, so it carries a "Nos." line. */}
        <SkeletonShelf tiles={3} inset={GUTTER} eyebrow />
        {/* The doors, which now follow Trending rather than the stage. */}
        <View style={styles.compactDoors}>
          <Skeleton style={styles.heading} />
          <View style={[styles.row, { gap: LAYOUT.railGapCompact }]}>
            <Skeleton style={styles.compactDoor} />
            <Skeleton style={styles.compactDoor} />
            <Skeleton style={styles.compactDoor} />
          </View>
        </View>
        <SkeletonBand inset={GUTTER} />
        {/* Only "out this week" carries an eyebrow; the rest of the pool
            is genres, whose rows are a title alone. */}
        {HOME_SHELVES.map((shelf, index) => (
          <SkeletonShelf
            key={shelf.key}
            tiles={3}
            inset={GUTTER}
            eyebrow={index === 0}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * The bone's height, in the same terms the stage's own height is in.
 *
 * On web this has to be a CSS length rather than a number. The bones are
 * pre-rendered without a viewport, so any height computed in JavaScript
 * is wrong on the server and gets adopted at hydration — a 117px jump
 * under the reader's eyes, which the perf budget caught as CLS 0.066
 * against a 0.05 ceiling. Expressed in viewport units the server and the
 * client agree on it without either having to measure, so there is
 * nothing to adopt and nothing to shift.
 *
 * `dvh` rather than `vh` deliberately: on iOS `vh` is the viewport with
 * the toolbar collapsed, which is not what `useWindowDimensions` reports
 * to the stage, and the two would land on different numbers.
 */
function stageBone(windowHeight: number): ViewStyle {
  if (Platform.OS !== 'web')
    return { height: stageHeight(windowHeight, false) };
  const { min, max, ratio } = STAGE_BOUNDS;
  return {
    height: `clamp(${min}px, ${Math.round(ratio * 100)}dvh, ${max}px)`,
  } as unknown as ViewStyle;
}

/** The colour field halfway down, where the page speaks for itself. */
function SkeletonBand({ inset }: { inset: number }) {
  return (
    <View
      style={[
        styles.band,
        { marginHorizontal: -inset, paddingHorizontal: inset },
      ]}
    >
      <Skeleton style={styles.eyebrow} />
      <Skeleton style={styles.bandHeadline} />
      <Skeleton style={styles.bandLine} />
      <Skeleton style={styles.bandAction} />
    </View>
  );
}

/**
 * The desk game page's bones: the band across the sheet with the mark's
 * slot low on its left, then the two tracks - the figure and the
 * gallery's frames in the main column, the label and the two controls
 * in the rail - at the same split and the same gutter as the page that
 * replaces them, so the swap is a dissolve rather than a jump.
 */
export function SkeletonDetailExpanded() {
  const { height } = useWindowDimensions();
  return (
    <View>
      <View style={[styles.deskBand, { maxHeight: deskBandCeiling(height) }]}>
        <Skeleton style={styles.detailHeroFill} />
        <View style={styles.deskLockup}>
          <Skeleton style={styles.deskMark} />
          <Skeleton style={styles.deskIdentity} />
        </View>
      </View>
      <View style={styles.deskColumns}>
        <View style={styles.deskMain}>
          <View style={styles.deskFigures}>
            <Skeleton style={styles.deskFigure} />
            <Skeleton style={styles.deskPace} />
          </View>
          <Skeleton style={styles.deskShelfTitle} />
          <View style={styles.row}>
            <Skeleton style={styles.deskFrame} />
            <Skeleton style={styles.deskFrame} />
          </View>
        </View>
        <View style={styles.deskRail}>
          <Skeleton style={styles.deskRailLabel} />
          <Skeleton style={styles.deskRailControl} />
          <Skeleton style={styles.deskRailControl} />
        </View>
      </View>
    </View>
  );
}

/**
 * Detail-page silhouette, in the order the phone page now reads.
 *
 * It had drifted into describing a page that no longer exists: an
 * identity line below the band when it lives inside it, an "About"
 * heading the page dropped, no gallery, and a verdict card where the
 * verdict is flush. These bones follow the page as it is laid out now —
 * the band with the mark and the identity row in it, the answer (the
 * verdict sentence over the strip of figures), the decision, the
 * evenings, the gallery — so the swap is a dissolve, not a rearrangement.
 */
export function SkeletonDetail() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <View>
      {/* The band the art will fill, with the mark's slot and the
          identity row at its foot — the same constants the loaded
          masthead is built from. */}
      <View
        style={[
          styles.detailHero,
          { height: bannerHeight(width, insets.top, height) },
        ]}
      >
        <Skeleton style={styles.detailHeroFill} />
        <Skeleton style={styles.detailTitle} />
        <Skeleton style={styles.detailIdentity} />
      </View>
      <View style={styles.detailBody}>
        {/* The answer: the verdict sentence, then the strip of figures,
            hours and finish rate wider than the two beside them. */}
        <View style={styles.detailAnswer}>
          <Skeleton style={styles.detailSaid} />
          <View style={styles.detailStrip}>
            <Skeleton style={[styles.detailStripCell, styles.detailLead]} />
            <Skeleton style={[styles.detailStripCell, styles.detailLead]} />
            <Skeleton style={styles.detailStripCell} />
            <Skeleton style={styles.detailStripCell} />
          </View>
        </View>
        {/* The decision: one full-width button and the quiet row. */}
        <View style={styles.detailDecision}>
          <Skeleton style={styles.detailControl} />
          <Skeleton style={styles.detailQuiet} />
        </View>
        {/* The evenings. */}
        <View style={styles.detailFit}>
          <Skeleton style={styles.detailHeading} />
          <Skeleton style={styles.detailFitStrip} />
        </View>
        {/* The gallery, a frame and the edge of the next. */}
        <View style={[styles.row, styles.detailMedia]}>
          <Skeleton style={[styles.detailFrame, { width: width - 64 }]} />
          <Skeleton style={[styles.detailFrame, { width: width - 64 }]} />
        </View>
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
  tile: { gap: SPACING.xxs },
  tileArt: {
    width: '100%',
    aspectRatio: LAYOUT.tileAspect,
    marginBottom: SPACING.xs,
  },
  tileArtWide: { aspectRatio: LAYOUT.tileAspectWide },
  tileLead: { height: TILE_LEAD_H, width: '30%' },
  tileLeadBig: { height: TILE_LEAD_BIG_H, width: '34%' },
  lineWide: { height: 12, width: '80%' },
  lineNarrow: { height: 10, width: '45%' },
  tileTitle: { height: TILE_TITLE_H, width: '82%' },
  tileMeta: { height: TILE_META_H, width: '52%' },
  headingGroup: { gap: 2 },
  heading: { height: HEADING_H, width: 118 },
  eyebrow: { height: EYEBROW_H, width: 52 },
  railRoom: { marginBottom: RAIL_NET },
  shelf: { marginBottom: SPACING.xl, gap: SPACING.sm2 },
  row: { flexDirection: 'row', gap: LAYOUT.gridGap, overflow: 'hidden' },
  hero: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  homeStage: { borderRadius: 0, marginBottom: SPACING.xl },
  deskDoors: { marginBottom: SPACING.xl },
  deskDoor: { width: 148, height: 84, borderRadius: RADIUS.md },
  heroLead: { flex: 2, height: 320, borderRadius: RADIUS.lg },
  heroRail: { flex: 1, gap: SPACING.md },
  heroRailItem: { flex: 1, borderRadius: RADIUS.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -9 },
  category: { gap: SPACING.md },
  masthead: { minHeight: 168, borderRadius: RADIUS.lg },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, overflow: 'hidden' },
  chip: { height: 36, borderRadius: 18 },
  // No plate: the result rows sit on the page, so their bones do too.
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm2,
  },
  rowThumb: { ...LAYOUT.resultPoster, borderRadius: RADIUS.sm },
  rowLines: { flex: 1, gap: SPACING.sm },
  lineTiny: { height: 8, width: '30%' },
  wideCard: {
    width: LAYOUT.cardWideWidth,
    height: LAYOUT.cardHeight,
    borderRadius: RADIUS.xl,
  },
  compact: { gap: 0 },
  compactShelves: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  compactDoors: { marginBottom: SPACING.xl, gap: SPACING.sm2 },
  compactDoor: { width: 148, height: 84, borderRadius: RADIUS.card },
  /** Height comes from stageHeight, so the two cannot drift again. */
  stage: { borderRadius: 0 },
  band: {
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  bandHeadline: { height: TYPE.title.lineHeight, width: '72%', marginTop: 2 },
  bandLine: { height: 21 * 2, width: '92%', marginBottom: SPACING.md },
  bandAction: { height: 42, width: 148, borderRadius: RADIUS.lg },
  bleed: {
    marginHorizontal: -GUTTER,
    paddingHorizontal: SPACING.md,
  },
  /**
   * Every number here is the loaded page measured at 390 points, so the
   * bones stand where the words will. See `SkeletonDetail`.
   */
  detailHero: {
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    overflow: 'hidden',
  },
  /** The artwork's stand-in, behind the mark rather than above it. */
  detailHeroFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  detailTitle: { height: TITLE_SLOT * 0.62, width: '62%', alignSelf: 'center' },
  detailIdentity: {
    height: 17,
    width: '58%',
    alignSelf: 'center',
    marginTop: SPACING.sm2,
  },
  detailBody: { paddingHorizontal: SPACING.md },
  detailAnswer: { paddingTop: SPACING.md, gap: SPACING.sm2 },
  detailSaid: { height: 21, width: '70%', alignSelf: 'center' },
  detailStrip: { flexDirection: 'row', gap: SPACING.sm },
  detailStripCell: { flex: 1, height: 71 },
  detailLead: { flex: 1.35 },
  detailDecision: { paddingTop: SPACING.lg, gap: SPACING.sm2 },
  detailControl: { height: 48, borderRadius: RADIUS.sm },
  detailQuiet: { height: 25, width: '64%', alignSelf: 'center' },
  detailFit: { paddingTop: SPACING.xl, gap: SPACING.sm2 },
  detailHeading: { height: 24, width: 140 },
  detailFitStrip: { height: 96 },
  detailMedia: { marginTop: SPACING.xl, gap: SPACING.sm2 },
  detailFrame: { aspectRatio: 16 / 9, borderRadius: RADIUS.sm },
  /** Still the expanded masthead's, which lays its stats out in a row. */
  detailStat: { height: 34, width: 64 },
  detailChip: { height: 26, width: 84, borderRadius: 14 },
  lineFull: { height: 12, width: '100%' },
  /** The band at the hero's own proportions - see DESK_BAND. */
  deskBand: {
    width: '100%',
    aspectRatio: DESK_BAND.ratio,
    minHeight: DESK_BAND.floor,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  deskLockup: {
    width: '100%',
    maxWidth: DESK_PAGE_MAX,
    alignSelf: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl * 2,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  deskMark: { height: 96, width: 300 },
  deskIdentity: { height: 17, width: 260 },
  deskColumns: {
    flexDirection: 'row',
    gap: SPACING.xl + SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: DESK_PAGE_MAX,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl * 2,
    paddingTop: SPACING.lg,
  },
  deskMain: { flex: 70, minWidth: 0, gap: SPACING.sm + 2 },
  /** The figure and its pace line, over the rule the page draws there. */
  deskFigures: {
    gap: SPACING.sm + 2,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  deskFigure: { height: 60, width: 220 },
  deskPace: { height: 17, width: 260 },
  deskShelfTitle: { height: 33, width: 240 },
  deskFrame: { flex: 1, aspectRatio: 16 / 9, borderRadius: RADIUS.md },
  deskRail: {
    flex: 30,
    maxWidth: DESK_RAIL,
    minWidth: 300,
    gap: SPACING.md,
  },
  deskRailLabel: { height: EYEBROW_H, width: 96, marginTop: SPACING.lg },
  deskRailControl: { height: 56, borderRadius: RADIUS.md },
});
