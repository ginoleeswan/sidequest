import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
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

/**
 * Where the scroll-driven build finishes within its track, leaving the
 * rest as a deliberate hold on the completed card.
 *
 * A build that lands its last block exactly at `progress === 1` has no
 * payoff: that is the same scroll position at which `ScrollStage`
 * releases the pin, so the finished card would only ever be visible
 * while it is already sliding away — measured live as the 8th block
 * landing at `progress ≈ 0.9998` (short of the `>= 1` gate on sub-pixel
 * rounding) with the pin already gone by the time it did. Ending the
 * build at 0.85 instead means it always finishes with the section still
 * pinned, and the last 15% of the track becomes a beat where the reader
 * can actually see the stamp before the page lets go.
 */
const SCROLL_BUILD_ENDS_AT = 0.85;

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
 *
 * `within` compresses every `start`, `end` and `settleEnd` into the
 * first `within` of the 0→1 range, leaving the remainder as dead room
 * at the top. It exists for the scroll-driven path: a build timed to
 * land its last block exactly at `progress === 1` lands it exactly when
 * the pin releases, which measured live as the finished card only
 * becoming visible once it was already sliding away — sub-pixel
 * rounding meant the literal end of scroll travel read as 0.9998, short
 * of the `>= 1` landing gate, so the last block never landed at all
 * while pinned. Compressing to `within = 0.85` fixes both: 0.85 is
 * reached with room to spare despite rounding, and the untouched 15%
 * above it becomes a hold where the reader can actually see the
 * finished card before the section lets go. The clock-driven path
 * passes the default `1` and is unaffected — its "when" is real time,
 * not scroll position, so it has no release to race against.
 */
