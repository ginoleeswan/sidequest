import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
interface Props {
  /**
   * Float over the page's hero: transparent with a gradient scrim while at
   * the top, turning solid navy once the page scrolls - so edge-to-edge
   * art runs underneath the chrome instead of stopping at it.
   */
  immersive?: boolean;
}

export function AppHeader({ immersive = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!immersive || Platform.OS !== 'web') return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [immersive]);

  const floating = immersive && !scrolled;

  return (
    <View
      style={[
        styles.bar,
        immersive ? FIXED : STICKY,
        floating && styles.barFloating,
      ]}
    >
      {floating && (
        <LinearGradient
          colors={[
            'rgba(9,12,19,0.62)',
            'rgba(9,12,19,0.28)',
            'rgba(9,12,19,0)',
          ]}
          locations={[0, 0.62, 1]}
          style={styles.scrim}
          pointerEvents="none"
        />
      )}
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

const FIXED =
  Platform.OS === 'web'
    ? ({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
      } as unknown as ViewStyle)
    : null;

const styles = StyleSheet.create({
  bar: {
    zIndex: 50,
    backgroundColor: 'rgba(39,47,63,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stroke,
  },
  barFloating: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96,
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
