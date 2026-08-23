import { StyleSheet, Text, View } from 'react-native';

import type { RatingBucket } from '@/api/types';
import { compact } from '@/lib/format';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const LABELS: Record<string, string> = {
  exceptional: 'Exceptional',
  recommended: 'Recommended',
  meh: 'Meh',
  skip: 'Skip',
};

/**
 * Down the scale, not down the leaderboard.
 *
 * RAWG returns the buckets in count order, so the rows moved every time
 * you opened a different game — exceptional third here, first there —
 * and the one thing a distribution is for, comparing its shape against
 * another, was impossible. A scale reads top to bottom.
 */
const ORDER = ['exceptional', 'recommended', 'meh', 'skip'];

/**
 * The app's own palette, not the four-colour set this arrived with.
 *
 * Blue, yellow, green and red made the loudest thing on a game page a
 * third-party rating widget, in colours that appear nowhere else in the
 * product. These are the semantics the rest of the app already speaks:
 * mint is finishing something, amber is worth your time, coral is
 * letting go, and grey is a shrug.
 */
const BAR_COLORS: Record<string, string> = {
  exceptional: COLORS.mint,
  recommended: COLORS.accent,
  meh: COLORS.mediumGrey,
  skip: COLORS.coral,
};

/** Community verdict as thin distribution bars. */
export function RatingsBreakdown({ ratings }: { ratings: RatingBucket[] }) {
  const total = ratings.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return null;

  const ordered = [...ratings].sort(
    (a, b) => ORDER.indexOf(a.title) - ORDER.indexOf(b.title)
  );

  return (
    <View style={styles.container}>
      {ordered.map((bucket) => (
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
                  backgroundColor:
                    BAR_COLORS[bucket.title] ?? COLORS.mediumGrey,
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
