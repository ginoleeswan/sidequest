import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';

const LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
] as const;

/** Site footer: legal links plus the RAWG attribution. */
export function FooterLinks() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {LINKS.map((link) => (
          <Pressable key={link.href} onPress={() => router.push(link.href)}>
            <Text style={styles.link}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.attribution}>Game data by RAWG</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.xs + 2,
    paddingVertical: SPACING.lg,
  },
  row: { flexDirection: 'row', gap: SPACING.lg },
  link: {
    fontFamily: 'Noah-Bold',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  attribution: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    opacity: 0.6,
  },
});
