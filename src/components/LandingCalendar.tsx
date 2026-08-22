import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { MemcardPanel } from './MemcardPanel';
import { Rise } from './Rise';
import { Words } from './Words';
import type { Game } from '@/api/types';
import { COLORS } from '@/styles/colors';
import type { LandingScale } from '@/styles/landing';
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

function Chip({
  icon,
  hue,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  hue: string;
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={hue} />
      <Text style={styles.chipWord}>{label}</Text>
    </View>
  );
}

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
    name: games?.[index + 5]?.name ?? 'Your pick',
  }));

  return (
    /**
     * The whole section is the card — copy, chips and week together.
     *
     * The silhouette was tried around the grid alone first, and that is
     * the smaller idea: it makes the illustration a nicer object and
     * leaves the argument floating on the page beside it. What this
     * section is actually about is a plan that has been SAVED
     * somewhere, and a memory card holding the sentence and the week it
     * describes says that in one move. It also gives the band the thing
     * the statistic above it has — one object lying on the page rather
     * than a stripe of paint with contents.
     */
    <MemcardPanel contentStyle={styles.panel}>
      <View style={scale.wide ? styles.wide : undefined}>
        <View style={scale.wide ? styles.copy : styles.copyStack}>
          {/* Say where it goes, not that it goes.
            This read "Then it leaves." — three words carrying an idea
            that only exists in the writer's head: the plan leaving the
            app. A reader arriving at a picture of a calendar is asked
            to work out what "it" is, what it is leaving, and whether
            leaving is a good thing, and the most available reading of
            "it leaves" is that something is being taken away. Set at
            fifty-four points over a week grid, a header has one job and
            no room to be clever. */}
          <Words
            text="It lands in your calendar."
            style={[styles.lead, scale.lead]}
          />
          <Rise delay={90}>
            <Text style={[styles.body, scale.body]}>
              The evenings it picked, in the calendar you already keep. Free
              nights stay free.
            </Text>
          </Rise>
          {/* Chips, not paragraphs.
            This said the same three things in five blocks of prose — the
            OAuth reasoning, the compatible-apps list, the snapshot
            caveat — and on a phone it was a wall of text above the one
            picture that actually explains the feature. The reasoning is
            worth having and is kept in full at the top of this file,
            which is where the person who needs it will be. A reader on
            the page needs to know it works, costs nothing, and connects
            to nothing. */}
          <Rise delay={150}>
            <View style={styles.chips}>
              <Chip icon="shield" hue={COLORS.accent} label="No account" />
              <Chip
                icon="calendar"
                hue={COLORS.violet}
                label="Google, Apple, Outlook"
              />
            </View>
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
                calendar event does — and TWO columns wide, which is what
                makes that true. Held to one column it was a 42pt box on
                a phone: "20:00" wrapped after "20:0", every title broke
                mid-word, and the 2-hour block was too short to hold
                either, so the name was sliced off by the block's own
                clip. The planned evenings are two days apart by
                construction, which is exactly the room a two-column
                label needs and the reason it cannot collide with the
                next one. */}
              {named.map((evening) => (
                <View
                  key={evening.day}
                  style={[
                    styles.evening,
                    {
                      left: `${(evening.day * 100) / DAYS.length}%`,
                      width: `${200 / DAYS.length}%`,
                      top: '66%',
                      // A floor under the proportion. Height still says
                      // how long the evening is — two hours is shorter
                      // than four — but never drops below what one line
                      // of title and its time actually occupy.
                      height: `${Math.max(evening.hours * 7, 18)}%`,
                    },
                  ]}
                >
                  <View style={styles.eveningInner}>
                    <Text style={styles.eveningTime} numberOfLines={1}>
                      20:00
                    </Text>
                    <Text style={styles.eveningName} numberOfLines={1}>
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
    </MemcardPanel>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  chipWord: { ...TYPE.micro, color: COLORS.lightGrey },

  /**
   * The room inside the card.
   *
   * The top pad is the one number here that is not taste: a memory
   * card's chamfer takes the top right corner and its grip grooves sit
   * in the first twenty-six points beside it, so anything starting at
   * an ordinary card's inset runs straight into the cut. On a wide
   * layout the week grid is what sits up there; on a phone it is the
   * header. Both need to begin below the grooves.
   */
  panel: {
    paddingTop: SPACING.xl + 10,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  /**
   * A frame, not a surface.
   *
   * The grid used to be the card — its own well, border and drop
   * shadow — and inside a card it cannot be that again: the panel's
   * shell and the old well are a point apart on the same navy, so a
   * filled grid on the shell is a rectangle nobody can see. The card is
   * the surface now and the grid is drawn on it: a hairline round the
   * week, and the day columns doing the rest.
   */
  grid: {
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
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