export function buildTimeline(
  count: number,
  within: number = 1
): {
  settleEnd: number;
  windows: BuildWindow[];
} {
  if (count <= 0) return { settleEnd: within, windows: [] };

  const total = SETTLE + (count - 1) * LAUNCH_EVERY + FLIGHT;
  return {
    settleEnd: (SETTLE / total) * within,
    windows: Array.from({ length: count }, (_, i) => ({
      start: ((SETTLE + i * LAUNCH_EVERY) / total) * within,
      end: ((SETTLE + i * LAUNCH_EVERY + FLIGHT) / total) * within,
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
  progress,
}: {
  card: MemcardModel;
  games: Game[];
  maxWidth?: number;
  /**
   * Scroll position through the section, 0 to 1. Given one, the build
   * plays at the reader's pace; without one it runs on its own clock
   * once scrolled into view, which is what native and reduced-motion
   * readers get.
   */
  progress?: Animated.Value;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(maxWidth ?? 1000, windowWidth - 32);
  const height = landingCardHeight(width);

  const reduced = useReducedMotion();
  const [ref, seen] = useInView('-15%');
  const [landed, setLanded] = useState(0);

  const flights = card.blocks.map((block, index) => ({
    block,
    image: games[index]?.background_image,
  }));

  // Only the scroll-driven path needs a hold: its "when" is a scroll
  // position that can only ever reach 1 at the exact instant the pin
  // releases, so the build has to finish early and sit still for the
  // rest of the track or the reader never sees it complete. The clock
  // path's "when" is real time with no pin to race, so it gets the
  // untouched 0->1 timeline.
  const timeline = useMemo(
    () => buildTimeline(flights.length, progress ? SCROLL_BUILD_ENDS_AT : 1),
    [flights.length, progress]
  );

  // One value drives everything: the card's arrival, every flier's
  // flight, and how many blocks have landed. Either the reader's scroll
  // supplies it or the clock does, and nothing downstream can tell the
  // difference — which is the only reason the two paths cannot drift
  // apart. The clock itself is linear: it is a position now, not a
  // motion, so the deceleration that used to live in `Animated.timing`'s
  // easing option is applied per-interpolation below instead, on both
  // the settle and every flier's flight.
  const clock = useAnimatedValue(reduced ? 1 : 0);
  const driver = progress ?? clock;

  useEffect(() => {
    if (progress || reduced || !seen) return;
    const run = Animated.timing(clock, {
      toValue: 1,
      duration: buildDuration(flights.length),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
    // flights.length is derived from card.blocks, stable per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reduced, seen, clock]);

  // `landed` has to stay a plain number, because it is a prop on the
  // card rather than something animated — LandingMemcard re-renders its
  // month grid off it. Guarded with a functional update so it only
  // triggers a re-render on the frames where a block actually arrives
  // (eight, at most, for a full year), not on every frame the driver
  // moves through. Reduced motion never subscribes at all — `shown`
  // below reads `card.blocks.length` directly in that case, and the
  // fliers this count would otherwise gate are never rendered, so there
  // is nothing for a synchronous setState in the effect body to buy.
  useEffect(() => {
    if (reduced) return;
    const apply = (value: number) => {
      let count = 0;
      for (const w of timeline.windows) if (value >= w.end) count += 1;
      setLanded((previous) => (previous === count ? previous : count));
    };
    // `addListener` only fires on the NEXT change — it does not replay
    // the driver's current value. Every animated output below (`settle`,
    // each flier's `flight`) reads the value directly and so paints
    // correctly the instant it mounts; `landed` would not, without this
    // seed. That gap is reachable: a scroll-driven `progress` can already
    // be part-way through when this subtree mounts (a reader who
    // reloaded mid-section, or this component mounting late behind a
    // deferred-render wrapper), and it would otherwise leave `landed`
    // stuck at 0 forever, since nothing "changes" until the reader moves
    // the scroll position again.
    apply((driver as unknown as { __getValue(): number }).__getValue());
    const id = driver.addListener(({ value }) => apply(value));
    return () => driver.removeListener(id);
  }, [driver, timeline, reduced]);

  const shown = reduced ? card.blocks.length : landed;

  // Reduced motion forces the finished state regardless of what the
  // driver is doing — a plain 1, not an interpolation, because there is
  // nothing left to animate toward. `.interpolate` only exists on the
  // Animated branch, so the JSX below has to check which one it got
  // rather than calling it unconditionally.
  const settle: Animated.AnimatedInterpolation<number> | 1 = reduced
    ? 1
    : driver.interpolate({
        inputRange: [0, Math.max(timeline.settleEnd, 0.0001)],
        outputRange: [0, 1],
        extrapolate: 'clamp',
        easing: EASING.standard,
      });

  return (
    <View ref={ref} style={{ width, height }}>
      <Animated.View
        style={{
          opacity: settle,
          transform: [
            {
              scale:
                settle === 1
                  ? 1
                  : settle.interpolate({
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

      {/* The pieces, flying past the reader into their slots. Kept off
          the tree entirely for reduced motion and, until a scroll driver
          is supplied, until the section has actually been scrolled into
          view — a scroll-driven progress value can legitimately sit at
          0 before the reader ever gets there. */}
      {!reduced &&
        (!!progress || seen) &&
        flights.map((flight, index) =>
          flight.image && index >= shown ? (
            <Flier
              key={flight.block.id}
              image={flight.image}
              name={flight.block.name}
              index={index}
              flight={driver.interpolate({
                inputRange: [
                  timeline.windows[index].start,
                  timeline.windows[index].end,
                ],
                outputRange: [0, 1],
                extrapolate: 'clamp',
                easing: EASING.standard,
              })}
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
  flight,
  slot,
  width,
  height,
}: {
  image: string;
  name: string;
  index: number;
  /**
   * 0 launched, 1 landed. Owned by the caller now, not by the flier —
   * the whole point of this component's half of the change is that it
   * has no clock of its own to disagree with the driver's.
   */
  flight: Animated.AnimatedInterpolation<number>;
  slot: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
}) {
  const flierW = Math.min(Math.max(width * 0.4, 190), 300);
  const flierH = flierW * 0.72;

  const side = index % 2 === 0 ? -1 : 1;
  const start = {
    x: width / 2 + side * width * 0.2 + (index % 3) * 26,
    y: height * 0.4 - (index % 4) * 34,
  };

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
