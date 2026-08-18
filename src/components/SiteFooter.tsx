import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'My Library', href: '/library' },
  { label: 'The Plan', href: '/plan' },
] as const;

const LEGAL = [
  { label: 'About', href: '/about' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
] as const;

interface Props {
  /**
   * The parent's horizontal padding. The band bleeds across it with
   * negative margins so the footer runs edge to edge, matching how Rail
   * escapes padded containers.
   */
  inset?: number;
}

/**
 * The page's terminus. A flat, grain-free band whose colour matches the
 * html canvas exactly — so wherever iOS Safari paints past the end of the
 * document (under the toolbar, during overscroll), it reads as the footer
 * continuing rather than the texture falling off a cliff. The grain ends
 * on purpose, at the hairline.
 */
export function SiteFooter({ inset = 0 }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.band,
        inset > 0 && { marginHorizontal: -inset },
        { paddingBottom: insets.bottom + SPACING.lg },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.masthead}>
          <Text style={styles.wordmark}>Sidequest</Text>
          <Text style={styles.tagline}>
            Know what you can actually finish.
          </Text>
        </View>

        <View style={styles.links}>
          {NAV.map((link) => (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href)}
              accessibilityRole="link"
            >
              <Text style={styles.link}>{link.label}</Text>
            </Pressable>
          ))}
          <View style={styles.divider} />
          {LEGAL.map((link) => (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href)}
              accessibilityRole="link"
            >
              <Text style={styles.linkQuiet}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fineprint}>
          Game data by RAWG · No account, no tracking — your library lives on
          this device.
        </Text>
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
  },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    gap: SPACING.lg,
  },
  masthead: { gap: SPACING.xs },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 18,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  tagline: {
    fontFamily: 'Noah-Regular',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: SPACING.lg,
    rowGap: SPACING.sm,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.strokeStrong,
  },
  link: {
    fontFamily: 'Noah-Bold',
    fontSize: 12.5,
    color: COLORS.lightGrey,
  },
  linkQuiet: {
    fontFamily: 'Noah-Bold',
    fontSize: 12.5,
    color: COLORS.mediumGrey,
  },
  fineprint: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.85,
    lineHeight: 16,
  },
});
