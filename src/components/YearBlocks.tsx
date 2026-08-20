import { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MONTH_INITIALS } from '@/lib/memcard';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING } from '@/styles/motion';
import { TYPE } from '@/styles/typography';

/** Four is as tall as a month gets before the card stops being readable. */
const ROWS = 4;

/**
 * The year, as blocks — and the one that just landed.
 *
 * The memcard is the only object this app owns: twelve columns, one per
 * month, one block per game you saw the end of. It is on the share card
 * and on the link preview, and until now it was nowhere near the moment
 * that actually creates a block.
 *
 * So finishing something puts it here, in front of you, and the new
 * block arrives last and alone. That is the whole payoff: not applause,
 * but a year with one more mark on it than it had a minute ago.
 */
export function YearBlocks({
  months,
  landed,
}: {
  /** Games finished per month, January first. */
  months: number[];
  /** The month that just gained one, or null for a still year. */
  landed: number | null;
}) {
  const reduced = useReducedMotion();
  const drop = useAnimatedValue(reduced || landed == null ? 1 : 0);

  useEffect(() => {
    if (reduced || landed == null) {
      drop.setValue(1);
      return;
    }
    const animation = Animated.timing(drop, {
      toValue: 1,
      duration: DURATION.slow,
      delay: DURATION.base,
      easing: EASING.standard,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [drop, landed, reduced]);

  return (
    <View style={styles.grid}>
      {months.map((count, month) => (
        <View key={month} style={styles.column}>
          {Array.from({ length: ROWS }, (_, row) => {
            // Rows stack upward, so the newest block is the top filled one.
            const height = ROWS - 1 - row;
            const filled = height < Math.min(count, ROWS);
            const isNew =
              landed === month && height === Math.min(count, ROWS) - 1;
            return (
              <Animated.View
                key={row}
                testID={filled ? 'year-block-on' : 'year-block-off'}
                style={[
                  styles.block,
                  filled && styles.filled,
                  isNew && {
                    opacity: drop,
                    transform: [
                      {
                        scale: drop.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })}
          <Animated.Text style={styles.month}>
            {MONTH_INITIALS[month]}
          </Animated.Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  column: { gap: 3, alignItems: 'center' },
  block: {
    width: 12,
    height: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  filled: { backgroundColor: COLORS.accent },
  month: {
    ...TYPE.fine,
    fontSize: 8,
    lineHeight: 12,
    color: COLORS.mediumGrey,
  },
});
