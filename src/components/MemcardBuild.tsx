import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { CoverImage } from './CoverImage';
import { Memcard } from './Memcard';
import { useInView } from './Rise';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Memcard as MemcardModel } from '@/lib/memcard';
import { blockSlot, CARD_HEIGHT, CARD_WIDTH } from '@/lib/memcardSvg';
import { COLORS } from '@/styles/colors';
import { EASING } from '@/styles/motion';
import { RADIUS } from '@/styles/theme';

/**
 * The memcard, assembled out of the games themselves.
 *
 * The product-film build: pieces arrive from the viewer's side of the
 * glass — big, close, slightly askew — fly into the screen, shrink to
 * scale and slot home, and only when the last one lands does the stamp
 * come down. Except the pieces here are not abstract shards; they are
 * the covers of the games, and each one lands exactly on the month it
 * became a block in. A cover turning into a block on a memory card is
 * the whole product in one gesture, and nobody needs it explained.
 *
 * Built with perspective transforms and one choreographed timeline,
 * which is the same technique those films use — perspective, easing
 * and order, not a 3D engine. Every flight reads its landing spot from
 * the card's own geometry (`blockSlot`), so a flier cannot land beside
 * its slot; and the block appears at the instant its cover reaches it,
 * because the same counter drives both.
 */

/** How long one cover's flight takes. */
const FLIGHT = 640;
/** The gap between one launch and the next. */
const LAUNCH_EVERY = 300;
/** The card's own entrance, before anything flies. */
const SETTLE = 450;

export function MemcardBuild({
  card,
  games,
  maxWidth,
}: {
  card: MemcardModel;
  games: Game[];
  maxWidth?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  // The same sizing Memcard uses, replicated so overlay and card agree.
  const width = Math.min(maxWidth ?? CARD_WIDTH, windowWidth - 32, CARD_WIDTH);
  const height = (width / CARD_WIDTH) * CARD_HEIGHT;
  const s = width / CARD_WIDTH;

  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-15%');
  const [landed, setLanded] = useState(0);
  const settle = useAnimatedValue(reduced ? 1 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const flights = card.blocks.map((block, index) => ({
    block,
    image: games[index]?.background_image,
    /** Which row this block occupies among its month's earlier ones. */
    row: card.blocks
      .slice(0, index)
      .filter((other) => other.month === block.month).length,
  }));

  useEffect(() => {
    if (reduced || !seen) return;
    const entrance = Animated.timing(settle, {
      toValue: 1,
      duration: SETTLE,
      easing: EASING.standard,
      useNativeDriver: false,
    });
    entrance.start();
    // One landing per flight: the counter that fills the card is the
    // same one that retires the flier, so they can never disagree.
    for (let i = 1; i <= flights.length; i++) {
      timers.current.push(
        setTimeout(() => setLanded(i), SETTLE + (i - 1) * LAUNCH_EVERY + FLIGHT)
      );
    }
    const pending = timers.current;
    return () => {
      entrance.stop();
      pending.forEach(clearTimeout);
    };
    // flights.length is derived from card.blocks, stable per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, seen, settle]);

  const progress = reduced
    ? 1
    : landed === 0
      ? 0
      : (card.blocks[landed - 1].month + 1) / 12;

  return (
    <View ref={ref} style={{ width, height }}>
      <Animated.View
        style={{
          opacity: settle,
          transform: [
            {
              scale: settle.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        }}
      >
        <Memcard card={card} maxWidth={width} progress={progress} />
      </Animated.View>

      {/* The pieces, flying past the reader into their slots. */}
      {!reduced &&
        seen &&
        flights.map((flight, index) =>
          flight.image && index >= landed ? (
            <Flier
              key={flight.block.id}
              image={flight.image}
              index={index}
              slot={blockSlot(flight.block.month, flight.row)}
              scale={s}
              width={width}
              height={height}
            />
          ) : null
        )}
    </View>
  );
}

/**
 * One cover's flight: launched huge on the viewer's side, tilted like
 * something picked up, easing into the screen until it is the size of
 * the block it becomes.
 */
function Flier({
  image,
  index,
  slot,
  scale,
  width,
  height,
}: {
  image: string;
  index: number;
  slot: { x: number; y: number; width: number; height: number };
  scale: number;
  width: number;
  height: number;
}) {
  const flight = useAnimatedValue(0);

  useEffect(() => {
    const animation = Animated.timing(flight, {
      toValue: 1,
      duration: FLIGHT,
      delay: SETTLE + index * LAUNCH_EVERY,
      easing: EASING.standard,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [flight, index]);

  // The flier is drawn at a readable card size and shrinks to the slot.
  const flierW = Math.max(width * 0.34, 150);
  const flierH = flierW * 0.62;

  const target = {
    x: (slot.x + slot.width / 2) * scale,
    y: (slot.y + slot.height / 2) * scale,
  };
  // Launch positions fan out around the centre, alternating sides, so
  // consecutive flights do not trace the same line.
  const side = index % 2 === 0 ? -1 : 1;
  const start = {
    x: width / 2 + side * width * 0.18 + (index % 3) * 24,
    y: height * 0.42 - (index % 4) * 30,
  };

  const between = (from: number, to: number) =>
    flight.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flier,
        {
          width: flierW,
          height: flierH,
          left: -flierW / 2,
          top: -flierH / 2,
          opacity: flight.interpolate({
            // In fast, out at the instant of landing — the amber block
            // appears underneath as this disappears on top of it.
            inputRange: [0, 0.12, 0.9, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            { perspective: 900 },
            { translateX: between(start.x, target.x) },
            { translateY: between(start.y, target.y) },
            { scale: between(2.1, (slot.width * scale) / flierW) },
            {
              rotateZ: flight.interpolate({
                inputRange: [0, 1],
                outputRange: [`${side * 9}deg`, '0deg'],
              }),
            },
            {
              rotateX: flight.interpolate({
                inputRange: [0, 1],
                outputRange: ['24deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      <CoverImage uri={image} style={styles.art} size="thumb" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flier: {
    position: 'absolute',
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: COLORS.navy,
    overflow: 'hidden',
    boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
  },
  art: { width: '100%', height: '100%' },
});
