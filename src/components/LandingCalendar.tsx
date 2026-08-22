import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Rise } from './Rise';
import { Words } from './Words';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import { LANDING_WELL, type LandingScale } from '@/styles/landing';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The plan, in the calendar the reader already keeps.
 *
 * This is the beat the page was missing. Every section above it argues
 * inside the app: here is your pile, here is what fits Tuesday, here is
 * the year you finished. All of it is true and all of it dies when the
 * tab closes — a plan that does not appear where somebody looks for
 * their week is a suggestion, which is the app's own words for it in
 * `lib/ics.ts`.
 *
 * So the picture is not the app. Drawing Sidequest's week view again
 * would say "we have a screen for this"; what the feature actually does
 * is put amber blocks into a calendar full of somebody else's meetings.
 * The grey blocks are the life already in there, and they are the point
 * — the evenings land BETWEEN them, at eight, only on the nights that
 * survived the arithmetic. Free nights stay free, because filing
 * "nothing" in a person's calendar is not the same gesture as showing
 * them a free Tuesday here.
 *
 * The privacy line is the honest reason for the shape of it, not a
 * boast bolted on: this is an `.ics` file and a native calendar write
 * precisely BECAUSE a Google or Apple integration needs OAuth, and OAuth
 * needs a server and an account — the one thing the app promises never
 * to grow. The feature proves the promise instead of sitting beside it.
 */

/** Evenings the plan claims, Monday-first, matched to the blocks below. */
const PLANNED = [
  { day: 1, label: 'Tue', hours: 2 },
  { day: 3, label: 'Thu', hours: 3 },
  { day: 5, label: 'Sat', hours: 4 },
];

/**
 * The week somebody already had before this app turned up.
 *
 * Deliberately dull and deliberately in the way — standups, a dentist,
 * a birthday. Without them the grid is an empty week nobody recognises,
 * and the amber blocks are just the app talking to itself again.
 */
