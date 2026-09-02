import { useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/styles/colors';

/** How far from the end the scroller counts as "near it". */
const END_SLACK = 900;

interface Props {
  children: React.ReactNode;
  /**
   * Page-level layout. Applied to a plain wrapping View on web (where it
   * participates in document flow) and to the scrolled content on native.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Fires as the scroller nears its end — the native stand-in for the
   * window-scroll listeners the infinite lists use on web.
   */
  onEndReached?: () => void;
  /**
   * What pulling down past the top does.
   *
   * Native only: the browser has its own pull-to-refresh, which reloads
   * the page. The spinner shows until the promise settles, so a screen
   * says what it is doing rather than flashing an indicator that stops
   * before anything has changed.
   */
  onRefresh?: () => Promise<unknown> | void;
}

/**
 * The pull-to-refresh control, in the app's own colours, for any
 * native scroller: `Screen`'s own ScrollView, or a screen that has to
 * be a `FlatList` for the sake of a long list.
 *
 * Returns `undefined` when there is nothing to refresh, so a screen
 * that passes it straight through gets no control rather than a dead
 * one.
 */
export function useRefreshControl(
  onRefresh?: () => Promise<unknown> | void
): React.ReactElement<RefreshControlProps> | undefined {
  const [refreshing, setRefreshing] = useState(false);
  if (!onRefresh || Platform.OS === 'web') return undefined;
  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refresh}
      tintColor={COLORS.accent}
      colors={[COLORS.accent]}
      progressBackgroundColor={COLORS.navy}
    />
  );
}

/**
 * The thing that scrolls a page.
 *
 * On web the document is the scroller — content runs past the viewport
 * and the browser does the rest — so this renders nothing but its
 * children. On native there is no document: a screen without a
 * ScrollView is a poster, cropped at the first fold. Every screen's body
 * goes through here so both remain true at once.
 *
 * Headers and back buttons stay outside: on native that pins them while
 * the body scrolls underneath, which is what an app is expected to do.
 */
export function Screen({ children, style, onEndReached, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const refreshControl = useRefreshControl(onRefresh);

  if (Platform.OS === 'web') {
    return style ? <View style={style}>{children}</View> : <>{children}</>;
  }

  /**
   * The home indicator, and nothing else.
   *
   * Tab routes used to add `TAB_BAR_HEIGHT` here, because the bar was a
   * View this app drew on top of its own content and nothing else knew
   * it was there. `NativeTabs` is a real `UITabBarController`: it owns
   * the safe area below it and applies content insets to the screens
   * inside it automatically, so reserving the same room again puts a
   * bar's worth of blank page under every shelf.
   */
  const clearance = insets.bottom;

  const onScroll = onEndReached
    ? (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement, contentSize } =
          event.nativeEvent;
        if (
          contentOffset.y + layoutMeasurement.height >=
          contentSize.height - END_SLACK
        ) {
          onEndReached();
        }
      }
    : undefined;

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[style, { paddingBottom: clearance }]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={onScroll ? 64 : undefined}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
