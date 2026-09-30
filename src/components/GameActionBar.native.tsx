import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FinishCelebration } from './FinishCelebration';
import { PrimaryButton } from './PrimaryButton';
import { CONFIRM } from './StatusActions';
import { useToast } from './Toast';
import type { Game } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import type { Haptic } from '@/lib/haptics';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS, alpha } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { ICON, LAYOUT, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/** The bar's own height above the home indicator: a 48pt button and air. */
export const ACTION_BAR_HEIGHT = 48 + SPACING.sm2 * 2;

/**
 * The one step forward from where the game stands.
 *
 * Not the three-way control the decision draws: in a bar that shares
 * its width with the hours, three segments are three 70pt guesses. What
 * a reader scrolled deep into a page wants in reach is the next thing
 * to do — save it, start it, finish it — and a finished game has
 * nothing left to press.
 */
const NEXT: Record<
  LibraryStatus | 'none',
  { status: LibraryStatus; label: string; haptic: Haptic } | null
> = {
  // Saving lands like a save; the other two are a state changing.
  none: { status: 'wishlist', label: 'Want to play', haptic: 'impact' },
  wishlist: { status: 'playing', label: 'Playing it now', haptic: 'tap' },
  playing: { status: 'finished', label: 'Finished it', haptic: 'tap' },
  finished: null,
};

/**
 * The game page's pinned foot: the hours, and the next step.
 *
 * The page runs to about 3,500 points and used to keep nothing in
 * reach — by the verdict, the figure the page is about and the button
 * that acts on it were both three screens up. Once the decision has
 * scrolled away this slides up with the two things worth keeping: how
 * long, and what now. It goes again near the top, where the real ones
 * are on screen and a second copy would be the same control twice.
 *
 * Slides on the native driver, so it rides the scroll without asking
 * the JS thread for frames; under Reduce Motion it fades in place.
 */
export function GameActionBar({
  game,
  visible,
}: {
  game: Game;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const shown = useAnimatedValue(0);
  const { statusOf, setStatus } = useLibrary();
  const { durationOf } = useDurations();
  const toast = useToast();
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const animation = Animated.timing(shown, {
      toValue: visible ? 1 : 0,
      duration: DURATION.base,
      easing: visible ? EASING.standard : EASING.exit,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [visible, shown]);

  const status = statusOf(game.id);
  const next = NEXT[status ?? 'none'];
  const duration = durationOf(game);
  const known = duration.hours > 0;
  const travel = ACTION_BAR_HEIGHT + insets.bottom;

  const act = () => {
    if (!next) return;
    setStatus(game, next.status);
    if (next.status === 'finished') {
      setCelebrating(true);
      return;
    }
    toast(CONFIRM[next.status], STATUS_META[next.status].icon as never);
  };

  return (
    <>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.bar,
          { paddingBottom: insets.bottom + SPACING.sm2 },
          reduced
            ? { opacity: shown }
            : {
                transform: [
                  {
                    translateY: shown.interpolate({
                      inputRange: [0, 1],
                      outputRange: [travel, 0],
                    }),
                  },
                ],
              },
        ]}
      >
        <View style={styles.inner}>
          <View
            style={styles.hours}
            accessible
            accessibilityLabel={
              known
                ? `${formatHours(duration.hours)} to finish`
                : 'Length not known yet'
            }
          >
            <Text
              style={[styles.figure, !known && styles.figureUnknown]}
              numberOfLines={1}
              maxFontSizeMultiplier={FONT_SCALE.figure}
            >
              {known ? formatHours(duration.hours) : '—'}
            </Text>
            <Text
              style={styles.caption}
              numberOfLines={1}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              to finish
            </Text>
          </View>
          {next ? (
            <PrimaryButton
              label={next.label}
              haptic={next.haptic}
              onPress={act}
              style={styles.action}
            />
          ) : (
            <View style={styles.done}>
              <Ionicons
                name="checkmark-circle"
                size={ICON.md}
                color={COLORS.mint}
              />
              <Text style={styles.doneText}>Finished</Text>
            </View>
          )}
        </View>
      </Animated.View>
      <FinishCelebration
        game={celebrating ? game : null}
        onClose={() => setCelebrating(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingTop: SPACING.sm2,
    paddingHorizontal: SPACING.md,
    // The sheet colour, nearly solid: the page scrolls under it, and a
    // bar the prose shows through is a bar nobody can read.
    backgroundColor: alpha(COLORS.inkSurface, 0.97),
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  hours: { flex: 1, minWidth: 0 },
  figure: { ...TYPE.figureSmall, color: COLORS.accent },
  figureUnknown: { color: COLORS.mediumGrey },
  caption: { ...TYPE.fine, color: COLORS.mediumGrey },
  action: { flexShrink: 0 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: 48,
  },
  doneText: { ...TYPE.label, color: COLORS.mint },
});
