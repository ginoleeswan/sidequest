import { StyleSheet, Text, View } from 'react-native';

import type { RatingBucket } from '@/api/types';
import { compact } from '@/lib/format';
import { COLORS, alpha } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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
 * One grey, at three strengths, and coral on the one bar that means it.
 *
 * Blue, yellow, green and red made the loudest thing on a game page a
 * third-party rating widget. The fix after that borrowed the app's own
 * colours as a traffic light — mint for exceptional, amber for
 * recommended — which spent the words this app speaks in on somebody
 * else's opinion: mint is finishing, amber is time, and a rating is
 * neither. A ramp says what the rows are, a scale from more to less,
 * and leaves the colours their meanings. "Skip" is the one bucket that
 * is a verdict of letting go, so it alone is coral.
 */
const BAR_COLORS: Record<string, string> = {
  exceptional: COLORS.lightGrey,
  recommended: alpha(COLORS.lightGrey, 0.7),
  meh: alpha(COLORS.lightGrey, 0.4),
  skip: COLORS.coral,
};

/**
 * The finding, the evidence, and where it came from.
 *
 * Four bars and a count is a chart, and a chart makes the reader do the
 * arithmetic. The question anybody actually brings to this page is
 * whether the hours are worth spending, so the block leads with the
 * only number that answers it — the share who rated it recommended or
 * better — and keeps the distribution underneath for anyone who wants
 * to see the shape rather than take the summary.
 *
 * Phrased as what the buckets literally are. "Worth finishing" would be
 * a nicer sentence and a claim RAWG's data does not make.
 */
export function RatingsBreakdown({
  ratings,
  lead = true,
}: {
  ratings: RatingBucket[];
  /** Whether to open on the share figure, or leave that to the caller. */
  lead?: boolean;
}) {
  const total = ratings.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return null;

  const ordered = [...ratings].sort(
    (a, b) => ORDER.indexOf(a.title) - ORDER.indexOf(b.title)
  );

  const liked = ratings
    .filter((r) => r.title === 'exceptional' || r.title === 'recommended')
    .reduce((sum, r) => sum + r.count, 0);
  const share = Math.round((liked / total) * 100);

  return (
    <View style={styles.container}>
      {lead ? (
        <>
          <View style={styles.lead}>
            {/* Neutral, whatever the number. A share coloured by how
                good it is was a traffic light in the app's semantic
                colours; the figure's size already says it matters. */}
            <Text
              style={styles.share}
              maxFontSizeMultiplier={FONT_SCALE.figure}
            >
              {share}%
            </Text>
            <Text style={styles.shareLabel}>
              rated it recommended or better
            </Text>
          </View>
          <View style={styles.rule} />
        </>
      ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.sm },
  lead: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  share: { ...TYPE.figure, color: COLORS.lightGrey },
  shareLabel: { ...TYPE.body, color: COLORS.lightGrey, flexShrink: 1 },
  rule: {
    height: 1,
    backgroundColor: COLORS.stroke,
    marginVertical: SPACING.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm2 },
  label: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
    width: 96,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.stroke,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  count: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    width: 44,
    textAlign: 'right',
  },
});
