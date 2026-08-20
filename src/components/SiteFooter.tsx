import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

const EXPLORE = [
  { label: 'Home', href: '/' },
  { label: 'My Library', href: '/library' },
  { label: 'The Plan', href: '/plan' },
] as const;

const LEGAL = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
] as const;

function LinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <View style={styles.col}>
      <Text style={styles.colHeading}>{heading}</Text>
      {links.map((link) => (
        <Pressable
          key={link.href}
          onPress={() => router.push(link.href)}
          accessibilityRole="link"
        >
          <Text style={styles.link}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

interface Props {
  /**
   * The parent's horizontal padding. The band bleeds across it with
   * negative margins so the footer runs edge to edge, matching how Rail
   * escapes padded containers.
   */
  inset?: number;
  /**
   * Where the footer's own content sits, so it lines up with the page
   * above it.
   *
   * Separate from `inset` because the two are not the same number and
   * assuming they were put every word in this band twenty pixels off:
   * a page that pads each section rather than its scroller has nothing
   * for the band to bleed across, so the negative margin pulled it wide
   * of the screen and the right-hand fine print ran off the edge.
   */
  pad?: number;
}

/**
 * The page's terminus. A flat, grain-free band whose colour matches the
 * html canvas exactly — so wherever iOS Safari paints past the end of the
 * document (under the toolbar, during overscroll), it reads as the footer
 * continuing rather than the texture falling off a cliff. The grain ends
 * on purpose, at the hairline.
 */
export function SiteFooter({ inset = 0, pad = SPACING.lg }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.band,
        inset > 0 && { marginHorizontal: -inset },
        { paddingBottom: insets.bottom + SPACING.lg },
      ]}
    >
      <Text
        style={styles.watermark}
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        SIDEQUEST
      </Text>
      <View style={[styles.inner, { paddingHorizontal: pad }]}>
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <Text style={styles.wordmark}>Sidequest</Text>
            <Text style={styles.tagline}>
              Know what you can actually finish.
            </Text>
            <Text style={styles.pitch}>
              Backlog triage for people with more games than time. No account,
              no tracking — your library lives on this device.
            </Text>
            {/* The page that makes the case for the product was filed
                under Legal, between the terms and the privacy policy.
                It belongs with the sentence it expands on. */}
            <Pressable
              onPress={() => router.push('/about')}
              accessibilityRole="link"
            >
              <Text style={styles.pitchLink}>What Sidequest is →</Text>
            </Pressable>
          </View>
          <View style={styles.cols}>
            <LinkColumn heading="Explore" links={EXPLORE} />
            <LinkColumn heading="Legal" links={LEGAL} />
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.bottomRow}>
          <Text style={styles.fineprint}>Game data by RAWG</Text>
          <Text style={styles.fineprint}>Built for the backlog</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    marginTop: 'auto',
    backgroundColor: COLORS.navy,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
    overflow: 'hidden',
  },
  // A ghost of the wordmark, barely-there, anchoring the band's depth
  // without a single gradient.
  watermark: {
    position: 'absolute',
    right: -8,
    bottom: -26,
    fontFamily: 'Noah-Black',
    fontSize: 128,
    letterSpacing: 6,
    color: 'rgba(255,255,255,0.028)',
  },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingTop: SPACING.xl + 6,
    gap: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.xl,
    columnGap: SPACING.xl * 2,
  },
  brand: { gap: SPACING.xs + 2, maxWidth: 360 },
  wordmark: {
    ...TYPE.h2,
    color: COLORS.white,
  },
  tagline: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  pitchLink: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
    marginTop: SPACING.sm + 2,
  },
  pitch: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginTop: 2,
  },
  cols: {
    flexDirection: 'row',
    columnGap: SPACING.xl * 2,
    rowGap: SPACING.lg,
    flexWrap: 'wrap',
  },
  col: { gap: SPACING.sm + 2, minWidth: 96 },
  colHeading: {
    ...TYPE.micro,
    color: COLORS.mediumGrey,
    marginBottom: 2,
  },
  link: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  rule: { height: 1, backgroundColor: COLORS.stroke },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  fineprint: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    opacity: 0.85,
  },
});
