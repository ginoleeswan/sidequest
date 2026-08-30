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

import { Mark } from './Mark';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

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
  /**
   * The band the page underneath is using, when it is not the app's.
   *
   * The bar spans the window and centres its contents on the app's
   * expanded cap, which is right for a page that does the same. A page
   * with a narrower measure ends up with a wordmark at 32 and a title
   * at 244 — two left edges, and a composition with no spine. Passing
   * the page's own cap puts them on one.
   */
  band?: number;
}

export function AppHeader({ immersive = false, band }: Props) {
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
      <View style={[styles.inner, band ? { maxWidth: band } : null]}>
        <Pressable
          onPress={() => router.push('/')}
          accessibilityRole="link"
          accessibilityLabel="Sidequest home"
        >
          <View style={styles.brand}>
            <Mark size={18} />
            <Text style={styles.wordmark}>SIDEQUEST</Text>
          </View>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wordmark: {
    ...TYPE.h3,
    color: COLORS.white,
  },
  nav: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl },
  link: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
  linkActive: { color: COLORS.white },
});
