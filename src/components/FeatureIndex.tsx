import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Rise } from './Rise';
import { Words } from './Words';
import type { LandingScale } from '@/styles/landing';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Everything else it does, as a sheet of stickers.
 *
 * This has been a numbered index (accurate and boring) and a paragraph
 * of bold names with coloured dots (better, still a list wearing
 * jewellery). A pile of extras is not a list — it is a pile, and the
 * honest fun way to draw a pile of small good things is the way a
 * lunchbox draws them: stickers. Each name is a chip in one of the
 * page's cast colours, tinted and bordered in its own hue, set down at
 * a slight hand tilt that alternates so no two neighbours lean the
 * same way. Twelve stickers say "there is a lot in this box" the way
 * twelve bold words never quite did, and the explanations still live
 * in the app, one tap away.
 */
const ENTRIES: { title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { title: 'Steam import', icon: 'logo-steam' },
  { title: 'CSV import', icon: 'document-text' },
  { title: 'The week view', icon: 'calendar' },
  { title: 'Calendar export', icon: 'share-outline' },
  { title: 'Weekend mode', icon: 'sunny' },
  { title: 'Deadlines', icon: 'flag' },
  { title: 'Play sessions', icon: 'stopwatch' },
  { title: 'Your own lengths', icon: 'pencil' },
  { title: 'Notes & tags', icon: 'pricetag' },
  { title: 'Collections', icon: 'albums' },
  { title: 'Sequel alerts', icon: 'notifications' },
  { title: 'Search everything', icon: 'search' },
  { title: 'Works offline', icon: 'cloud-offline-outline' },
];

/** The cast, dealt in order — no two neighbours share a colour. */
const HUES = [COLORS.accent, COLORS.violet, COLORS.mint, COLORS.coral];
/** Alternating and uneven: set down by hand, not falling over. */
const TILTS = [-3, 2, -1.5, 3, -2, 1];

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
        {ENTRIES.map(({ title, icon }, index) => {
          const hue = HUES[index % HUES.length];
          // A hand lays stickers down askew, and no two the same way.
          const tilt = TILTS[index % TILTS.length];
          return (
            <Rise key={title} from="lift" delay={index * 55}>
              {/* A die-cut sticker: pale outer edge, tinted face, the
                  feature's own glyph leading its name. The pale edge is
                  the whole trick — a colour-on-colour pill is a tag; a
                  pill with the white cut around it is a sticker. */}
              <View
                style={[
                  styles.sticker,
                  {
                    backgroundColor: `${hue}29`,
                    transform: [{ rotate: `${tilt}deg` }],
                  },
                ]}
              >
                <Ionicons name={icon} size={scale.wide ? 20 : 17} color={hue} />
                <Text
                  style={[
                    styles.title,
                    { color: hue },
                    scale.wide && styles.titleWide,
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              </View>
            </Rise>
          );
        })}
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
    columnGap: SPACING.md,
    rowGap: SPACING.md + 4,
    // A sheet of stickers wants a ragged edge, not a grid.
    maxWidth: 1000,
  },
  sticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    // The die-cut edge: pale, and thicker than any hairline in the
    // app, because it is imitating paper rather than drawing a line.
    borderWidth: 2.5,
    borderColor: 'rgba(233,235,242,0.9)',
    borderRadius: 999,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg - 2,
    // Lifted a touch off the page, as a laid-down sticker is.
    boxShadow: '0 3px 10px rgba(9,12,19,0.35)',
  },
  title: {
    fontFamily: 'Geom-Bold',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  titleWide: { fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
});