const EXISTING = [
  { day: 0, top: 12, height: 16 },
  { day: 0, top: 46, height: 12 },
  { day: 1, top: 20, height: 14 },
  { day: 2, top: 14, height: 22 },
  { day: 2, top: 52, height: 10 },
  { day: 3, top: 30, height: 12 },
  { day: 4, top: 18, height: 18 },
  { day: 4, top: 48, height: 14 },
  { day: 6, top: 24, height: 12 },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function LandingCalendar({
  scale,
  games,
}: {
  scale: LandingScale;
  games?: Game[];
}) {
  // Real titles, like every other illustration on this page. The plan is
  // only interesting if the things in it are things.
  const named = PLANNED.map((evening, index) => ({
    ...evening,
    name: games?.[index + 5]?.name ?? 'Something you own',
  }));

  return (
    <View style={scale.wide ? styles.wide : undefined}>
      <View style={scale.wide ? styles.copy : styles.copyStack}>
        <Words text="Then it leaves." style={[styles.lead, scale.lead]} />
        <Rise delay={90}>
          <Text style={[styles.body, scale.body]}>
            The evenings go into the calendar you already keep — at eight, on
            the nights that survived. The free ones stay free.
          </Text>
        </Rise>
        <Rise delay={150}>
          {/* The claim that costs something to make, so it is made
              plainly and with its limit attached. */}
          <View style={styles.proofRow}>
            <Ionicons name="shield" size={15} color={COLORS.accent} />
            <Text style={[styles.proof, scale.body]}>
              No account to connect. A calendar integration needs OAuth, and
              OAuth needs a server — so this is a file your device writes.
            </Text>
          </View>
        </Rise>
        <Rise delay={210}>
          {/* Named in words, never as logos.
              A row of Google and Apple marks is the visual grammar of
              "we integrate with these", which is the one thing this
              feature deliberately is not — the paragraph above says so
              in the same breath. It would also undersell it: `.ics` is
              not two calendars, it is every calendar, and showing two
              makes a universal thing look like it supports a pair. Both
              companies restrict their marks to real integrations, so the
              honest version and the permitted version are the same
              sentence. */}
          <Text style={[styles.opens, scale.body]}>
            Opens in Google Calendar, Apple Calendar, Outlook — anything that
            reads a <Text style={styles.mono}>.ics</Text> file.
          </Text>
        </Rise>
        <Rise delay={260}>
          <Text style={styles.caveat}>
            A snapshot, not a live feed. Re-export when the plan changes.
          </Text>
        </Rise>
      </View>

      <Rise
        from="lift"
        delay={120}
        style={scale.wide ? styles.artWide : undefined}
      >
        <View style={styles.grid}>
          {/* The calendar's own furniture, quiet: this is somebody
              else's app, and it should look like it. */}
          <View style={styles.gridHead}>
            {DAYS.map((day) => (
              <Text key={day} style={styles.dayName}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.gridBody}>
            {DAYS.map((day, index) => (
              <View key={day} style={styles.column}>
                {EXISTING.filter((slot) => slot.day === index).map(
                  (slot, at) => (
                    <View
                      key={at}
                      style={[
                        styles.busy,
                        { top: `${slot.top}%`, height: `${slot.height}%` },
                      ]}
                    />
                  )
                )}
              </View>
            ))}
            {/* Absolute over the columns rather than inside them, so an
                evening's label can run past its own day the way a real
                calendar event does. */}
            {named.map((evening) => (
              <View
                key={evening.day}
                style={[
                  styles.evening,
                  {
                    left: `${(evening.day * 100) / DAYS.length}%`,
                    width: `${100 / DAYS.length}%`,
                    top: '66%',
                    height: `${evening.hours * 7}%`,
                  },
                ]}
              >
                <View style={styles.eveningInner}>
                  <Text style={styles.eveningTime}>20:00</Text>
                  <Text style={styles.eveningName} numberOfLines={2}>
                    {evening.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          {/* The calendar's own legend, which is where the app's name
              actually appears in a person's week — one checkbox to hide,
              one deletion to take back. */}
          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendWord}>Sidequest</Text>
            <Text style={styles.legendRest}>· your other calendars</Text>
          </View>
        </View>
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl * 2,
  },
  copy: { flex: 1, gap: SPACING.md },
  copyStack: { gap: SPACING.md, marginBottom: SPACING.xl },
  artWide: { flex: 1 },
  lead: { color: COLORS.white, maxWidth: 520 },
  body: { color: COLORS.mediumGrey, maxWidth: 480 },
  proofRow: { flexDirection: 'row', gap: SPACING.sm, maxWidth: 480 },
  proof: { color: COLORS.lightGrey, flex: 1 },
  opens: { color: COLORS.mediumGrey, maxWidth: 480 },
  mono: { fontFamily: 'Noah-Bold', color: COLORS.lightGrey },
  caveat: { ...TYPE.micro, color: COLORS.mediumGrey },

  grid: {
    backgroundColor: LANDING_WELL,
    borderRadius: RADIUS.lg - 2,
    borderWidth: 1.5,
    borderColor: COLORS.strokeStrong,
    padding: SPACING.md,
    gap: SPACING.sm,
    boxShadow: '0 18px 40px rgba(9,12,19,0.42)',
  },
  gridHead: { flexDirection: 'row' },
  dayName: {
    ...TYPE.micro,
    flex: 1,
    textAlign: 'center',
    color: COLORS.mediumGrey,
  },
  gridBody: {
    flexDirection: 'row',
    height: 250,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
    paddingTop: SPACING.sm,
  },
  column: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.045)',
  },
  /** Someone else's week: present, unreadable, and none of our business. */
  busy: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  evening: { position: 'absolute', paddingHorizontal: 3 },
  eveningInner: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(242,169,59,0.22)',
    borderLeftWidth: 2.5,
    borderLeftColor: COLORS.accent,
    overflow: 'hidden',
  },
  eveningTime: {
    ...TYPE.micro,
    fontSize: 9,
    letterSpacing: 0.6,
    color: COLORS.accent,
  },
  eveningName: {
    ...TYPE.label,
    fontSize: 12,
    lineHeight: 15,
    color: COLORS.white,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm - 2 },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  legendWord: { ...TYPE.micro, color: COLORS.lightGrey },
  legendRest: { ...TYPE.micro, color: COLORS.mediumGrey },
});
