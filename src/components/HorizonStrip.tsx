import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { planColour } from '@/lib/planColours';
import type { ScheduledItem } from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
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
 * TODAY stands on the spine. Ahead of it the spine runs to the horizon
 * in the plan's colours, one span per game in route order, so the
 * SEQUENCE is visible — a thing no grid can show. Where a game's
 * credits land, a save-slot chip is planted on the spine with its date,
 * memcard-style, because finishing a game in this app is a save worth
 * stamping. And a deadline the plan cannot meet sits above the spine as
 * coral weather: you can see the date arriving before the game's span
 * can — the geometry of "won't make it", with no sentence needed. (The
 * sentence, and the ways out, live in "What doesn't fit".)
 *
 * BEHIND today, the same strip carries what already landed: games
 * finished in the last three weeks, their slots stamped mint. This is
 * the one thing on the page that is not a plan, and it earns its place
 * for exactly that reason — a timeline with only a future on it is a
 * schedule, and a schedule is a thing you owe. With the last few
 * credits still on it, it is a life: you finished Hades a fortnight
 * ago, Tunic is a fortnight out. The memcard (§7) makes the yearly
 * version of this argument; the strip makes the monthly one.
 *
 * Four landings ahead, at most. A backlog of twenty games would print
 * twenty flags into three hundred points of width and the strip would
 * say nothing at all — so the near ones are drawn and the rest are
 * counted in a sentence. A horizon you cannot see past is still a
 * horizon; one that pretends there is nothing past it is a lie.
 */

const DAY = 24 * 60 * 60 * 1000;

/** As many landings as a phone's width can name without crushing them. */
const SHOWN = 4;

/**
 * How far back the strip remembers, and how much it remembers.
 *
 * Three weeks matches the alerts' own horizon, so the app looks the
 * same distance in both directions; two stamps is enough to say "this
 * has been going well" without the past out-weighing the plan.
 */
const LOOK_BACK_DAYS = 21;
const LANDED_SHOWN = 2;

/** A deadline the plan cannot meet, drawn on the date it names. */
export interface TroubledDate {
  id: number;
  name: string;
  deadline: number;
}

