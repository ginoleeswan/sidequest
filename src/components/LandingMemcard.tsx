import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { CoverImage } from './CoverImage';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Memcard as MemcardModel } from '@/lib/memcard';
import { MONTH_INITIALS } from '@/lib/memcard';
import { COLORS } from '@/styles/colors';
import { SPRING } from '@/styles/motion';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The memcard as the landing page's stage prop.
 *
 * The card everyone shares is a 1200x630 social image: metadata on the
 * left, the grid in one corner — the right layout for a link preview
 * and the wrong one to watch being built. On a phone it rendered as a
 * paragraph of small print beside a thumbnail of the only part that
 * matters. This is the same object redrawn for the stage: the grid IS
 * the card, twelve fat columns edge to edge, a year and a running
 * count above it, the stamp at the end. Everything a viewer needs to
 * follow the build, nothing that competes with it.
 *
 * Drawn as components rather than an SVG string so each block is its
 * own animated thing: when a cover lands, its block does not appear —
 * it POPS, on the same spring the app's buttons push back with. The
 * count in the header ticks up with it, so the card is visibly
 * keeping score of its own construction.
 */

/**
 * Grid shape, shared with the flight paths via `landingSlot`.
 *
 * Not abstract cells: SAVE SLOTS, the way the PS1's memory-card screen
 * drew them — a grid of little framed squares, each holding the icon
 * of what is saved in it. A landed game keeps its cover art as the
 * slot's icon, so the card ends the build full of the games
 * themselves rather than a bar chart of them. Six months to a row
 * where there is width for it, three on a phone.
 */
/**
 * The card's own margin, tightened where there is nothing to spare.
 *
 * A 24pt border is right on a 900pt card and is a tenth of the width
 * of a 280pt one. Narrow cards give the padding back to the slots,
 * which is where the game art actually is.
 */
const padFor = (width: number) => (width < 420 ? 14 : SPACING.lg);
const GAP = 8;
/**
 * Header height. Sized so the label-and-year lockup keeps clear air
 * above and below when vertically centred — at 78 the eyebrow's box
 * touched the year's cap height and the pair read as one cramped
 * word. Everything downstream (slot rows, flight paths, card height)
 * derives from this, so the grid moves down with it.
 */
const headerFor = (width: number) => (width < 420 ? 72 : 88);

/**
 * Three, four or six — never a number that leaves a ragged last row.
 *
 * Twelve months divide by all three, so every tier fills its rows
 * exactly and the card stays a rectangle of slots rather than a grid
 * with a gap in the corner.
 *
 * The middle tier exists because the jump straight from three to six
 * was measured and it was ugly: at a 660px card the three-column
 * layout gave 201px slots and a card 718 tall — a memory card as tall
 * as a poster — and four pixels later, at 704, it snapped to 107px
 * slots and 264 tall. Nothing between a phone and a laptop looked
 * like the same object.
 */
/**
 * Four, at every width.
 *
 * Twelve months in four columns is three rows, and three rows of
 * four is the only arrangement that gives the object a memory card's
 * proportions instead of a spreadsheet's. Measured: six columns made
 * the card 900x308 on a laptop — 2.9 to 1, nearly twice as wide as
 * the thing it is drawn to look like — and three made it 350x412 on
 * a phone, taller than it is wide. Four lands between 1.3 and 1.6
 * from 320 all the way to 1440, which is a memory card everywhere
 * rather than a letterbox in one place and a paperback in another.
 *
 * It also makes every slot bigger, which is the point: the covers are
 * the content, and at six across they were postage stamps.
 */
const columnsFor = (_width: number) => 4;

export function landingSlot(
  width: number,
  month: number
): { x: number; y: number; w: number; h: number } {
  const columns = columnsFor(width);
  const pad = padFor(width);
  const w = (width - pad * 2 - GAP * (columns - 1)) / columns;
  const h = w * 0.74;
  const col = month % columns;
  const row = Math.floor(month / columns);
  return {
    x: pad + col * (w + GAP) + w / 2,
    y: headerFor(width) + row * (h + GAP) + h / 2,
    w,
    h,
  };
}

