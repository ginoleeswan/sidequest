import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { NATIVE_STACK_OPTIONS } from '@/lib/nativeStack';
import { COLORS } from '@/styles/colors';

/**
 * A route group as a real stack on native.
 *
 * These groups used to render a `Slot`, which is a navigator with no
 * UI: the whole group was one screen of the root stack. Opening a game
 * from a game's "More like this" swapped the content in place with no
 * push, the header stayed the first game's, and the back control — the
 * button and the edge swipe alike — popped the entire group, so three
 * games deep you landed back on the tab you started from.
 *
 * As a stack, every push inside the group is a push: it animates, it
 * gets its own header, and back means back one. The root stack hides
 * its own header for these groups so there is exactly one.
 *
 * Web never renders this: each group's `_layout.web.tsx` hands through
 * the compact shell instead, and the browser owns back.
 */
export function GroupStack() {
  return (
    <Stack
      screenOptions={({ navigation, route }) => ({
        ...NATIVE_STACK_OPTIONS,
        /**
         * The one screen the platform will not draw a back button for.
         *
         * UIKit derives the chevron from the stack a screen sits in,
         * and the first screen of this one has nothing behind it *in
         * here* — the tab it was opened from belongs to the root stack,
         * one navigator up. So every game opened from a tab arrived
         * with no way back but the edge swipe, which is invisible.
         * Only ever the group's own root: pushed screens keep UIKit's
         * own control, with its glass and its long-press history menu.
         */
        ...(navigation.getState().routes[0]?.key === route.key
          ? { headerLeft: () => <GroupBack /> }
          : null),
      })}
    />
  );
}

/**
 * Back out of the group, to whatever pushed it.
 *
 * `router.back()` pops the nearest navigator that can, which from here
 * is the root stack. A deep link opens the group with nothing behind
 * it at all — a shared game URL, a widget tap — so that case goes home
 * rather than leaving a button that does nothing.
 */
function GroupBack() {
  const router = useRouter();
  if (Platform.OS === 'web') return null;

  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={SLOP}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {/* Nudged a point left: the glyph's own bearing sits it right of
          the circle's centre, which reads as a misaligned capsule
          beside the perfectly centred one UIKit draws further in. */}
      <Ionicons name="chevron-back" size={22} style={styles.icon} />
    </Pressable>
  );
}

const SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  /**
   * The pill the web build already floats over artwork, at the size
   * UIKit gives its own control. These screens open on full-bleed
   * heroes; a bare chevron on a bright frame is unreadable, and this
   * is the app's answer to that everywhere else.
   */
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  icon: { color: COLORS.lightGrey, marginLeft: -1 },
});
