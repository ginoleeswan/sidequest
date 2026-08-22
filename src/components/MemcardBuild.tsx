import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { CoverImage } from './CoverImage';
import {
  LandingMemcard,
  landingCardHeight,
  landingSlot,
} from './LandingMemcard';
import { useInView } from './Rise';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Memcard as MemcardModel } from '@/lib/memcard';
import { COLORS } from '@/styles/colors';
import { EASING } from '@/styles/motion';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The memcard, assembled out of the games themselves.
 *
 * The product-film build: pieces arrive from the viewer's side of the
 * glass — big, close, slightly askew — fly into the screen, shrink to
 * scale and slot home, and only when the last one lands does the stamp
 * come down. The pieces are the games' covers with their names on
 * them, and each lands exactly on the month it became a block in. A
 * cover turning into a block on a memory card is the whole product in
 * one gesture.
 *
 * Paced to be watched, not glimpsed: each flight takes a second, the
 * next launches half a second later, and the flier carries the game's
 * name in a caption bar, because the moment only means something if
 * you recognise what is landing. The block pops on the card's own
 * spring at the instant the flier retires — one counter drives both,
 * so they cannot disagree.
 */

const FLIGHT = 1050;
const LAUNCH_EVERY = 560;
const SETTLE = 450;

/** When flier `i` is in the air, as a fraction of the whole build. */
export interface BuildWindow {
  start: number;
  end: number;
}

/**
 * The build as proportions instead of milliseconds.
 *
 * The animation used to be a set of `setTimeout`s, which meant it ran
 * on a clock the reader had no say in: it fired when the section was
 * fifteen percent into view and took 5.4 seconds, so anybody scrolling
 * at a normal pace watched the stamp come down somewhere above their
 * screen. Expressed as fractions, the same pacing can be driven by
 * scroll position instead — and the timer path can drive it too, from
 * one value, so there is only one description of the sequence.
 */
export function buildTimeline(count: number): {
  settleEnd: number;
  windows: BuildWindow[];
} {
  if (count <= 0) return { settleEnd: 1, windows: [] };

  const total = SETTLE + (count - 1) * LAUNCH_EVERY + FLIGHT;
  return {
    settleEnd: SETTLE / total,
    windows: Array.from({ length: count }, (_, i) => ({
      start: (SETTLE + i * LAUNCH_EVERY) / total,
      end: (SETTLE + i * LAUNCH_EVERY + FLIGHT) / total,
    })),
  };
}

/** The whole build in milliseconds, for the un-pinned timer path. */
export function buildDuration(count: number): number {
  if (count <= 0) return 0;
  return SETTLE + (count - 1) * LAUNCH_EVERY + FLIGHT;
}

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
  const width = Math.min(maxWidth ?? 1000, windowWidth - 32);
  const height = landingCardHeight(width);

  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-15%');
  const [landed, setLanded] = useState(0);
  const settle = useAnimatedValue(reduced ? 1 : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const flights = card.blocks.map((block, index) => ({
    block,
    image: games[index]?.background_image,
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

  const shown = reduced ? card.blocks.length : landed;

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
        <LandingMemcard
          card={card}
          width={width}
          landed={shown}
          images={flights.map((flight) => flight.image ?? undefined)}
        />
      </Animated.View>

      {/* The pieces, flying past the reader into their slots. */}
      {!reduced &&
        seen &&
        flights.map((flight, index) =>
          flight.image && index >= landed ? (
            <Flier
              key={flight.block.id}
              image={flight.image}
              name={flight.block.name}
              index={index}
              slot={landingSlot(width, flight.block.month)}
              width={width}
              height={height}
            />
          ) : null
        )}
    </View>
  );
}

/**
 * One cover's flight: launched huge on the viewer's side with its name
 * on a caption bar, tilted like something picked up, easing into the
 * screen until it is the size of the block it becomes.
 */
function Flier({
  image,
  name,
  index,
  slot,
  width,
  height,
}: {
  image: string;
  name: string;
  index: number;
  slot: { x: number; y: number; w: number; h: number };
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

  const flierW = Math.min(Math.max(width * 0.4, 190), 300);
  const flierH = flierW * 0.72;

  const side = index % 2 === 0 ? -1 : 1;
  const start = {
    x: width / 2 + side * width * 0.2 + (index % 3) * 26,
    y: height * 0.4 - (index % 4) * 34,
  };

  const at = (stops: [number, number][], out: number[]) =>
    flight.interpolate({
      inputRange: stops.map(([t]) => t),
      outputRange: out,
    });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flier,
        {
          width: flierW,
          left: -flierW / 2,
          top: -flierH / 2,
          opacity: flight.interpolate({
            inputRange: [0, 0.1, 0.93, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            { perspective: 900 },
            {
              translateX: flight.interpolate({
                inputRange: [0, 1],
                outputRange: [start.x, slot.x],
              }),
            },
            {
              // A dip before settling, so the landing reads as a
              // touch-down rather than an arrival at coordinates.
              translateY: flight.interpolate({
                inputRange: [0, 0.72, 1],
                outputRange: [start.y, slot.y - 26, slot.y],
              }),
            },
            {
              // Lands at the slot's own size — the cover stays a cover,
              // because in this card a game IS its save icon.
              scale: flight.interpolate({
                inputRange: [0, 1],
                outputRange: [2, slot.w / flierW],
              }),
            },
            {
              rotateZ: flight.interpolate({
                inputRange: [0, 1],
                outputRange: [`${side * 8}deg`, '0deg'],
              }),
            },
            {
              rotateX: flight.interpolate({
                inputRange: [0, 1],
                outputRange: ['26deg', '0deg'],
              }),
            },
          ],
        },
      ]}
    >
      <CoverImage
        uri={image}
        style={[styles.art, { height: flierW * 0.58 }]}
        size="tile"
      />
      {/* The name, so the viewer knows WHAT just became a block. */}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flier: {
    position: 'absolute',
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#161C27',
    overflow: 'hidden',
    boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
  },
  art: { width: '100%' },
  name: {
    ...TYPE.h3,
    color: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
});