export function landingCardHeight(width: number): number {
  const columns = columnsFor(width);
  const pad = padFor(width);
  const rows = Math.ceil(12 / columns);
  const w = (width - pad * 2 - GAP * (columns - 1)) / columns;
  return headerFor(width) + rows * (w * 0.74 + GAP) - GAP + pad;
}

/**
 * The shell: a rounded card with one corner cut off on the diagonal —
 * the memory-card silhouette, which is the whole reason this object
 * reads as saved progress rather than as a calendar widget.
 */
function shellPath(w: number, h: number, notch: number): string {
  const r = 18;
  return (
    `M ${r} 0 H ${w - notch} L ${w} ${notch} V ${h - r} ` +
    `Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} ` +
    `V ${r} Q 0 0 ${r} 0 Z`
  );
}

export function LandingMemcard({
  card,
  width,
  landed,
  images = [],
}: {
  card: MemcardModel;
  width: number;
  /** How many of the card's blocks have arrived. */
  landed: number;
  /** Cover art per block, aligned to card.blocks. */
  images?: (string | undefined)[];
}) {
  const columns = columnsFor(width);
  const pad = padFor(width);
  const header = headerFor(width);
  const slotW = (width - pad * 2 - GAP * (columns - 1)) / columns;
  const slotH = slotW * 0.74;
  const done = landed >= card.blocks.length;
  const hours = card.blocks
    .slice(0, landed)
    .reduce((sum, block) => sum + block.hours, 0);

  /** The save in each month's slot, once its cover has landed. */
  const saves = new Map<
    number,
    { image?: string; hours: number; extra: number }
  >();
  card.blocks.slice(0, landed).forEach((block, index) => {
    const existing = saves.get(block.month);
    if (existing) {
      existing.extra += 1;
      existing.hours += block.hours;
    } else {
      saves.set(block.month, {
        image: images[index],
        hours: block.hours,
        extra: 0,
      });
    }
  });

  const height = landingCardHeight(width);
  const notch = Math.max(30, Math.min(52, width * 0.055));

  return (
    /**
     * The card announces itself as one image, the way the share card
     * did. Twelve slots and a scoreboard is a dozen fragments to a
     * screen reader unless the whole thing carries the sentence.
     */
    <View
      style={[styles.card, { width, height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${card.year}: ${card.headline}`}
    >
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path
          d={shellPath(width, height, notch)}
          fill="#1D2431"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={2}
        />
        {/* The grip grooves, beside the cut corner. */}
        {[0, 1, 2, 3].map((slot) => (
          <Rect
            key={slot}
            x={width - notch - 22 - slot * 13}
            y={10}
            width={5}
            height={16}
            rx={2.5}
            fill="rgba(255,255,255,0.10)"
          />
        ))}
      </Svg>
      <View
        style={[styles.inner, { paddingHorizontal: pad, paddingBottom: pad }]}
      >
        <View style={[styles.header, { height: header }]}>
          <View style={styles.lockup}>
            <Text style={styles.label}>MEMORY CARD</Text>
            <Text style={[styles.year, header < 80 && styles.yearTight]}>
              {card.year}
            </Text>
          </View>
          {/* The scoreboard: counts up as the covers land. Smaller
              where the header is, so "8 GAMES · 207 HOURS" does not
              crowd the year it belongs to on a 280pt card. */}
          <Text style={[styles.score, header < 70 && styles.scoreTight]}>
            <Text style={styles.scoreNumber}>{landed}</Text> GAMES ·{' '}
            <Text style={styles.scoreNumber}>{Math.round(hours)}</Text> HOURS
          </Text>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: 12 }, (_, month) => (
            <Slot
              key={month}
              w={slotW}
              h={slotH}
              initial={MONTH_INITIALS[month]}
              save={saves.get(month)}
            />
          ))}
        </View>
      </View>

      {done && <Stamp width={width} />}
    </View>
  );
}

/**
 * One save slot. Empty, it is a faint frame holding its month's
 * initial — a slot waiting for a save. Landed, it holds the game's
 * cover as its icon, the month as a chip and the hours in amber, and
 * it arrives on the app's own press-spring.
 */
function Slot({
  w,
  h,
  initial,
  save,
}: {
  w: number;
  h: number;
  initial: string;
  save?: { image?: string; hours: number; extra: number };
}) {
  /**
   * A small slot gets small furniture.
   *
   * The month chip and the hours chip were fixed at 10 and 11 point
   * with fixed padding, which is right on a 137pt slot and takes up
   * most of a 57pt one — measured at 320, the two chips filled the
   * slot and left the cover art peeking out between them. They are
   * annotations on a picture; they have to stay smaller than it.
   */
  const tight = h < 62;
  const chip = tight ? 8 : 10;
  const hoursSize = tight ? 9 : 11;
  const inset = tight ? 3 : 5;
  const reduced = useReducedMotion();
  const on = save !== undefined;
  const pop = useAnimatedValue(on ? 1 : 0);
  const was = useRef(on);

  useEffect(() => {
    if (on === was.current) return;
    was.current = on;
    if (reduced) {
      pop.setValue(on ? 1 : 0);
      return;
    }
    pop.setValue(0.2);
    const spring = Animated.spring(pop, {
      toValue: 1,
      ...SPRING.press,
      useNativeDriver: false,
    });
    spring.start();
    return () => spring.stop();
  }, [on, pop, reduced]);

  return (
    <View style={[styles.slot, { width: w, height: h }]}>
      {!on && (
        <Text
          style={[
            styles.slotInitial,
            tight && { fontSize: Math.round(h * 0.4) },
          ]}
        >
          {initial}
        </Text>
      )}
      {on && (
        <Animated.View
          style={[
            styles.save,
            {
              transform: [
                {
                  scale: pop.interpolate({
                    inputRange: [0.2, 0.7, 1],
                    outputRange: [1.35, 0.94, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {save.image ? (
            <CoverImage uri={save.image} style={styles.saveArt} size="thumb" />
          ) : (
            <View style={[styles.saveArt, styles.saveBare]} />
          )}
          <View
            style={[
              styles.saveMonth,
              { top: inset, left: inset, paddingHorizontal: tight ? 3 : 5 },
            ]}
          >
            <Text style={[styles.saveMonthWord, { fontSize: chip }]}>
              {initial}
            </Text>
          </View>
          <View
            style={[
              styles.saveHours,
              {
                bottom: inset,
                right: inset,
                paddingHorizontal: tight ? 4 : 6,
              },
            ]}
          >
            <Text style={[styles.saveHoursWord, { fontSize: hoursSize }]}>
              {Math.round(save.hours)}h{save.extra > 0 ? ` +${save.extra}` : ''}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** ROLL CREDITS, thumped down askew once the year is in. */
function Stamp({ width }: { width: number }) {
  /**
   * Sized to the card it is stamped on.
   *
   * Fixed at nineteen point it ran off both edges of a 280pt card —
   * a rubber stamp bigger than the document. Proportional, floored so
   * it never becomes a whisper and capped so it never becomes the
   * subject.
   */
  const size = Math.round(Math.min(Math.max(width * 0.052, 12), 21));
  const reduced = useReducedMotion();
  const thump = useAnimatedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const spring = Animated.spring(thump, {
      toValue: 1,
      tension: 120,
      friction: 9,
      useNativeDriver: false,
    });
    spring.start();
    return () => spring.stop();
  }, [thump, reduced]);

  return (
    <Animated.View
      style={[
        styles.stamp,
        {
          /**
           * Off the bottom-right corner, not on the bottom edge.
           *
           * Sitting on the edge it landed squarely on the last slot's
           * hours — the same mistake as covering January, one row
           * down. Hung off the corner it overlaps a triangle of the
           * card and nothing that is a number, and it reads more
           * like a stamp for it: a stamp goes half off the paper.
           */
          right: size < 15 ? -10 : -16,
          bottom: size < 15 ? -16 : -24,
          borderWidth: size < 15 ? 2 : 3,
          paddingVertical: size < 15 ? 4 : 7,
          paddingHorizontal: size < 15 ? 9 : 14,
        },
        {
          opacity: thump.interpolate({
            inputRange: [0, 0.25, 1],
            outputRange: [0, 1, 1],
          }),
          transform: [
            { rotate: '-6deg' },
            {
              scale: thump.interpolate({
                inputRange: [0, 1],
                outputRange: [2.4, 1],
              }),
            },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.stampWord,
          { fontSize: size, letterSpacing: size * 0.13 },
        ]}
      >
        ROLL CREDITS
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The shell SVG carries the surface, stroke and notch; the View
  // carries only the soft shadow (which hugs the rect — close enough
  // for a diffuse glow) and the content box.
  card: { boxShadow: '0 24px 60px rgba(0,0,0,0.45)', borderRadius: RADIUS.md },
  inner: { flex: 1, paddingTop: 0 },
  header: {
    // height comes from headerFor(width)
    flexDirection: 'row',
    // Bottom-aligned, not centred: the year and the scoreboard share
    // the header's floor, so the two read as one line of information
    // with the spare air above them — where the card's notch and
    // grooves already live — instead of two blocks floating at
    // different heights.
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  // Air between the eyebrow and the year: without it the label's
  // descender box sat on the numeral's cap and the lockup read as one
  // cramped word.
  lockup: { gap: 4 },
  label: {
    ...TYPE.micro,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.accent,
  },
  year: {
    fontFamily: 'Noah-Black',
    fontSize: 34,
    letterSpacing: -1,
    lineHeight: 36,
    color: COLORS.white,
  },
  yearTight: { fontSize: 30, lineHeight: 32 },
  // Nudged up to the year's baseline rather than its descender box.
  score: { ...TYPE.tag, color: COLORS.mediumGrey, marginBottom: 7 },
  scoreTight: { fontSize: 9, letterSpacing: 0.5 },
  scoreNumber: { color: COLORS.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  slot: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotInitial: { ...TYPE.h2, color: 'rgba(255,255,255,0.22)' },
  save: {
    position: 'absolute',
    top: -1.5,
    left: -1.5,
    right: -1.5,
    bottom: -1.5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.accent,
    overflow: 'hidden',
    boxShadow: '0 4px 14px rgba(242,169,59,0.25)',
  },
  saveArt: { width: '100%', height: '100%' },
  saveBare: { backgroundColor: COLORS.navy },
  saveMonth: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(14,18,26,0.78)',
  },
  saveMonthWord: { ...TYPE.tag, fontSize: 10, color: COLORS.lightGrey },
  saveHours: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(14,18,26,0.78)',
  },
  saveHoursWord: { ...TYPE.tag, fontSize: 11, color: COLORS.accent },
  stamp: {
    position: 'absolute',
    // right comes from padFor(width)
    /**
     * On the card's bottom lip, half off the shell.
     *
     * This sat over the grid's upper rows, on the reasoning that they
     * were the quiet ones. On the demo card they were; on a real card
     * they are the loudest — January, February and March are exactly
     * where someone who finishes games has saves, and the stamp was
     * redacting two of them along with their hours. A stamp may sit on
     * a document but it may not black out the record, so it moves to
     * the edge, where it straddles the shell instead of covering it.
     */
    borderWidth: 3,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(29,36,49,0.85)',
  },
  stampWord: {
    fontFamily: 'Noah-Black',
    fontSize: 19,
    letterSpacing: 2.5,
    color: COLORS.accent,
  },
});
