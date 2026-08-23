import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { COLORS } from '@/styles/colors';

/**
 * The three destinations, as the platform's own tab bar.
 *
 * This was a hand-drawn row of pressables, and it was a good one — but a
 * tab bar is chrome rather than content, and chrome is the one part of
 * an app that gains nothing from being bespoke. What it loses by being
 * bespoke is everything the system does for free: the scroll-edge
 * treatment, the minimise-on-scroll behaviour, the selection haptic,
 * VoiceOver announcing "tab 2 of 3", Dynamic Type on the labels, and on
 * iOS 26 the Liquid Glass material that a hand-rolled bar can only
 * approximate.
 *
 * `(tabs)` is a group, so it changes the navigator without changing a
 * single URL: `/`, `/library` and `/plan` are exactly where they were,
 * which matters because the web build and every shared link depend on
 * them.
 *
 * SF Symbols rather than the app's Ionicons, and deliberately. The tab
 * bar is the one surface where matching the platform beats matching the
 * brand — a system-drawn bar with foreign glyphs in it reads as neither
 * — and the symbols are drawn at the exact optical weight iOS expects,
 * which the icon font cannot promise at every Dynamic Type size.
 * Android falls back to the named drawable.
 *
 * Web never renders this: `_layout.web.tsx` sits beside it and hands
 * through a plain `Slot`, because expo-router's web implementation of
 * native tabs is a Radix tab list with its own stylesheet, and this app
 * already has a sidebar and a header that it would fight.
 */
export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={COLORS.accent}
      backgroundColor={COLORS.navy}
      // Gets out of the way as you read a shelf, and comes back the
      // moment you scroll up — the behaviour every stock iOS app has and
      // the one a fixed custom bar could never have.
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gamecontroller', selected: 'gamecontroller.fill' }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }}
        />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
        />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
