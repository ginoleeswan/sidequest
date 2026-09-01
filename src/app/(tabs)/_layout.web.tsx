import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileTabBar, TAB_BAR_HEIGHT } from '@/components/MobileTabBar';
import { useBreakpoint } from '@/hooks/useBreakpoint';

/**
 * Web has no native tab bar, and does not want expo-router's stand-in.
 * The web implementation of `NativeTabs` is a Radix tab list with its
 * own stylesheet - a perfectly good component, and the wrong one here:
 * on a wide screen this app navigates through `Sidebar`.
 *
 * A phone on the web is another matter. It used to navigate through
 * whatever icons each page's header happened to carry - a different set
 * on every page - so it gets the bar native has: the same three tabs,
 * drawn in the app's own material, fixed to the bottom of the viewport.
 * The routes underneath are the same three URLs they have always been;
 * the bar's height is paid back as padding so the last row and the
 * footer are never hidden under it.
 */
export default function TabLayoutWeb() {
  const { isCompact } = useBreakpoint();
  const insets = useSafeAreaInsets();
  if (!isCompact) return <Slot />;
  return (
    <View style={styles.fill}>
      <Slot />
      {/* A spacer in flow, not padding on a wrapper: a page that sizes
          itself to the viewport ignores its parent's padding, and the
          footer's last two lines ended thirty-six pixels under the bar
          - measured. A sibling after the page adds to the document's
          height whatever the page does with its own. */}
      <View style={{ height: TAB_BAR_HEIGHT + insets.bottom }} />
      <MobileTabBar />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
