import { StyleSheet, Text, View } from 'react-native';

import { Rise } from './Rise';
import { Words } from './Words';
import type { LandingScale } from '@/styles/landing';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Everything else it does, set as an index rather than a feature grid.
 *
 * The page above this argues one idea at a time, at poster scale, and
 * that is the right way to make a case — but it leaves a stranger
 * thinking the app is three screens. It is not: there is importing,
 * planning, timing, sharing and a dozen smaller things, and none of them
 * deserve a headline while none of them deserve to be hidden either.
 *
 * So: an index. Twelve lines, numbered, ruled, two columns where there
 * is room. A card with an icon and two lines of body, repeated twelve
 * times, is the shape a page takes when nobody decided what mattered —
 * and it would flatly contradict the eight sections above it, which are
 * ranked on purpose. A back-of-book index says "there is more here" in
 * the one voice that does not compete with a headline.
 */
const ENTRIES = [
  {
    title: 'Import from Steam',
    body: 'Your owned games and the hours already on them, from one profile link.',
  },
  {
    title: 'Import a list',
    body: 'A CSV from wherever you have been keeping one. Names are enough.',
  },
  {
    title: 'The week, not just tonight',
    body: 'Seven evenings, filled in order. Tonight is only the first of them.',
  },
  {
    title: 'Weekend mode',
    body: 'Saturday afternoon is not a Tuesday, and it does not get planned like one.',
  },
  {
    title: 'Deadlines',
    body: 'A sequel you want to be ready for, counted back from, in weeks you actually have.',
  },
  {
    title: 'Play sessions',
    body: 'Start a timer. What it learns about your pace replaces the crowd’s estimate.',
  },
  {
    title: 'Your own lengths',
    body: 'Every estimate is editable. Yours wins over anybody else’s, permanently.',
  },
  {
    title: 'Notes and tags',
    body: 'Why you shelved it, in your words, on the tile — so future you knows.',
  },
  {
    title: 'Collections',
    body: 'Shelves you name yourself, for the ways a backlog is actually organised.',
  },
  {
    title: 'Sequel alerts',
    body: 'When something you finished gets a follow-up, it appears where you finished it.',
  },
  {
    title: 'Search everything',
    body: 'Command-K anywhere: every game, every shelf, every screen, one keystroke.',
  },
  {
    title: 'Works offline',
    body: 'Add it to your home screen and your library opens with no connection at all.',
  },
];

/** Draws no band of its own: it is placed inside one. */
export function FeatureIndex({ scale }: { scale: LandingScale }) {
  const wide = scale.wide;
  return (
    <View style={styles.section}>
      <Rise from="mask">
        <Text style={styles.eyebrow}>Also in the box</Text>
      </Rise>
      <Words
        text="The rest of it"
        style={[styles.heading, scale.lead]}
        delay={80}
      />
      <View style={[styles.list, wide && styles.listWide]}>
        {ENTRIES.map((entry, index) => (
          <Rise
            key={entry.title}
            // Down the left column, then down the right — the order a
            // reader's eye takes, rather than the order of the array.
            delay={(wide ? Math.floor(index / 2) : index) * 55}
            style={wide ? styles.rowWide : undefined}
          >
            <View style={styles.row}>
              <Text style={styles.number}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={styles.copy}>
                <Text style={styles.title}>{entry.title}</Text>
                <Text style={styles.body}>{entry.body}</Text>
              </View>
            </View>
          </Rise>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.sm },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  heading: { color: COLORS.white, marginBottom: SPACING.xl },
  list: {},
  listWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // The gutter between the two columns. Rows keep their own rule, so
    // the columns read as two lists rather than as a table.
    columnGap: SPACING.xl * 2,
  },
  rowWide: { width: '46%', flexGrow: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  number: {
    ...TYPE.tag,
    color: COLORS.mediumGrey,
    // Sits on the title's first line, not above it: the number is a
    // marker in the margin, not a heading of its own.
    paddingTop: 3,
    minWidth: 20,
  },
  copy: { flex: 1, gap: 3 },
  title: { ...TYPE.h2, color: COLORS.white },
  body: { ...TYPE.caption, lineHeight: 21 },
});
