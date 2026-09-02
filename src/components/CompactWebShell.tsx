import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileTabBar, TAB_BAR_HEIGHT } from './MobileTabBar';
import { useBreakpoint } from '@/hooks/useBreakpoint';

/**
 * A phone on the web gets the bar native has: the same three tabs,
 * drawn in the app's own material, fixed to the bottom of the viewport.
 *
 * Every route group mounts this, not only the tabs: a game page or a
 * studio page is somewhere you arrive from a tab and leave for one,
 * and the App Store and Apple TV keep their bars under a detail page
 * for that reason - the way back is always where it was. The routes
 * underneath are the URLs they have always been; the bar's height is
 * paid back as a spacer so the last row and the footer are never
 * hidden under it.
 *
 * A spacer in flow, not padding on a wrapper: a page that sizes itself
 * to the viewport ignores its parent's padding, and the footer's last
 * two lines ended thirty-six pixels under the bar - measured. A sibling
 * after the page adds to the document's height whatever the page does
 * with its own.
 */
export function CompactWebShell() {
  const { isCompact } = useBreakpoint();
  const insets = useSafeAreaInsets();
  if (!isCompact) return <Slot />;
  return (
    <View style={styles.fill}>
      <Slot />
      <View style={{ height: TAB_BAR_HEIGHT + insets.bottom }} />
      <MobileTabBar />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
