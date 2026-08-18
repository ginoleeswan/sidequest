import { usePathname, useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'My Library', href: '/library' },
  { label: 'The Plan', href: '/plan' },
] as const;

/**
 * Persistent chrome for expanded (desktop) layouts. Home keeps its
 * sidebar workspace; every other page mounts this slim sticky bar so
 * navigation is always one click away instead of a lone floating chevron.
 */
export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.bar, STICKY]}>
      <View style={styles.inner}>
        <Pressable
          onPress={() => router.push('/')}
          accessibilityRole="link"
          accessibilityLabel="Sidequest home"
        >
          <Text style={styles.wordmark}>SIDEQUEST</Text>
        </Pressable>
        <View style={styles.nav}>
          {NAV.map((link) => {
            const active = pathname === link.href;
            return (
              <Pressable
                key={link.href}
                onPress={() => router.push(link.href)}
                accessibilityRole="link"
              >
                <Text style={[styles.link, active && styles.linkActive]}>
                  {link.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/**
 * position: sticky exists in CSS but not in RN's type surface. The cast is
 * confined here; native platforms fall back to normal flow, which is fine
 * because this header only mounts in expanded web layouts.
 */
const STICKY =
  Platform.OS === 'web'
    ? ({ position: 'sticky', top: 0 } as unknown as ViewStyle)
    : null;

const styles = StyleSheet.create({
  bar: {
    zIndex: 50,
    backgroundColor: 'rgba(39,47,63,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  inner: {
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    height: 58,
  },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 16,
    letterSpacing: 2.5,
    color: COLORS.white,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl },
  link: {
    fontFamily: 'Noah-Bold',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
  linkActive: { color: COLORS.white },
});
