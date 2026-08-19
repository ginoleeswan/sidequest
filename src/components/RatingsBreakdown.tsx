import { StyleSheet, Text, View } from 'react-native';

import type { RatingBucket } from '@/api/types';
import { compact } from '@/lib/format';
import { COLORS, RATING_COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const LABELS: Record<string, string> = {
  exceptional: 'Exceptional',
  recommended: 'Recommended',
  meh: 'Meh',
  skip: 'Skip',
};

/** Community verdict as thin distribution bars. */
export function RatingsBreakdown({ ratings }: { ratings: RatingBucket[] }) {
  const total = ratings.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return null;

  return (
    <View style={styles.container}>
      {ratings.map((bucket) => (
        <View key={bucket.id} style={styles.row}>
          <Text style={styles.label}>
            {LABELS[bucket.title] ?? bucket.title}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(bucket.percent, 1.5)}%`,
                  backgroundColor: RATING_COLORS[bucket.title] ?? COLORS.blue,
                },
              ]}
            />
          </View>
          <Text style={styles.count}>{compact(bucket.count)}</Text>
        </View>
      ))}
      <Text style={styles.total}>{compact(total)} player ratings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  label: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
    width: 96,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  count: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    width: 44,
    textAlign: 'right',
  },
  total: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xs,
  },
});
