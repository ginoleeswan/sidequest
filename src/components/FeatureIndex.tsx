import { StyleSheet, Text, View } from 'react-native';

import { Rise } from './Rise';
import { Words } from './Words';
import type { LandingScale } from '@/styles/landing';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Everything else it does, set like a magazine's contents page.
 *
 * The first version was twelve numbered rows with hairline rules and a
 * one-line body each — accurate, complete, and the most boring thing
 * on the page. An index is a reference; this is an advert, and what an
 * advert needs from a list is the sensation of plenty. So the bodies
 * are gone and the titles are set big, black and flowing, each with a
 * dot from the page's own colour cast — the way a magazine runs its
 * contents across a spread rather than down a margin. Twelve bold
 * names wrapping like a paragraph say "there is a lot in this box"
 * faster than twelve explanations ever did; the explanations live in
 * the app, one tap away.
 */
const ENTRIES = [
  'Steam import',
  'CSV import',
  'The week view',
  'Weekend mode',
  'Deadlines',
  'Play sessions',
  'Your own lengths',
  'Notes & tags',
  'Collections',
  'Sequel alerts',
  'Search everything',
  'Works offline',
];

/** The cast, dealt in order — no two neighbours share a colour. */
const HUES = [COLORS.accent, COLORS.violet, COLORS.mint, COLORS.coral];

export function FeatureIndex({ scale }: { scale: LandingScale }) {
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
      <View style={styles.flow}>
        {ENTRIES.map((title, index) => (
          <Rise key={title} from="lift" delay={index * 55}>
            <View style={styles.item}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: HUES[index % HUES.length] },
                ]}
              />
              <Text
                style={[styles.title, scale.wide && styles.titleWide]}
                numberOfLines={1}
              >
                {title}
              </Text>
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
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: SPACING.xl + 6,
    rowGap: SPACING.lg + 2,
    // A paragraph of names wants a ragged edge, not a grid.
    maxWidth: 1000,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 3 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: {
    fontFamily: 'Noah-Black',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: COLORS.white,
  },
  titleWide: { fontSize: 34, lineHeight: 42, letterSpacing: -1 },
});