/** A game whose credits already rolled — a slot with a stamp on it. */
export interface Landed {
  id: number;
  name: string;
  finishedAt: number;
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
function layFlags(
  marks: { key: number; date: number }[],
  at: (t: number) => number
) {
  let lastNear = -100;
  let lastFar = -100;
  return marks.map(({ key, date }) => {
    const pct = at(date);
    const far = pct - lastNear < 24 && pct - lastFar >= 24;
    if (far) lastFar = pct;
    else lastNear = pct;
    return { key, pct, far };
  });
}

/** The stamps and the flags share one line, so they lay out together. */
function layAll(
  landed: Landed[],
  near: ScheduledItem[],
  at: (t: number) => number
) {
  const rows = layFlags(
    [
      ...landed.map((item) => ({ key: item.id, date: item.finishedAt })),
      ...near.map((item) => ({ key: item.id, date: item.finishAt })),
    ],
    at
  );
  return {
    landed: landed.map((item, index) => ({ item, ...rows[index] })),
    ahead: near.map((item, index) => ({
      item,
      ...rows[landed.length + index],
      colour: planColour(index),
    })),
  };
}

export function HorizonStrip({
  scheduled,
  now,
  troubled = [],
  landed = [],
}: {
  scheduled: ScheduledItem[];
  now: number;
  troubled?: TroubledDate[];
  /**
   * What already landed, newest last. Filtered and capped here rather
   * than by every caller, so the plan page and the widget agree on how
   * much past a month is allowed to carry.
   */
  landed?: Landed[];
}) {
  if (scheduled.length === 0) return null;

  const recent = landed
    .filter(
      (item) =>
        item.finishedAt <= now && item.finishedAt >= now - LOOK_BACK_DAYS * DAY
    )
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .slice(-LANDED_SHOWN);

  const near = scheduled.slice(0, SHOWN);
  const beyond = scheduled.slice(SHOWN);
  const lastFinish = near[near.length - 1].finishAt;
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
  /**
   * The axis starts at the oldest stamp rather than at today, and the
   * past keeps its true proportion: a game finished three days ago sits
   * three days back. Compressing the past to a fixed slice would be
   * tidier and would be a lie about a picture whose whole claim is
   * that distance means time.
   */
  const start = recent.length ? Math.min(now, recent[0].finishedAt) - DAY : now;
  const span = end - start;
  /** Clamped in from the edges so a label centred here stays legible. */
  const at = (t: number) =>
    Math.min(86, Math.max(10, ((t - start) / span) * 100));
  /** TODAY's label reads rightwards from its tick, so it needs no room. */
  const todayAt = Math.min(88, Math.max(0, ((now - start) / span) * 100));

  const marks = layAll(recent, near, at);

  /** What the strip could not draw, said rather than dropped. */
  const rest = beyond.length
    ? ` ${beyond.length} more after that, the last around ${dateLabel(
        scheduled[scheduled.length - 1].finishAt
      )}.`
    : '';

  const summary =
    (recent.length
      ? `Already finished: ${recent
          .map((item) => `${item.name} ${dateLabel(item.finishedAt)}`)
          .join(', ')}. `
      : '') +
    `Credits land: ${near
      .map((item) => `${item.name} ${dateLabel(item.finishAt)}`)
      .join(', ')}.` +
    rest +
    troubled
      .map((t) => ` ${t.name}’s date, ${dateLabel(t.deadline)}, can’t be met.`)
      .join('');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={styles.strip}>
        {/* TODAY, standing on the spine rather than floating at the
            left — with stamps behind it, the left edge is three weeks
            ago and labelling it today would be the one outright lie
            the picture could tell. */}
        <View style={[styles.today, { left: `${todayAt}%` }]}>
          <Text style={styles.todayText}>TODAY</Text>
          <View style={styles.todayTick} />
        </View>

        {/* The coral weather, above the spine: a date bearing down. The
            diamond stands on the date; its label reads off to the
            right, clear of TODAY's own band. */}
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

        {/* The spine: what is behind, then the month in route order,
            then open time. */}
        <View style={styles.spine}>
          {recent.length > 0 && (
            <View style={[styles.done, { flex: now - start }]} />
          )}
          {near.map((item, index) => (
            <View
              key={item.id}
              style={{
                flex:
                  item.finishAt -
                  (index === 0 ? now : near[index - 1].finishAt),
                backgroundColor: planColour(index),
              }}
            />
          ))}
          <View style={{ flex: Math.max(end - lastFinish, span * 0.02) }} />
        </View>

        {/* Behind today: slots already stamped. Mint, because mint is
            what finishing looks like everywhere in this app. */}
        {marks.landed.map(({ item, pct, far }) => (
          <View
            key={`done-${item.id}`}
            style={[styles.flag, { left: `${pct}%` }]}
          >
            <View style={[styles.slot, styles.slotDone]}>
              <Ionicons name="checkmark" size={11} color={COLORS.navy} />
            </View>
            <View style={[styles.stem, far && styles.stemFar]} />
            <Text style={styles.flagDate} numberOfLines={1}>
              {dateLabel(item.finishedAt)}
            </Text>
            <Text style={styles.flagName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ))}

        {/* Ahead: one save-slot per landing, planted on its date. */}
        {marks.ahead.map(({ item, pct, far, colour }) => (
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

      {beyond.length > 0 && (
        <Text style={styles.beyond}>
          + {beyond.length} more after that, the last around{' '}
          {dateLabel(scheduled[scheduled.length - 1].finishAt)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Absolute geography: the spine at a fixed height, everything else
   * hung off it by percentage. Tall enough for the far label line.
   */
  strip: { height: 108, position: 'relative' },
  /** Anchored on its tick, reading rightwards — see `trouble`. */
  today: { position: 'absolute', top: 8, width: 80, marginLeft: -1 },
  todayText: { ...TYPE.micro, color: COLORS.accent, letterSpacing: 1 },
  todayTick: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.accent,
    marginTop: 2,
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
  /** What is behind you, in the colour of finishing, quietly. */
  done: { backgroundColor: COLORS.mint, opacity: 0.35 },

  /**
   * Anchored by its left edge on the date, pulled back by half its
   * width so the slot stands on the day itself. A zero-width anchor
   * would be tidier, but react-native-web clamps a Text inside one to
   * its parent's width — which is nothing — so the labels vanish. Real
   * widths, offset by half, land in the same place.
   */
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Stamped: the save is written, and mint is what that looks like. */
  slotDone: { backgroundColor: COLORS.mint },
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

  /**
   * Under the strip and OUTSIDE it, on a line of its own: absolutely
   * positioned inside the strip it landed on the lower label row, and
   * a sentence printed through a game's name is worse than no
   * sentence.
   */
  beyond: { ...TYPE.micro, color: COLORS.mediumGrey, marginTop: SPACING.sm },
});
