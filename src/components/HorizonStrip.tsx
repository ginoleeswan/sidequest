import { StyleSheet, Text, View } from 'react-native';

import { planColour } from '@/lib/planColours';
import type { ScheduledItem } from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { TYPE } from '@/styles/typography';

/**
 * The month, as a horizon rather than a grid.
 *
 * A month view's whole question is "when do the credits land, and does
 * everything fit?" — about two facts per game. A 30-box calendar grid
 * answers it with 26 empty boxes, and empty boxes in a calendar read
 * as obligation: days you failed to fill. This app promised never to
 * say that (§2.1), so the month is drawn as the only shape its facts
 * actually have — a timeline.
 *
 * TODAY is anchored at the left. The spine runs to the horizon in the
 * plan's colours, one span per game in route order, so the SEQUENCE is
 * visible — a thing no grid can show. Where a game's credits land, a
 * save-slot chip is planted on the spine with its date, memcard-style,
 * because finishing a game in this app is a save worth stamping. And a
 * deadline the plan cannot meet sits above the spine as coral weather:
 * you can see the date arriving before the game's span can — the
 * geometry of "won't make it", with no sentence needed. (The sentence,
 * and the ways out, live in "What doesn't fit".)
 */

const DAY = 24 * 60 * 60 * 1000;

/** A deadline the plan cannot meet, drawn on the date it names. */
export interface TroubledDate {
  id: number;
  name: string;
  deadline: number;
}

const dateLabel = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Flags drop to a lower line when the one before stands too close —
 * two dates a few days apart would otherwise print on top of each
 * other. Walked in order, greedily: a flag takes the near line when it
 * is clear, the far line otherwise. (A plain function, not inline in
 * render — the walk carries state between flags.)
 */
function layFlags(scheduled: ScheduledItem[], at: (t: number) => number) {
  let lastNear = -100;
  let lastFar = -100;
  return scheduled.map((item, index) => {
    const pct = at(item.finishAt);
    const far = pct - lastNear < 24 && pct - lastFar >= 24;
    if (far) lastFar = pct;
    else lastNear = pct;
    return { item, pct, far, colour: planColour(index) };
  });
}

export function HorizonStrip({
  scheduled,
  now,
  troubled = [],
}: {
  scheduled: ScheduledItem[];
  now: number;
  troubled?: TroubledDate[];
}) {
  if (scheduled.length === 0) return null;

  const lastFinish = scheduled[scheduled.length - 1].finishAt;
  /**
   * The horizon: past the last landing, past any troubled date, and
   * never under two weeks — a plan that finishes on Thursday should
   * still read as a stretch of time, not a wall at the edge.
   */
  const latest = Math.max(
    lastFinish,
    ...troubled.map((t) => t.deadline),
    now + 14 * DAY
  );
  const end = latest + Math.max((latest - now) * 0.08, 2 * DAY);
  const span = end - now;
  /** Clamped in from the edges so a label centred here stays legible. */
  const at = (t: number) => Math.min(92, Math.max(8, ((t - now) / span) * 100));

  const flags = layFlags(scheduled, at);

  const summary =
    `Credits land: ${scheduled
      .map((item) => `${item.name} ${dateLabel(item.finishAt)}`)
      .join(', ')}.` +
    troubled
      .map((t) => ` ${t.name}’s date, ${dateLabel(t.deadline)}, can’t be met.`)
      .join('');

  return (
    <View
      style={styles.strip}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
    >
      <Text style={styles.today}>TODAY</Text>

      {/* The coral weather, above the spine: a date bearing down. The
          diamond stands on the date; its label reads off to the right,
          clear of TODAY's own band. */}
      {troubled.map((t) => (
        <View
          key={t.id}
          style={[styles.trouble, { left: `${at(t.deadline)}%` }]}
        >
          <View style={styles.troubleMark}>
            <View style={styles.troubleDiamond} />
            <Text style={styles.troubleDate} numberOfLines={1}>
              {dateLabel(t.deadline)}
            </Text>
          </View>
          <View style={styles.troubleStem} />
        </View>
      ))}

      {/* The spine: the month in route order, then open time. */}
      <View style={styles.spine}>
        {scheduled.map((item, index) => (
          <View
            key={item.id}
            style={{
              flex:
                item.finishAt -
                (index === 0 ? now : scheduled[index - 1].finishAt),
              backgroundColor: planColour(index),
            }}
          />
        ))}
        <View style={{ flex: Math.max(end - lastFinish, span * 0.02) }} />
      </View>

      {/* One save-slot per landing, planted on its date. */}
      {flags.map(({ item, pct, far, colour }) => (
        <View key={item.id} style={[styles.flag, { left: `${pct}%` }]}>
          <View style={[styles.slot, { backgroundColor: colour }]}>
            <View style={styles.slotNotch} />
          </View>
          <View style={[styles.stem, far && styles.stemFar]} />
          <Text style={styles.flagDate} numberOfLines={1}>
            {dateLabel(item.finishAt)}
          </Text>
          <Text style={styles.flagName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Absolute geography: the spine at a fixed height, everything else
   * hung off it by percentage. Tall enough for the far label line.
   */
  strip: { height: 108, position: 'relative' },
  today: {
    ...TYPE.micro,
    color: COLORS.accent,
    letterSpacing: 1,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  spine: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
  },

  /**
   * A flag hangs from a zero-width anchor at its date, children
   * centred across it — which is how a label centres on a point
   * without measuring itself.
   */
  /** Centred on the date: real width, offset by half — see `trouble`. */
  flag: {
    position: 'absolute',
    top: 30,
    width: 84,
    marginLeft: -42,
    alignItems: 'center',
  },
  /** The save slot: a memcard chip with its corner chamfered off. */
  slot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    overflow: 'hidden',
  },
  slotNotch: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 9,
    height: 9,
    backgroundColor: COLORS.navy,
    transform: [{ rotate: '45deg' }],
  },
  stem: { width: 2, height: 6, backgroundColor: COLORS.strokeStrong },
  /** The lower line, for a date standing too close to its neighbour. */
  stemFar: { height: 26 },
  flagDate: {
    ...TYPE.labelTiny,
    color: COLORS.lightGrey,
    textAlign: 'center',
    marginTop: 2,
  },
  flagName: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },

  /**
   * Anchored by its left edge on the date, pulled back by half the
   * diamond so the diamond stands on the day itself. A zero-width
   * anchor would be tidier, but react-native-web clamps a Text inside
   * one to its parent's width — which is nothing — so the labels
   * vanish. Real widths, offset by half, land in the same place.
   */
  trouble: { position: 'absolute', top: 16, width: 120, marginLeft: -6 },
  troubleMark: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  troubleDate: { ...TYPE.micro, color: COLORS.coral },
  troubleDiamond: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.coral,
    transform: [{ rotate: '45deg' }],
  },
  troubleStem: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.coral,
    opacity: 0.5,
    marginTop: 2,
    marginLeft: 3,
  },
});
