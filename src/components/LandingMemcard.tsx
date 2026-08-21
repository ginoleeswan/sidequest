import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

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

/** Grid shape, shared with the flight paths via `landingSlot`. */
const COLUMNS = 12;
const ROWS = 3;
const PAD = SPACING.lg;
const GAP = 5;
const HEADER = 74;
const INITIALS = 26;

export function landingSlot(
  width: number,
  month: number,
  row: number
): { x: number; y: number; size: number } {
  const cell = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  return {
    x: PAD + month * (cell + GAP) + cell / 2,
    y: HEADER + (ROWS - 1 - row) * (cell + GAP) + cell / 2,
    size: cell,
  };
}

export function landingCardHeight(width: number): number {
  const cell = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  return HEADER + ROWS * (cell + GAP) + INITIALS + PAD;
}

/**
 * The shell: a rounded card with one corner cut off on the diagonal —
 * the memory-card silhouette, which is the whole reason this object
 * reads as saved progress rather than as a calendar widget. The first
 * component version kept the grid and lost the notch, and with it the
 * identity. Drawn as a path at the card's exact size, with the little
 * grip grooves beside the cut for the people who will recognise them.
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
}: {
  card: MemcardModel;
  width: number;
  /** How many of the card's blocks have arrived. */
  landed: number;
}) {
  const cell = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const done = landed >= card.blocks.length;
  const hours = card.blocks
    .slice(0, landed)
    .reduce((sum, block) => sum + block.hours, 0);

  // Which cell each landed block occupies.
  const filled = new Map<string, boolean>();
  card.blocks.slice(0, landed).forEach((block, index) => {
    const row = card.blocks
      .slice(0, index)
      .filter((other) => other.month === block.month).length;
    filled.set(`${block.month}-${row}`, true);
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
          <Text style={styles.year}>{card.year}</Text>
          {/* The scoreboard: counts up as the covers land. */}
          <Text style={styles.score}>
            <Text style={styles.scoreNumber}>{landed}</Text> GAMES ·{' '}
            <Text style={styles.scoreNumber}>{Math.round(hours)}</Text> HOURS
          </Text>
        </View>

        <View style={[styles.grid, { gap: GAP }]}>
          {Array.from({ length: ROWS }, (_, r) => ROWS - 1 - r).map((row) => (
            <View key={row} style={[styles.gridRow, { gap: GAP }]}>
              {Array.from({ length: COLUMNS }, (_, month) => (
                <Block
                  key={month}
                  size={cell}
                  on={filled.get(`${month}-${row}`) === true}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.initials}>
          {MONTH_INITIALS.map((initial, month) => (
            <Text key={month} style={[styles.initial, { width: cell }]}>
              {initial}
            </Text>
          ))}
        </View>
      </View>

      {done && <Stamp />}
    </View>
  );
}

/** One cell: faint until its game lands, then it pops amber. */
function Block({ size, on }: { size: number; on: boolean }) {
  const reduced = useReducedMotion();
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
    <View
      style={[
        styles.cellGhost,
        { width: size, height: size, borderRadius: Math.min(6, size * 0.2) },
      ]}
    >
      {on && (
        <Animated.View
          style={[
            styles.cellOn,
            {
              borderRadius: Math.min(6, size * 0.2),
              transform: [
                {
                  scale: pop.interpolate({
                    inputRange: [0.2, 0.7, 1],
                    outputRange: [1.5, 0.92, 1],
                  }),
                },
              ],
            },
          ]}
        />
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
  year: {
    fontFamily: 'Noah-Black',
    fontSize: 34,
    letterSpacing: -1,
    color: COLORS.white,
  },
  score: { ...TYPE.tag, color: COLORS.mediumGrey },
  scoreNumber: { color: COLORS.accent },
  grid: {},
  gridRow: { flexDirection: 'row' },
  cellGhost: { backgroundColor: 'rgba(255,255,255,0.05)' },
  cellOn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.accent,
    boxShadow: '0 3px 0 #B87A16',
  },
  initials: {
    flexDirection: 'row',
    gap: GAP,
    marginTop: 8,
    height: INITIALS - 8,
  },
  initial: { ...TYPE.tag, fontSize: 10, textAlign: 'center' },
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
