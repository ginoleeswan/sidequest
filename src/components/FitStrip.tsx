import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from './SectionHeader';
import { fitFrom, fitLine, fitTitle, type FitDay } from '@/lib/fit';
import { eveningHours } from '@/lib/week';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** One letter per weekday, Sunday first — the strip's own axis. */
const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** How many evenings the strip draws before it stops counting. */
const SHOWN = 14;

/** The tallest column, in points: a three-hour weekend evening. */
const COLUMN = 46;

/**
 * How this game lands on the evenings you actually have.
 *
 * The page could say "about 4 weeks at 6h a week", which is arithmetic
 * anybody could do, and which answers a question nobody asked in those
 * terms. What a person on a sofa is deciding is whether this thing fits
 * their life — and the app already models that precisely: weeknights
 * hold about ninety minutes, Friday and Saturday hold three hours,
 * Sunday two. Laid across a fortnight the answer stops being a number
 * and becomes a picture: four filled evenings, credits on Thursday, and
 * the rest of the fortnight still yours.
 *
 * The same engine the plan page uses lays it out, so the two cannot
 * disagree about what an evening holds. Nothing here is a claim about
 * your library — it is the honest hypothetical the page is for: if you
 * started tonight.
 */
export function FitStrip({
  hours,
  now,
  inset = 0,
}: {
  hours: number;
  /** Captured by the caller, so the strip is pure and stays still. */
  now: number;
  inset?: number;
}) {
  const fit = fitFrom(hours, now);
  if (!fit) return null;

  // The evenings the game does not reach are still drawn: a fortnight
  // with four evenings spent and ten free is the good news, and news
  // the app should show rather than crop away.
  const days: FitDay[] = [...fit.days];
  for (let offset = days.length; offset < SHOWN; offset++) {
    const date = fit.days[0].date + offset * 86_400_000;
    days.push({
      date,
      weekday: new Date(date).getDay(),
      hours: 0,
      finishes: false,
    });
  }
  const strip = days.slice(0, SHOWN);
  const spent = strip.filter((day) => day.hours > 0).length;
  const free = strip.length - spent;

  return (
    <View style={[styles.block, inset > 0 && { paddingHorizontal: inset }]}>
      <SectionHeader eyebrow="If you started tonight" title={fitTitle(fit)} />
      <Text style={styles.line}>{fitLine(fit, now)}</Text>
      <View
        style={styles.strip}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${fitTitle(fit)}. ${fitLine(fit, now)}`}
      >
        {strip.map((day, index) => {
          const capacity = eveningHours(day.weekday);
          const played = day.hours > 0;
          return (
            <View key={day.date} style={styles.column}>
              <View style={styles.track}>
                {/* The evening's own length, as the height of its slot:
                    a Saturday is twice a Tuesday, and the strip says so
                    rather than drawing fourteen equal boxes. */}
                <View
                  style={[
                    styles.slot,
                    { height: Math.round((capacity / 3) * COLUMN) },
                    played ? styles.slotOn : styles.slotOff,
                    // Mint is finishing, everywhere in this app: the
                    // stamp on a good year, the word for credits. The
                    // evening the credits roll is the one thing on this
                    // strip worth telling apart from the rest, and an
                    // amber flag on an amber block was not telling it.
                    day.finishes && styles.slotEnd,
                  ]}
                >
                  {day.finishes ? (
                    <Ionicons
                      name="flag"
                      size={11}
                      color={COLORS.navy}
                      style={styles.flag}
                    />
                  ) : null}
                </View>
              </View>
              <Text style={[styles.letter, index === 0 && styles.letterToday]}>
                {LETTERS[day.weekday]}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.legend}>
        {spent} {spent === 1 ? 'evening' : 'evenings'} on this
        {free > 0
          ? ` · ${free} of the next fortnight still ${free === 1 ? 'yours' : 'yours'}`
          : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACING.sm },
  line: {
    ...TYPE.body,
    color: COLORS.lightGrey,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginTop: SPACING.xs,
  },
  column: { flex: 1, alignItems: 'center', gap: 5 },
  /** A common floor, so the slots stand on one line whatever their height. */
  track: { height: COLUMN, justifyContent: 'flex-end', alignSelf: 'stretch' },
  slot: {
    borderRadius: RADIUS.sm - 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
  },
  /** Amber: time, everywhere in this app. */
  slotOn: { backgroundColor: COLORS.accent },
  slotEnd: { backgroundColor: COLORS.mint },
  slotOff: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  flag: { opacity: 0.95 },
  letter: {
    ...TYPE.fine,
    fontSize: 10,
    color: COLORS.mediumGrey,
  },
  letterToday: { color: COLORS.lightGrey },
  legend: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
});
