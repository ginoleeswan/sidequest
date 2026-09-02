import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { COLORS } from '@/styles/colors';
import { TYPE } from '@/styles/typography';

/**
 * The tab bar a phone gets on the web.
 *
 * Native has one - Home, Library, Plan, minimising on scroll the way
 * every stock iOS app does - and the web had none, so each page's
 * header improvised its own way to the others. Three primary
 * destinations belong in a bar at the bottom of a phone whichever
 * platform drew it, and with the bar here every header can carry the
 * same two things: the brand and You.
 *
 * Its top edge is water. The footer meets the page at a drawn
 * waterline - a gentle swell with a lit crest and the Mark bobbing
 * behind it - and the bar is the same line: a low swell whose lips
 * rise at either side and settle in the middle, so the three tabs sit
 * in the trough and the bar reads as the app's shore rather than as a
 * strip of chrome. Same amplitude language as the footer's, a third of
 * the height, so the two never compete when both are on screen.
 *
 * Flat navy below the crest on purpose: in a Safari tab this bar sits
 * directly above Safari's own toolbar, tinted from theme-color - the
 * same navy - so the body and the toolbar read as one. The active tab
 * is white, not amber: it is an indicator, and amber is reserved for
 * time and the primary action.
 */
const BODY_H = 56;
const CREST_H = 18;
const CREST_AMP = 7;
export const TAB_BAR_HEIGHT = BODY_H + CREST_H;

const TABS = [
  { href: '/', label: 'Home', icon: 'game-controller' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/plan', label: 'Plan', icon: 'map' },
] as const;

function Crest({ width }: { width: number }) {
  if (width <= 0) return null;
  // Lips up at the sides, the trough in the middle: a cosine over the
  // full width, sampled finely enough that the line is a curve, not a
  // polygon, at any phone's width.
  const mid = CREST_H - CREST_AMP - 2;
  const y = (x: number) =>
    mid +
    CREST_AMP * (1 - Math.cos((x / width) * Math.PI * 2)) * 0.5 * 2 -
    CREST_AMP;
  const pts: string[] = [];
  for (let x = 0; x <= width; x += 8) pts.push(`${x} ${y(x).toFixed(1)}`);
  pts.push(`${width} ${y(width).toFixed(1)}`);
  const line = pts.join(' L');
  return (
    <Svg
      width="100%"
      height={CREST_H}
      viewBox={`0 0 ${width} ${CREST_H}`}
      style={styles.crest}
      pointerEvents="none"
    >
      {/* The water, then the lit crest along its edge - the footer's
          own two strokes. */}
      <Path d={`M${line} V${CREST_H} H0 Z`} fill={COLORS.navy} />
      <Path
        d={`M${line}`}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

export function MobileTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width);
    if (measured > 0 && measured !== width) setWidth(measured);
  };

  return (
    <View
      style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom }]}
      onLayout={onLayout}
      accessibilityRole="tablist"
    >
      <Crest width={width} />
      <View style={[styles.body, { paddingBottom: insets.bottom }]}>
        {TABS.map((tab) => {
          // A section page is Home's territory: /browse/rpg lights Home.
          const active =
            tab.href === '/'
              ? pathname === '/' || pathname.startsWith('/browse')
              : pathname.startsWith(tab.href);
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  crest: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: {
    position: 'absolute',
    top: CREST_H,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.navy,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { ...TYPE.labelTiny, color: COLORS.mediumGrey },
  labelActive: { color: COLORS.white },
});
