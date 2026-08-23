import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
export function Screen({ children, style, onEndReached }: Props) {
  const insets = useSafeAreaInsets();

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
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
