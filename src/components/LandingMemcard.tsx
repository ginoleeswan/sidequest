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
const PAD = SPACING.lg;
const GAP = 8;
const HEADER = 78;

const columnsFor = (width: number) => (width > 700 ? 6 : 3);

export function landingSlot(
  width: number,
  month: number
): { x: number; y: number; w: number; h: number } {
  const columns = columnsFor(width);
  const w = (width - PAD * 2 - GAP * (columns - 1)) / columns;
  const h = w * 0.74;
  const col = month % columns;
  const row = Math.floor(month / columns);
  return {
    x: PAD + col * (w + GAP) + w / 2,
    y: HEADER + row * (h + GAP) + h / 2,
    w,
    h,
  };
}

export function landingCardHeight(width: number): number {
  const columns = columnsFor(width);
  const rows = 12 / columns;
  const w = (width - PAD * 2 - GAP * (columns - 1)) / columns;
  return HEADER + rows * (w * 0.74 + GAP) - GAP + PAD;
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
  const slotW = (width - PAD * 2 - GAP * (columns - 1)) / columns;
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
    <View style={[styles.card, { width, height }]}>
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
      <View style={styles.inner}>
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>MEMORY CARD</Text>
            <Text style={styles.year}>{card.year}</Text>
          </View>
          {/* The scoreboard: counts up as the covers land. */}
          <Text style={styles.score}>
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

      {done && <Stamp />}
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
      {!on && <Text style={styles.slotInitial}>{initial}</Text>}
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
          <View style={styles.saveMonth}>
            <Text style={styles.saveMonthWord}>{initial}</Text>
          </View>
          <View style={styles.saveHours}>
            <Text style={styles.saveHoursWord}>
              {Math.round(save.hours)}h{save.extra > 0 ? ` +${save.extra}` : ''}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/** ROLL CREDITS, thumped down askew once the year is in. */
function Stamp() {
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
      <Text style={styles.stampWord}>ROLL CREDITS</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The shell SVG carries the surface, stroke and notch; the View
  // carries only the soft shadow (which hugs the rect — close enough
  // for a diffuse glow) and the content box.
  card: { boxShadow: '0 24px 60px rgba(0,0,0,0.45)', borderRadius: RADIUS.md },
  inner: { flex: 1, padding: PAD, paddingTop: 0 },
  header: {
    height: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
    color: COLORS.white,
  },
  score: { ...TYPE.tag, color: COLORS.mediumGrey },
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
    right: PAD + 14,
    // Over the grid's quiet upper rows, not over the scoreboard: a
    // stamp goes on the document, and must not redact the score it
    // just finished earning.
    top: HEADER + 26,
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
