import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { queryKeys } from '@/api/queryClient';
import { getTrendingGames } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { dayNumber, seededRandom } from '@/lib/homeFeed';
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

/** How many of the pile stay lit when the rest go out. */
const SURVIVORS = 3;

/**
 * A game's identity for the purposes of not stacking it twice.
 *
 * RAWG's trending window routinely carries the same game under two
 * entries — a title and its year-suffixed twin ("Mixtape" and "Mixtape
 * (2025)"). Two copies of one cover in a heap of thirty is the kind of
 * detail nobody names but everybody sees. Homoglyph twins (a Cyrillic О
 * in MОUSE) survive this and are left alone: catching them means a
 * confusables table, which is a lot of machinery for a decorative wall.
 */
function titleKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\((?:19|20)\d{2}\)/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

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
  keptScale,
}: {
  items: { game: Game; key: string; kept: boolean }[];
  index: number;
  dim: Animated.AnimatedInterpolation<number>;
  lit: Animated.AnimatedInterpolation<number>;
  keptScale: Animated.AnimatedInterpolation<number>;
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
      {items.map(({ game, key, kept }) => {
        return (
          <Animated.View
            key={key}
            style={[
              styles.slot,
              kept && styles.kept,
              { opacity: kept ? lit : dim },
              kept && { transform: [{ scale: keptScale }] },
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

export function LandingWall({
  columns,
  rows,
}: {
  columns: number;
  /**
   * Covers per lane — enough to overfill the masthead at this column
   * count, since `wall` crops. Lanes used to take a fixed 24 covers
   * however many lanes there were, which at seven divided 4/4/4/3/3/3/3
   * and left the four right-hand lanes short. The wall is also turned
   * nine degrees, which lifts the right side further: measured at
   * 1440x900 the rightmost lane ran out 483px above the bottom of a
   * 760px hero, which is the empty wedge under the artwork.
   */
  rows: number;
}) {
  const reduced = useReducedMotion();
  const progress = useAnimatedValue(reduced ? 1 : 0);
  /**
   * Read once per mount, the way the home feed reads it. Calling
   * `Date.now()` inside the memo below is an impure read during render:
   * the compiler is entitled to re-run the memo whenever it likes, and
   * a wall that reshuffles because something above it re-rendered is
   * the exact failure the daily seed exists to prevent.
   */
  const [today] = useState(() => Date.now());

  const { data } = useQuery({
    queryKey: queryKeys.shelf('landing-wall'),
    queryFn: () => getTrendingGames(1),
    // The whole page of forty, not a slice: the wall deals as many as
    // the lanes need and the sections below share this one response.
    select: (page: Paged<Game>) => page.results,
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

  /**
   * The pile, curated and dealt.
   *
   * Three things happen here that did not before. Covers with no
   * artwork are dropped, because CoverImage answers a missing image
   * with a branded placeholder and a heap with grey tiles punched
   * through it looks like a loading state. Duplicate titles are
   * collapsed. And the order is shuffled against a day-seeded PRNG, so
   * the wall is a different pile tomorrow instead of the same
   * twenty-four covers in the same slots for as long as RAWG's trending
   * window holds still — while staying identical all day, because a
   * wall that reshuffles under a reader mid-scroll reads as broken.
   *
   * Seeded from the date alone, not from the library: this page is the
   * one surface a stranger sees first, and it renders before anything
   * personal is loaded.
   *
   * Safe against hydration mismatch despite the date: the component
   * returns null until the query resolves, so the pre-rendered HTML
   * carries no wall at all and the first client render is the first
   * render of it anywhere.
   */
  const dealt = useMemo(() => {
    const seen = new Set<string>();
    const pool: Game[] = [];
    for (const game of data ?? []) {
      if (!game.background_image) continue;
      const key = titleKey(game.name);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(game);
    }
    if (pool.length === 0) return [];

    const next = seededRandom(dayNumber(today));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    /**
     * Which three stay lit, chosen by position rather than by index.
     *
     * The old set was three magic numbers hand-checked to fall in
     * different lanes at exactly four and seven columns. Picking a lane
     * and a row instead gives the same "three games, spread out"
     * reading at any column count, and cannot silently cluster when the
     * geometry changes. They are spread across the width and held to
     * the middle rows, where the scrim is thinnest and a survivor is
     * actually visible.
     */
    const keptSlots = new Set(
      Array.from({ length: SURVIVORS }, (_, n) => {
        const lane = Math.round(((n + 1) * (columns - 1)) / (SURVIVORS + 1));
        const row = Math.min(
          rows - 1,
          Math.floor(rows / 2) + (n % 2 === 0 ? 0 : 1)
        );
        return `${lane}:${row}`;
      })
    );

    // Dealt down the lanes rather than across them, so neighbouring
    // covers are not neighbours in the API's ordering. The pool cycles
    // when the lanes want more covers than RAWG returned; the stride
    // keeps a repeat from landing beside its twin.
    return Array.from({ length: columns }, (_, lane) =>
      Array.from({ length: rows }, (_, row) => {
        const game = shuffled[(row * columns + lane) % shuffled.length];
        return {
          game,
          key: `${lane}:${row}:${game.id}`,
          kept: keptSlots.has(`${lane}:${row}`),
        };
      })
    );
  }, [data, columns, rows, today]);

  if (!data || dealt.length === 0) return null;

  /**
   * The pile starts readable and goes out; the three stay.
   *
   * At 0.5 under a scrim that ran to 96% the whole argument was
   * invisible — the page's own thesis, drawn and then hidden. The pile
   * now opens at three quarters and fades to nothing, so the going-out
   * is something a reader can actually watch happen.
   */
  const dim = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 0.04],
  });
  const lit = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });
  /** The survivors grow a little as the rest leave. */
  const keptScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
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
            keptScale={keptScale}
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
  /**
   * Centred, not top-aligned. The lanes stretch to the wall's full
   * height while their covers stack from the top, so every point of
   * slack collected at the bottom — the one edge the hero's artwork is
   * meant to reach. Centring splits it, and the rows above absorb the
   * half that is left.
   */
  lane: { flex: 1, gap: 14, justifyContent: 'center' },
  laneOffset: { marginTop: -58 },
  slot: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  /**
   * The three that survive, made unmistakable. A two-pixel ring on a
   * cover at half opacity under a heavy scrim was a detail nobody could
   * see; this is a ring, a glow and a lift, which is what "these three"
   * has to look like for the picture to make its own argument.
   */
  kept: {
    borderWidth: 3,
    borderColor: COLORS.accent,
    boxShadow: '0 0 0 4px rgba(242,169,59,0.18), 0 14px 34px rgba(0,0,0,0.5)',
  },
});
