import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tickle } from '@/lib/haptics';
import { COLORS } from '@/styles/colors';

/** The bar's own height, above the home-indicator inset. */
export const TAB_BAR_HEIGHT = 56;

const TABS = [
  {
    href: '/',
    label: 'Home',
    icon: 'game-controller-outline',
    activeIcon: 'game-controller',
  },
  {
    href: '/library',
    label: 'Library',
    icon: 'library-outline',
    activeIcon: 'library',
  },
  { href: '/plan', label: 'Plan', icon: 'map-outline', activeIcon: 'map' },
] as const;

/** The three destinations the bar offers — it only shows on these. */
export function isTabRoute(pathname: string): boolean {
  return TABS.some((tab) => tab.href === pathname);
}

/**
 * Native bottom navigation.
 *
 * The web app navigates through its header, its footer, and the address
 * bar; an installed app has none of those, and its three destinations
 * deserve thumbs-first navigation. Web renders nothing — the routes and
 * their URLs are untouched.
 *
 * Deliberately absent on drill-in screens (a game, the memcard, settings
 * pages): those are excursions with a back button, and keeping the bar
 * there would demote them to browsing.
 */
export function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web' || !isTabRoute(pathname)) return null;

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            style={styles.item}
            onPress={() => {
              tickle();
              router.navigate(tab.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={22}
              color={active ? COLORS.accent : COLORS.mediumGrey}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.strokeStrong,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontFamily: 'Noah-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: COLORS.mediumGrey,
  },
  labelActive: {
    color: COLORS.accent,
  },
});
