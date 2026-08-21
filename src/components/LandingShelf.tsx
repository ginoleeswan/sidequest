import { useEffect } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { GameTile } from './GameTile';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPACING } from '@/styles/theme';

/**
 * A shelf that is always moving.
 *
 * Every other piece of motion on this page is a response to the reader —
 * something arrives because they reached it, or drifts because they
 * scrolled. That is a page that answers. A page that is *alive* also has
 * something going on when nobody is doing anything, and this is the only
 * place here that does: the pile drifts past at reading pace whether it
 * is being watched or not.
 *
 * It also happens to be the honest picture of the thing being described.
 * The claim is that there are more of these than you will ever finish;
 * a row that ends politely at the edge of the screen argues against it,
 * and a row with no end at all does not.
 *
 * Seamless by doubling: the same tiles are drawn twice and the track
 * travels exactly one copy's width before resetting, so the reset lands
 * on an identical frame and there is no seam to see. Linear, because an
 * eased loop visibly slows down at the join, which is precisely where a
 * loop must not draw attention to itself.
 */
const PACE = 42; // points per second — a slow walk, not a carousel.

export function LandingShelf({
  games,
  width = 168,
}: {
  games: Game[];
  width?: number;
}) {
  const reduced = useReducedMotion();
  const travel = useAnimatedValue(0);
  const step = width + SPACING.md;
  const span = games.length * step;

  useEffect(() => {
    if (reduced || Platform.OS !== 'web' || span === 0) return;
    const loop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: (span / PACE) * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [travel, span, reduced]);

  if (games.length === 0) return null;

  const shift = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -span],
  });

  return (
    <View style={styles.window}>
      <Animated.View
        style={[styles.track, { transform: [{ translateX: shift }] }]}
      >
        {/* Twice. The second pass is what the first one resets into. */}
        {[...games, ...games].map((game, index) => (
          <GameTile key={`${game.id}-${index}`} game={game} width={width} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clipped, not wrapped. The point of the row is that it does not end
  // where the screen does.
  window: { overflow: 'hidden' },
  track: { flexDirection: 'row', gap: SPACING.md },
});
