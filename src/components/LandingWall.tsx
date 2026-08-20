import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { queryKeys } from '@/api/queryClient';
import { getTrendingGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { RADIUS } from '@/styles/theme';

/**
 * The pile, and the three you will actually finish.
 *
 * This is the whole argument as a picture. A wall of games sits behind
 * the masthead at half strength; as you scroll it goes out, cover by
 * cover, until three are left lit. Nothing written on this page makes
 * the case as fast, and it is the one thing here that could not be
 * lifted from a template — the product's thesis, animated by the act of
 * reading it.
 *
 * The covers are the app's own content at its smallest derivative:
 * they are never shown above a quarter of their size and mostly sit
 * under a tenth of their opacity, so a hundred-pixel-wide image is more
 * than the wall ever needs.
 */

/** Enough to read as a pile. Past this it is just bytes. */
const COUNT = 24;
/**
 * Which of them survive.
 *
 * Chosen so they land in different lanes at both column counts the page
 * uses — dealt across four or seven, 1, 10 and 19 never share one. The
 * first set clustered two survivors in the same lane, which read as a
 * bright corner rather than as three games picked out of a pile.
 */
const KEPT = [1, 10, 19];
/**
 * How far you scroll before the pile has gone out.
 *
 * Short. The point is watching it happen, and at the distance this
 * started on the pile was still going out after the hero had left the
 * screen — the payoff played to an empty room.
 */
const FADE_DISTANCE = 280;

/** How far a lane wanders from where it started, in points. */
const DRIFT = 34;

/**
 * One lane of the wall, drifting.
 *
 * Each lane travels on its own clock and starts at its own point in the
 * cycle, because lanes moving together are an escalator and lanes
 * moving apart are a heap settling. Nothing here loops back to a seam:
 * it goes out and comes back, so there is no moment where the wall
 * jumps.
 */
function Lane({
  items,
  index,
  dim,
  lit,
}: {
  items: { game: Game; index: number }[];
  index: number;
  dim: Animated.AnimatedInterpolation<number>;
  lit: Animated.AnimatedInterpolation<number>;
}) {
  const reduced = useReducedMotion();
  const wander = useAnimatedValue(0);

  useEffect(() => {
    if (reduced) return;
    const duration = DURATION.drift + index * 2300;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wander, {
          toValue: 1,
          duration,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
        Animated.timing(wander, {
          toValue: 0,
          duration,
          easing: EASING.standard,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [wander, index, reduced]);

  const up = index % 2 === 0;
  const travel = wander.interpolate({
    inputRange: [0, 1],
    outputRange: up ? [-DRIFT, DRIFT] : [DRIFT, -DRIFT],
  });

  return (
    <Animated.View
      style={[
        styles.lane,
        index % 2 === 1 && styles.laneOffset,
        { transform: [{ translateY: travel }] },
      ]}
    >
      {items.map(({ game, index: position }) => {
        const kept = KEPT.includes(position);
        return (
          <Animated.View
            key={game.id}
            style={[
              styles.slot,
              kept && styles.kept,
              { opacity: kept ? lit : dim },
            ]}
          >
            <CoverImage
              uri={game.background_image}
              style={StyleSheet.absoluteFill}
              size="thumb"
              iconSize={18}
            />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

export function LandingWall({ columns }: { columns: number }) {
  const reduced = useReducedMotion();
  const progress = useAnimatedValue(reduced ? 1 : 0);

  const { data } = useQuery({
    queryKey: queryKeys.shelf('landing-wall'),
    queryFn: () => getTrendingGames(1),
    select: (page: Paged<Game>) => page.results.slice(0, COUNT),
    staleTime: 6 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || reduced) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      // One write per paint: a scroll event fires more often than the
      // screen updates, and every extra one is a layout thrown away.
      frame = requestAnimationFrame(() => {
        frame = 0;
        progress.setValue(Math.min(window.scrollY / FADE_DISTANCE, 1));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [progress, reduced]);

  // Deal the covers into columns down the page rather than across it, so
  // neighbouring covers are not neighbours in the API's ordering.
  const dealt = useMemo(() => {
    const lanes: { game: Game; index: number }[][] = Array.from(
      { length: columns },
      () => []
    );
    (data ?? []).forEach((game, index) => {
      lanes[index % columns].push({ game, index });
    });
    return lanes;
  }, [data, columns]);

  if (!data) return null;

  const dim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.06],
  });
  const lit = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.wall} pointerEvents="none">
      <View style={styles.lanes}>
        {dealt.map((lane, laneIndex) => (
          <Lane
            key={laneIndex}
            items={lane}
            index={laneIndex}
            dim={dim}
            lit={lit}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  lanes: {
    flexDirection: 'row',
    gap: 14,
    // Turned and oversized: a grid squared to the viewport reads as a
    // layout, and this is meant to read as a heap.
    transform: [{ rotate: '-9deg' }, { scale: 1.35 }],
    justifyContent: 'center',
  },
  lane: { flex: 1, gap: 14 },
  laneOffset: { marginTop: -58 },
  slot: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  kept: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
});
