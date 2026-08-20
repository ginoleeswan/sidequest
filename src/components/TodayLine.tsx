import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getOutTodayCount } from '@/api/rawg';
import { useHydrated } from '@/hooks/useHydrated';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Today's date, and what came out on it.
 *
 * The single cheapest way to make a page feel alive is for it to know
 * what day it is. Nothing else on this storefront could tell you whether
 * you were looking at it this morning or last month.
 *
 * Gated on hydration, and not optionally: the HTML is pre-rendered at
 * build time, so a date baked into it is wrong by the next morning and
 * every render after that is a hydration mismatch.
 */
export function TodayLine({ inset = SPACING.md }: { inset?: number }) {
  const hydrated = useHydrated();
  const [now] = useState(() => Date.now());

  const today = useQuery({
    queryKey: ['out-today', new Date(now).toDateString()],
    queryFn: getOutTodayCount,
    enabled: hydrated,
    staleTime: 60 * 60 * 1000,
  });

  if (!hydrated) return null;

  const date = new Date(now).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const count = today.data ?? 0;

  return (
    <View style={[styles.row, { paddingHorizontal: inset }]}>
      <Text style={styles.date}>{date}</Text>
      {count > 0 && (
        <>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.count}>
            {count === 1 ? '1 game out today' : `${count} games out today`}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  date: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
  },
  dot: {
    ...TYPE.micro,
    color: COLORS.stroke,
  },
  count: {
    ...TYPE.micro,
    color: COLORS.accent,
  },
});
