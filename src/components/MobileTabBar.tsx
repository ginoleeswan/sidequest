import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The tab bar a phone gets on the web.
 *
 * Native has one - Home, Library, Plan, minimising on scroll the way
 * every stock iOS app does - and the web had none, so each page's
 * header improvised its own way to the others: four icons on Home,
 * a different set on Library, another on Plan. Three primary
 * destinations belong in a bar at the bottom of a phone whichever
 * platform drew it, and with the bar here every header can carry the
 * same two things: the brand and You.
 *
 * Fixed to the viewport (the web page scrolls as a document), and flat
 * navy on purpose: in a Safari tab this bar sits directly above
 * Safari's own toolbar, which is tinted from theme-color - the same
 * navy - so a flat bar and the toolbar read as one strip, the way the
 * page's top welds with the status bar. The grain every plate wears
 * would put a texture seam exactly where the two meet; installed to
 * the home screen there is no toolbar and the bar is simply the bar.
 * The active tab is white, not amber: it is an indicator, and amber is
 * reserved for time and the primary action.
 */
export const TAB_BAR_HEIGHT = 56;

const TABS = [
  { href: '/', label: 'Home', icon: 'game-controller' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/plan', label: 'Plan', icon: 'map' },
] as const;

export function MobileTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom }]}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Pressable
            key={tab.href}
            onPress={() => {
              if (!active) router.push(tab.href);
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <Ionicons
              name={active ? tab.icon : `${tab.icon}-outline`}
              size={22}
              color={active ? COLORS.white : COLORS.mediumGrey}
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
    position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.navy,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
    overflow: 'hidden',
    zIndex: 40,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: SPACING.xs,
  },
  label: { ...TYPE.labelTiny, color: COLORS.mediumGrey },
  labelActive: { color: COLORS.white },
});
